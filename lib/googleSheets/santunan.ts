import {
  Compensation,
  SantunanVerifikasiStatus,
  SantunanPersetujuanStatus,
  SantunanMetodePencairan,
} from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, HEADERS, memoryStore } from './client.ts';
import { getDeathReportById, completeDeathReport } from './kematian.ts';
import { getMemberById, updateMember } from './anggota.ts';
import { createCashTransaction } from './bukuKas.ts';

function formatDateTime(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function generateNextSantunanId(): Promise<string> {
  const all = await getAllSantunan();
  if (all.length === 0) {
    return 'S000001';
  }

  const numericIds = all
    .map((s) => {
      const match = s.ID_Santunan.match(/^S(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `S${String(nextNum).padStart(6, '0')}`;
}

export async function getAllSantunan(): Promise<Compensation[]> {
  const client = getSheetsClient();
  if (!client) {
    return [...memoryStore.getSantunan()];
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.SANTUNAN}!A2:U`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      return [...memoryStore.getSantunan()];
    }

    const items: Compensation[] = rows.map((row) => ({
      ID_Santunan: (row[0] || '').trim(),
      ID_Laporan: (row[1] || '').trim(),
      ID_Anggota: (row[2] || '').trim(),
      ID_AhliWaris: (row[3] || '').trim(),
      Nama_Penerima: (row[4] || '').trim(),
      Hubungan_Penerima: (row[5] || '').trim(),
      Nominal_Santunan: Number(row[6] || 600000),
      Tanggal_Pengajuan: (row[7] || '').trim(),
      Status_Verifikasi: (row[8] || 'MENUNGGU').trim() as SantunanVerifikasiStatus,
      Diverifikasi_Oleh: (row[9] || '').trim() || undefined,
      Tanggal_Verifikasi: (row[10] || '').trim() || undefined,
      Status_Persetujuan: (row[11] || 'MENUNGGU').trim() as SantunanPersetujuanStatus,
      Disetujui_Oleh: (row[12] || '').trim() || undefined,
      Tanggal_Persetujuan: (row[13] || '').trim() || undefined,
      Tanggal_Pencairan: (row[14] || '').trim() || undefined,
      Metode_Pencairan: (row[15] || '').trim() ? ((row[15] || '').trim() as SantunanMetodePencairan) : undefined,
      Nomor_Bukti: (row[16] || '').trim() || undefined,
      Bukti_Pencairan: (row[17] || '').trim() || undefined,
      Keterangan: (row[18] || '').trim() || undefined,
      Tanggal_Dibuat: (row[19] || '').trim(),
      Tanggal_Diperbarui: (row[20] || '').trim(),
    }));

    memoryStore.setSantunan(items);
    return items;
  } catch (error) {
    console.error('Error fetching santunan from Google Sheets, using memory store:', error);
    return [...memoryStore.getSantunan()];
  }
}

export async function getSantunanById(id: string): Promise<Compensation | null> {
  const items = await getAllSantunan();
  return items.find((s) => s.ID_Santunan === id) || null;
}

export async function getSantunanByLaporanId(laporanId: string): Promise<Compensation | null> {
  const items = await getAllSantunan();
  return items.find((s) => s.ID_Laporan === laporanId) || null;
}

export async function createSantunan(input: {
  ID_Laporan: string;
  ID_Anggota: string;
  ID_AhliWaris: string;
  Nama_Penerima: string;
  Hubungan_Penerima: string;
  Nominal_Santunan?: number;
  Tanggal_Pengajuan?: string;
  Keterangan?: string;
}): Promise<Compensation> {
  // Validate Laporan Kematian
  const report = await getDeathReportById(input.ID_Laporan);
  if (!report) {
    throw new Error(`Laporan Kematian ${input.ID_Laporan} tidak ditemukan.`);
  }

  // Check if santunan already created for this report
  const existing = await getSantunanByLaporanId(input.ID_Laporan);
  if (existing) {
    throw new Error(`Santunan untuk Laporan Kematian ${input.ID_Laporan} sudah pernah dibuat (${existing.ID_Santunan}).`);
  }

  const nextId = await generateNextSantunanId();
  const nowStr = formatDateTime();
  const nominal = input.Nominal_Santunan || 600000;

  const newSantunan: Compensation = {
    ID_Santunan: nextId,
    ID_Laporan: input.ID_Laporan,
    ID_Anggota: input.ID_Anggota,
    ID_AhliWaris: input.ID_AhliWaris,
    Nama_Penerima: input.Nama_Penerima.trim(),
    Hubungan_Penerima: input.Hubungan_Penerima.trim(),
    Nominal_Santunan: nominal,
    Tanggal_Pengajuan: input.Tanggal_Pengajuan || new Date().toISOString().split('T')[0],
    Status_Verifikasi: 'MENUNGGU',
    Status_Persetujuan: 'MENUNGGU',
    Keterangan: input.Keterangan ? input.Keterangan.trim() : undefined,
    Tanggal_Dibuat: nowStr,
    Tanggal_Diperbarui: nowStr,
  };

  const items = await getAllSantunan();
  items.push(newSantunan);
  memoryStore.setSantunan(items);

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newSantunan.ID_Santunan,
        newSantunan.ID_Laporan,
        newSantunan.ID_Anggota,
        newSantunan.ID_AhliWaris,
        newSantunan.Nama_Penerima,
        newSantunan.Hubungan_Penerima,
        newSantunan.Nominal_Santunan,
        newSantunan.Tanggal_Pengajuan,
        newSantunan.Status_Verifikasi,
        '',
        '',
        newSantunan.Status_Persetujuan,
        '',
        '',
        '',
        '',
        '',
        '',
        newSantunan.Keterangan || '',
        newSantunan.Tanggal_Dibuat,
        newSantunan.Tanggal_Diperbarui,
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.SANTUNAN}!A:U`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } catch (err) {
      console.error('Error appending santunan to Google Sheets:', err);
    }
  }

  return newSantunan;
}

export async function updateSantunan(
  id: string,
  updates: Partial<Compensation>
): Promise<Compensation> {
  const items = await getAllSantunan();
  const index = items.findIndex((s) => s.ID_Santunan === id);
  if (index === -1) {
    throw new Error(`Santunan ${id} tidak ditemukan.`);
  }

  const current = items[index];
  if (current.Tanggal_Pencairan) {
    throw new Error(`Santunan ${id} sudah dicairkan dan tidak dapat diubah.`);
  }

  const updated: Compensation = {
    ...current,
    ...updates,
    ID_Santunan: current.ID_Santunan,
    ID_Laporan: current.ID_Laporan,
    Nominal_Santunan: current.Nominal_Santunan, // Protect nominal
    Tanggal_Diperbarui: formatDateTime(),
  };

  items[index] = updated;
  memoryStore.setSantunan(items);

  await syncAllSantunan(items);
  return updated;
}

export async function verifySantunan(
  id: string,
  userId: string,
  status: 'TERVERIFIKASI' | 'DITOLAK',
  keterangan?: string
): Promise<Compensation> {
  const items = await getAllSantunan();
  const index = items.findIndex((s) => s.ID_Santunan === id);
  if (index === -1) {
    throw new Error(`Santunan ${id} tidak ditemukan.`);
  }

  const current = items[index];
  if (current.Tanggal_Pencairan) {
    throw new Error(`Santunan ${id} sudah dicairkan.`);
  }

  const nowStr = formatDateTime();
  const updated: Compensation = {
    ...current,
    Status_Verifikasi: status,
    Diverifikasi_Oleh: userId,
    Tanggal_Verifikasi: nowStr,
    Keterangan: keterangan ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Verifikasi Santunan: ${keterangan}` : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  items[index] = updated;
  memoryStore.setSantunan(items);

  await syncAllSantunan(items);
  return updated;
}

export async function approveSantunan(
  id: string,
  userId: string,
  status: 'DISETUJUI' | 'DITOLAK',
  keterangan?: string
): Promise<Compensation> {
  const items = await getAllSantunan();
  const index = items.findIndex((s) => s.ID_Santunan === id);
  if (index === -1) {
    throw new Error(`Santunan ${id} tidak ditemukan.`);
  }

  const current = items[index];
  if (current.Tanggal_Pencairan) {
    throw new Error(`Santunan ${id} sudah dicairkan.`);
  }

  const nowStr = formatDateTime();
  const updated: Compensation = {
    ...current,
    Status_Persetujuan: status,
    Disetujui_Oleh: userId,
    Tanggal_Persetujuan: nowStr,
    Keterangan: keterangan ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Persetujuan Santunan: ${keterangan}` : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  items[index] = updated;
  memoryStore.setSantunan(items);

  await syncAllSantunan(items);
  return updated;
}

export async function disburseSantunan(
  id: string,
  disburseData: {
    Tanggal_Pencairan?: string;
    Metode_Pencairan: SantunanMetodePencairan;
    Nomor_Bukti?: string;
    Bukti_Pencairan?: string;
    Keterangan?: string;
  },
  userId: string,
  userName: string
): Promise<{ santunan: Compensation; cashTransactionId: string }> {
  const items = await getAllSantunan();
  const index = items.findIndex((s) => s.ID_Santunan === id);
  if (index === -1) {
    throw new Error(`Santunan ${id} tidak ditemukan.`);
  }

  const current = items[index];
  if (current.Tanggal_Pencairan) {
    throw new Error(`Santunan ${id} sudah pernah dicairkan pada tanggal ${current.Tanggal_Pencairan}.`);
  }

  if (current.Status_Persetujuan !== 'DISETUJUI') {
    throw new Error(`Santunan ${id} belum disetujui. Status persetujuan saat ini: ${current.Status_Persetujuan}.`);
  }

  const member = await getMemberById(current.ID_Anggota);
  const tanggalPencairan = disburseData.Tanggal_Pencairan || new Date().toISOString().split('T')[0];
  const nomorBukti = disburseData.Nomor_Bukti || `BS-${current.ID_Santunan}`;
  const nowStr = formatDateTime();

  // 1. Create automatic Buku Kas entry (KAS KELUAR)
  const cashTransaction = await createCashTransaction({
    Tanggal: tanggalPencairan,
    Jenis_Transaksi: 'KAS_KELUAR',
    Sumber_Transaksi: 'SANTUNAN',
    ID_Sumber: current.ID_Santunan,
    ID_Anggota: current.ID_Anggota,
    Uraian: `Pencairan Santunan Kematian Alm. ${member?.Nama || current.ID_Anggota} kepada ${current.Nama_Penerima} (${current.Hubungan_Penerima})`,
    Kas_Masuk: 0,
    Kas_Keluar: current.Nominal_Santunan || 600000,
    Metode: disburseData.Metode_Pencairan,
    Nomor_Bukti: nomorBukti,
    Petugas: userName,
    Keterangan: disburseData.Keterangan || `Santunan Kematian ${current.ID_Santunan}`,
  });

  // 2. Mark Santunan as disbursed
  const updated: Compensation = {
    ...current,
    Tanggal_Pencairan: tanggalPencairan,
    Metode_Pencairan: disburseData.Metode_Pencairan,
    Nomor_Bukti: nomorBukti,
    Bukti_Pencairan: disburseData.Bukti_Pencairan || undefined,
    Keterangan: disburseData.Keterangan
      ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Pencairan: ${disburseData.Keterangan}`
      : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  items[index] = updated;
  memoryStore.setSantunan(items);
  await syncAllSantunan(items);

  // 3. Mark Death Report as SELESAI
  try {
    await completeDeathReport(current.ID_Laporan);
  } catch (err) {
    console.error('Error completing death report after disbursement:', err);
  }

  // 4. Mark Member as Meninggal if still Aktif
  if (member && member.Status !== 'Meninggal') {
    try {
      await updateMember(member.ID_Anggota, {
        Status: 'Meninggal',
        Tanggal_Nonaktif: tanggalPencairan,
        Keterangan: `${member.Keterangan ? member.Keterangan + ' | ' : ''}Santunan telah dicairkan (${nomorBukti})`,
      });
    } catch (err) {
      console.error('Error updating member status to Meninggal:', err);
    }
  }

  return { santunan: updated, cashTransactionId: cashTransaction.ID_Transaksi };
}

async function syncAllSantunan(items: Compensation[]): Promise<void> {
  const client = getSheetsClient();
  if (!client) return;

  try {
    const rows = items.map((s) => [
      s.ID_Santunan,
      s.ID_Laporan,
      s.ID_Anggota,
      s.ID_AhliWaris,
      s.Nama_Penerima,
      s.Hubungan_Penerima,
      s.Nominal_Santunan,
      s.Tanggal_Pengajuan,
      s.Status_Verifikasi,
      s.Diverifikasi_Oleh || '',
      s.Tanggal_Verifikasi || '',
      s.Status_Persetujuan,
      s.Disetujui_Oleh || '',
      s.Tanggal_Persetujuan || '',
      s.Tanggal_Pencairan || '',
      s.Metode_Pencairan || '',
      s.Nomor_Bukti || '',
      s.Bukti_Pencairan || '',
      s.Keterangan || '',
      s.Tanggal_Dibuat,
      s.Tanggal_Diperbarui,
    ]);

    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.SANTUNAN}!A2:U`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  } catch (error) {
    console.error('Error syncing all santunan to Google Sheets:', error);
  }
}
