import { Contribution, PaymentMethod, PaymentStatus } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, memoryStore, cachedRead, invalidateCache } from './client.ts';
import { getMemberById } from './anggota.ts';
import { getParsedSettings } from './settings.ts';
import { createCashTransaction, getAllCashTransactions, updateLinkedCashTransaction } from './bukuKas.ts';

export async function getAllContributions(): Promise<Contribution[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getContributions();
  }

  return cachedRead(
    'contributions',
    async () => {
      const response = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.IURAN}!A2:J`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        memoryStore.setContributions([]);
        return [];
      }

      const contributions: Contribution[] = rows.map((row) => ({
        ID_Iuran: row[0] || '',
        ID_Anggota: row[1] || '',
        Periode_Bulan: parseInt(row[2], 10) || 1,
        Periode_Tahun: parseInt(row[3], 10) || new Date().getFullYear(),
        Tanggal_Bayar: row[4] || '',
        Nominal: parseInt(row[5], 10) || 5000,
        Status: (row[6] as PaymentStatus) || 'Lunas',
        Metode: (row[7] as PaymentMethod) || 'Tunai',
        Petugas: row[8] || '',
        Keterangan: row[9] || undefined,
      })).filter((c) => c.ID_Iuran !== '');

      memoryStore.setContributions(contributions);
      return contributions;
    },
    () => memoryStore.getContributions(),
    15000
  );
}

export async function getContributionById(id: string): Promise<Contribution | null> {
  const contributions = await getAllContributions();
  return contributions.find((c) => c.ID_Iuran === id) || null;
}

export async function getContributionsByMemberId(memberId: string): Promise<Contribution[]> {
  const contributions = await getAllContributions();
  return contributions
    .filter((c) => c.ID_Anggota === memberId)
    .sort((a, b) => {
      // Sort newest to oldest by Periode_Tahun, Periode_Bulan, Tanggal_Bayar
      if (b.Periode_Tahun !== a.Periode_Tahun) {
        return b.Periode_Tahun - a.Periode_Tahun;
      }
      if (b.Periode_Bulan !== a.Periode_Bulan) {
        return b.Periode_Bulan - a.Periode_Bulan;
      }
      return b.Tanggal_Bayar.localeCompare(a.Tanggal_Bayar);
    });
}

export async function generateNextContributionId(): Promise<string> {
  const contributions = await getAllContributions();
  if (contributions.length === 0) {
    return 'I000001';
  }

  let maxNum = 0;
  for (const c of contributions) {
    if (c.ID_Iuran.startsWith('I')) {
      const numPart = parseInt(c.ID_Iuran.substring(1), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `I${nextNum.toString().padStart(6, '0')}`;
}

export async function checkPaymentExists(
  memberId: string,
  bulan: number,
  tahun: number
): Promise<boolean> {
  const contributions = await getAllContributions();
  const existing = contributions.find(
    (c) =>
      c.ID_Anggota === memberId &&
      c.Periode_Bulan === bulan &&
      c.Periode_Tahun === tahun &&
      c.Status === 'Lunas'
  );
  return Boolean(existing);
}

export async function createContribution(data: {
  ID_Anggota: string;
  Periode_Bulan: number;
  Periode_Tahun: number;
  Tanggal_Bayar?: string;
  Nominal?: number;
  Metode?: PaymentMethod;
  Petugas: string;
  Keterangan?: string;
}): Promise<Contribution> {
  // 1. Validate Member exists
  const member = await getMemberById(data.ID_Anggota);
  if (!member) {
    throw new Error('Anggota tidak ditemukan.');
  }

  // 2. Validate Month (1-12) & Year
  const bulan = Number(data.Periode_Bulan);
  const tahun = Number(data.Periode_Tahun);

  if (isNaN(bulan) || bulan < 1 || bulan > 12) {
    throw new Error('Periode bulan tidak valid. Harus antara 1 sampai 12.');
  }

  if (isNaN(tahun) || tahun < 2000 || tahun > 2100) {
    throw new Error('Periode tahun tidak valid.');
  }

  // 3. Server-Side Duplicate Check (Anti Double Payment)
  const isDuplicate = await checkPaymentExists(data.ID_Anggota, bulan, tahun);
  if (isDuplicate) {
    throw new Error('Anggota ini sudah melakukan pembayaran iuran untuk periode tersebut.');
  }

  // 4. Determine Nominal from Settings if not specified
  let nominal = data.Nominal;
  if (!nominal || isNaN(nominal) || nominal <= 0) {
    const settings = await getParsedSettings();
    nominal = settings.IURAN_BULANAN || 5000;
  }

  const newId = await generateNextContributionId();
  const tanggalBayar = data.Tanggal_Bayar || new Date().toISOString().split('T')[0];

  const newContribution: Contribution = {
    ID_Iuran: newId,
    ID_Anggota: data.ID_Anggota,
    Periode_Bulan: bulan,
    Periode_Tahun: tahun,
    Tanggal_Bayar: tanggalBayar,
    Nominal: nominal,
    Status: 'Lunas',
    Metode: data.Metode || 'Tunai',
    Petugas: data.Petugas || 'Petugas',
    Keterangan: data.Keterangan?.trim() || undefined,
  };

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newContribution.ID_Iuran,
        newContribution.ID_Anggota,
        newContribution.Periode_Bulan.toString(),
        newContribution.Periode_Tahun.toString(),
        newContribution.Tanggal_Bayar,
        newContribution.Nominal.toString(),
        newContribution.Status,
        newContribution.Metode,
        newContribution.Petugas,
        newContribution.Keterangan || '',
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.IURAN}!A:J`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      console.error('Error appending contribution to Google Sheets:', error);
    }
  }

  const contributions = await getAllContributions();
  const updatedContributions = [newContribution, ...contributions];
  memoryStore.setContributions(updatedContributions);
  invalidateCache('contributions');
  invalidateCache('cashTransactions');

  // 5. Automatically record entry in 06_BUKU_KAS (Kas Masuk)
  try {
    await createCashTransaction({
      Tanggal: tanggalBayar,
      Jenis_Transaksi: 'KAS_MASUK',
      Sumber_Transaksi: 'IURAN',
      ID_Sumber: newContribution.ID_Iuran,
      ID_Anggota: newContribution.ID_Anggota,
      Uraian: `Penerimaan Iuran ${member.Nama} (${newContribution.ID_Anggota}) Periode ${newContribution.Periode_Bulan}/${newContribution.Periode_Tahun}`,
      Kas_Masuk: newContribution.Nominal,
      Kas_Keluar: 0,
      Metode: newContribution.Metode === 'Transfer' ? 'Transfer' : 'Tunai',
      Nomor_Bukti: `KWT-${newContribution.ID_Iuran}`,
      Petugas: newContribution.Petugas,
      Keterangan: newContribution.Keterangan || `Iuran Periode ${newContribution.Periode_Bulan}/${newContribution.Periode_Tahun}`,
    });
  } catch (kasErr) {
    console.error('Error auto-recording contribution to Buku Kas:', kasErr);
  }

  return newContribution;
}

export async function updateContribution(
  id: string,
  data: {
    Periode_Bulan?: number;
    Periode_Tahun?: number;
    Tanggal_Bayar?: string;
    Nominal?: number;
    Metode?: PaymentMethod;
    Petugas?: string;
    Keterangan?: string;
  }
): Promise<Contribution> {
  const contributions = await getAllContributions();
  const index = contributions.findIndex((c) => c.ID_Iuran === id);
  if (index === -1) {
    throw new Error(`Data Iuran dengan ID ${id} tidak ditemukan.`);
  }

  const current = contributions[index];

  // 1. Verify Member exists
  const member = await getMemberById(current.ID_Anggota);
  if (!member) {
    throw new Error('Data Anggota terkait tidak ditemukan.');
  }

  // 2. Validate Month (1-12) & Year
  const bulan = data.Periode_Bulan !== undefined ? Number(data.Periode_Bulan) : current.Periode_Bulan;
  const tahun = data.Periode_Tahun !== undefined ? Number(data.Periode_Tahun) : current.Periode_Tahun;

  if (isNaN(bulan) || bulan < 1 || bulan > 12) {
    throw new Error('Periode bulan tidak valid. Harus antara 1 sampai 12.');
  }

  if (isNaN(tahun) || tahun < 2000 || tahun > 2100) {
    throw new Error('Periode tahun tidak valid.');
  }

  // 3. Duplicate check excluding the current contribution being updated
  const duplicate = contributions.find(
    (c) =>
      c.ID_Iuran !== id &&
      c.ID_Anggota === current.ID_Anggota &&
      c.Periode_Bulan === bulan &&
      c.Periode_Tahun === tahun &&
      c.Status === 'Lunas'
  );
  if (duplicate) {
    throw new Error('Anggota ini sudah melakukan pembayaran iuran untuk periode bulan dan tahun tersebut.');
  }

  // 4. Validate Nominal
  const nominal = data.Nominal !== undefined ? Number(data.Nominal) : current.Nominal;
  if (isNaN(nominal) || nominal <= 0) {
    throw new Error('Nominal iuran harus lebih besar dari 0.');
  }

  const tanggalBayar = data.Tanggal_Bayar || current.Tanggal_Bayar;
  const metode = data.Metode || current.Metode;
  const petugas = data.Petugas || current.Petugas;
  const keterangan = data.Keterangan !== undefined ? data.Keterangan.trim() : current.Keterangan;

  // 5. Precondition: Check linked Buku Kas (must be exactly 1 VALID entry)
  const allKas = await getAllCashTransactions();
  const matchingKas = allKas.filter(
    (t) => t.Status === 'VALID' && t.Sumber_Transaksi === 'IURAN' && t.ID_Sumber === id
  );
  if (matchingKas.length === 0) {
    throw new Error(`Transaksi Buku Kas terkait untuk Iuran ${id} tidak ditemukan.`);
  }
  if (matchingKas.length > 1) {
    throw new Error(`Ditemukan lebih dari satu transaksi Buku Kas VALID untuk Iuran ${id}. Proses dibatalkan.`);
  }

  const updatedContribution: Contribution = {
    ...current,
    Periode_Bulan: bulan,
    Periode_Tahun: tahun,
    Tanggal_Bayar: tanggalBayar,
    Nominal: nominal,
    Metode: metode,
    Petugas: petugas,
    Keterangan: keterangan || undefined,
  };

  // 6. Update in Google Sheets
  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        updatedContribution.ID_Iuran,
        updatedContribution.ID_Anggota,
        updatedContribution.Periode_Bulan.toString(),
        updatedContribution.Periode_Tahun.toString(),
        updatedContribution.Tanggal_Bayar,
        updatedContribution.Nominal.toString(),
        updatedContribution.Status,
        updatedContribution.Metode,
        updatedContribution.Petugas,
        updatedContribution.Keterangan || '',
      ];

      const rowIndex = index + 2;
      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.IURAN}!A${rowIndex}:J${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      console.error('Error updating contribution in Google Sheets:', error);
    }
  }

  // 7. Update memory store
  contributions[index] = updatedContribution;
  memoryStore.setContributions(contributions);
  invalidateCache('contributions');
  invalidateCache('cashTransactions');

  // 8. Update linked Buku Kas in-place
  await updateLinkedCashTransaction({
    Sumber_Transaksi: 'IURAN',
    ID_Sumber: id,
    Tanggal: tanggalBayar,
    Kas_Masuk: nominal,
    Uraian: `Penerimaan Iuran ${member.Nama} (${updatedContribution.ID_Anggota}) Periode ${bulan}/${tahun}`,
    Metode: metode === 'Transfer' ? 'Transfer' : 'Tunai',
    Petugas: petugas,
    Keterangan: keterangan || `Iuran Periode ${bulan}/${tahun}`,
  });

  return updatedContribution;
}
