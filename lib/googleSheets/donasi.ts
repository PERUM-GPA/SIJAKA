import { Donation, DonationStatus, DonationMethod } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, HEADERS, memoryStore, cachedRead, invalidateCache } from './client.ts';
import { createCashTransaction, getAllCashTransactions } from './bukuKas.ts';

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

let sheetExistenceChecked = false;

export async function ensureDonationSheetExists(): Promise<void> {
  if (sheetExistenceChecked) return;
  const client = getSheetsClient();
  if (!client) return;

  try {
    const meta = await client.sheets.spreadsheets.get({
      spreadsheetId: client.spreadsheetId,
    });
    const exists = meta.data.sheets?.some(
      (s) => s.properties?.title === SHEET_NAMES.DONASI
    );

    if (!exists) {
      await client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: client.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SHEET_NAMES.DONASI,
                },
              },
            },
          ],
        },
      });

      // Write header row
      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.DONASI}!A1:L1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HEADERS[SHEET_NAMES.DONASI]],
        },
      });
      console.log(`[GoogleSheets] Sheet ${SHEET_NAMES.DONASI} created with standard headers.`);
    }
    sheetExistenceChecked = true;
  } catch (err) {
    console.warn('[GoogleSheets] Note checking/creating donation sheet:', err);
  }
}

export async function generateNextDonationId(): Promise<string> {
  const donations = await getAllDonations();
  if (donations.length === 0) {
    return 'D000001';
  }

  const numericIds = donations
    .map((d) => {
      const match = d.ID_Donasi.match(/^D(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `D${String(nextNum).padStart(6, '0')}`;
}

export async function getAllDonations(): Promise<Donation[]> {
  const client = getSheetsClient();
  if (!client) {
    return [...memoryStore.getDonations()];
  }

  return cachedRead(
    'donations',
    async () => {
      await ensureDonationSheetExists();

      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.DONASI}!A2:L`,
      });

      const rows = res.data.values || [];
      if (rows.length === 0) {
        memoryStore.setDonations([]);
        return [];
      }

      const donations: Donation[] = rows.map((row) => ({
        ID_Donasi: (row[0] || '').trim(),
        Tanggal: (row[1] || '').trim(),
        Donatur: (row[2] || '').trim(),
        Nominal: Number(row[3] || 0),
        Metode: (row[4] || 'Tunai').trim() as DonationMethod,
        Keterangan: (row[5] || '').trim() || undefined,
        Status: (row[6] || 'DIAJUKAN').trim() as DonationStatus,
        Diverifikasi_Oleh: (row[7] || '').trim() || undefined,
        Tanggal_Verifikasi: (row[8] || '').trim() || undefined,
        ID_Kas: (row[9] || '').trim() || undefined,
        Tanggal_Dibuat: (row[10] || '').trim(),
        Tanggal_Diubah: (row[11] || '').trim(),
      })).filter((d) => d.ID_Donasi !== '');

      memoryStore.setDonations(donations);
      return donations;
    },
    () => [...memoryStore.getDonations()],
    15000
  );
}

export async function getDonationById(id: string): Promise<Donation | null> {
  const donations = await getAllDonations();
  return donations.find((d) => d.ID_Donasi === id) || null;
}

export async function createDonation(input: {
  Tanggal?: string;
  Donatur: string;
  Nominal: number;
  Metode?: DonationMethod;
  Keterangan?: string;
}): Promise<Donation> {
  const donatur = (input.Donatur || '').trim();
  if (!donatur) {
    throw new Error('Nama donatur wajib diisi.');
  }

  const nominal = Number(input.Nominal);
  if (isNaN(nominal) || nominal <= 0) {
    throw new Error('Nominal donasi harus berupa angka valid dan lebih besar dari 0.');
  }

  const nextId = await generateNextDonationId();
  const nowStr = formatDateTime();

  const newDonation: Donation = {
    ID_Donasi: nextId,
    Tanggal: input.Tanggal || new Date().toISOString().split('T')[0],
    Donatur: donatur,
    Nominal: nominal,
    Metode: input.Metode || 'Tunai',
    Keterangan: input.Keterangan ? input.Keterangan.trim() : undefined,
    Status: 'DIAJUKAN',
    Diverifikasi_Oleh: undefined,
    Tanggal_Verifikasi: undefined,
    ID_Kas: undefined,
    Tanggal_Dibuat: nowStr,
    Tanggal_Diubah: nowStr,
  };

  const donations = await getAllDonations();
  donations.push(newDonation);
  memoryStore.setDonations(donations);
  invalidateCache('donations');

  const client = getSheetsClient();
  if (client) {
    try {
      await ensureDonationSheetExists();

      const rowData = [
        newDonation.ID_Donasi,
        newDonation.Tanggal,
        newDonation.Donatur,
        newDonation.Nominal,
        newDonation.Metode,
        newDonation.Keterangan || '',
        newDonation.Status,
        '',
        '',
        '',
        newDonation.Tanggal_Dibuat,
        newDonation.Tanggal_Diubah,
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.DONASI}!A:L`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } catch (err) {
      console.error('Error appending donation to Google Sheets:', err);
    }
  }

  return newDonation;
}

export async function updateDonation(
  id: string,
  updates: Partial<Donation>
): Promise<Donation> {
  const donations = await getAllDonations();
  const index = donations.findIndex((d) => d.ID_Donasi === id);
  if (index === -1) {
    throw new Error(`Donasi ${id} tidak ditemukan.`);
  }

  const current = donations[index];
  if (current.Status === 'DITERIMA') {
    throw new Error(`Donasi ${id} sudah berstatus DITERIMA dan tidak dapat diubah.`);
  }

  const updated: Donation = {
    ...current,
    ...updates,
    ID_Donasi: current.ID_Donasi,
    ID_Kas: current.ID_Kas,
    Tanggal_Diubah: formatDateTime(),
  };

  donations[index] = updated;
  memoryStore.setDonations(donations);

  await syncAllDonations(donations);
  return updated;
}

export async function verifyDonation(
  id: string,
  verifierName: string,
  status: 'DIVERIFIKASI' | 'DITOLAK',
  keterangan?: string
): Promise<Donation> {
  const donations = await getAllDonations();
  const index = donations.findIndex((d) => d.ID_Donasi === id);
  if (index === -1) {
    throw new Error(`Donasi ${id} tidak ditemukan.`);
  }

  const current = donations[index];
  if (current.Status === 'DITERIMA') {
    throw new Error(`Donasi ${id} sudah berstatus DITERIMA dan tidak dapat diubah lagi.`);
  }

  if (current.Status === 'DITOLAK') {
    throw new Error(`Donasi ${id} sudah berstatus DITOLAK.`);
  }

  const nowStr = formatDateTime();
  const updated: Donation = {
    ...current,
    Status: status,
    Diverifikasi_Oleh: verifierName,
    Tanggal_Verifikasi: nowStr,
    Keterangan: keterangan
      ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Verifikasi: ${keterangan}`
      : current.Keterangan,
    Tanggal_Diubah: nowStr,
  };

  donations[index] = updated;
  memoryStore.setDonations(donations);

  await syncAllDonations(donations);
  return updated;
}

export async function acceptDonation(
  id: string,
  acceptorName: string,
  keterangan?: string
): Promise<{ donation: Donation; cashTransactionId: string }> {
  const donations = await getAllDonations();
  const index = donations.findIndex((d) => d.ID_Donasi === id);
  if (index === -1) {
    throw new Error(`Donasi ${id} tidak ditemukan.`);
  }

  const current = donations[index];

  if (current.Status === 'DITOLAK') {
    throw new Error(`Donasi ${id} berstatus DITOLAK dan tidak dapat diterima.`);
  }

  // Idempotency Check: Pre-check if cash transaction already exists in 06_BUKU_KAS
  const allCash = await getAllCashTransactions();
  const existingCash = allCash.find(
    (t) =>
      t.Status === 'VALID' &&
      t.Sumber_Transaksi === 'DONASI' &&
      t.ID_Sumber === current.ID_Donasi
  );

  let cashTransactionId = '';

  if (existingCash) {
    // If cash transaction already exists, prevent duplicate entry and re-link ID_Kas
    cashTransactionId = existingCash.ID_Transaksi;
  } else {
    // Create ONE cash entry in 06_BUKU_KAS (KAS_MASUK)
    const cashTx = await createCashTransaction({
      Tanggal: current.Tanggal,
      Jenis_Transaksi: 'KAS_MASUK',
      Sumber_Transaksi: 'DONASI',
      ID_Sumber: current.ID_Donasi,
      Uraian: `Penerimaan Dana Sumbangan dari ${current.Donatur}${
        current.Keterangan ? ` - ${current.Keterangan}` : ''
      }`,
      Kas_Masuk: current.Nominal,
      Kas_Keluar: 0,
      Metode: current.Metode === 'Transfer' ? 'Transfer' : 'Tunai',
      Nomor_Bukti: `DON-${current.ID_Donasi}`,
      Petugas: acceptorName,
      Keterangan:
        keterangan || `Penerimaan Dana Sumbangan ${current.ID_Donasi} dari ${current.Donatur}`,
    });

    cashTransactionId = cashTx.ID_Transaksi;
  }

  const nowStr = formatDateTime();
  const updated: Donation = {
    ...current,
    Status: 'DITERIMA',
    ID_Kas: cashTransactionId,
    Tanggal_Diubah: nowStr,
    Keterangan: keterangan
      ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Diterima: ${keterangan}`
      : current.Keterangan,
  };

  donations[index] = updated;
  memoryStore.setDonations(donations);
  await syncAllDonations(donations);

  return { donation: updated, cashTransactionId };
}

async function syncAllDonations(donations: Donation[]): Promise<void> {
  invalidateCache('donations');
  const client = getSheetsClient();
  if (!client) return;

  try {
    await ensureDonationSheetExists();

    const rows = donations.map((d) => [
      d.ID_Donasi,
      d.Tanggal,
      d.Donatur,
      d.Nominal,
      d.Metode,
      d.Keterangan || '',
      d.Status,
      d.Diverifikasi_Oleh || '',
      d.Tanggal_Verifikasi || '',
      d.ID_Kas || '',
      d.Tanggal_Dibuat,
      d.Tanggal_Diubah,
    ]);

    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.DONASI}!A2:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  } catch (error) {
    console.error('Error syncing all donations to Google Sheets:', error);
  }
}

export async function getDonationsSummary(): Promise<{
  totalDonasi: number;
  totalNominalDiterima: number;
  totalDiajukan: number;
  totalDiverifikasi: number;
  totalDiterima: number;
  totalDitolak: number;
}> {
  const donations = await getAllDonations();

  let totalNominalDiterima = 0;
  let totalDiajukan = 0;
  let totalDiverifikasi = 0;
  let totalDiterima = 0;
  let totalDitolak = 0;

  for (const d of donations) {
    if (d.Status === 'DITERIMA') {
      totalDiterima++;
      totalNominalDiterima += d.Nominal;
    } else if (d.Status === 'DIVERIFIKASI') {
      totalDiverifikasi++;
    } else if (d.Status === 'DIAJUKAN') {
      totalDiajukan++;
    } else if (d.Status === 'DITOLAK') {
      totalDitolak++;
    }
  }

  return {
    totalDonasi: donations.length,
    totalNominalDiterima,
    totalDiajukan,
    totalDiverifikasi,
    totalDiterima,
    totalDitolak,
  };
}
