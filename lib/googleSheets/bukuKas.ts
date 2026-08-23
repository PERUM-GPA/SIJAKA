import { CashTransaction, CashSummary, CashTransactionJenis, CashTransactionSumber, CashTransactionMetode } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, HEADERS, memoryStore } from './client.ts';

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

export async function generateNextCashTransactionId(): Promise<string> {
  const transactions = await getAllCashTransactions();
  if (transactions.length === 0) {
    return 'BK000001';
  }

  const numericIds = transactions
    .map((t) => {
      const match = t.ID_Transaksi.match(/^BK(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `BK${String(nextNum).padStart(6, '0')}`;
}

export async function getAllCashTransactions(): Promise<CashTransaction[]> {
  const client = getSheetsClient();
  if (!client) {
    return [...memoryStore.getCashTransactions()];
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.BUKU_KAS}!A2:P`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      return [...memoryStore.getCashTransactions()];
    }

    const transactions: CashTransaction[] = rows.map((row) => ({
      ID_Transaksi: (row[0] || '').trim(),
      Tanggal: (row[1] || '').trim(),
      Jenis_Transaksi: (row[2] || 'KAS_MASUK').trim() as any,
      Sumber_Transaksi: (row[3] || 'LAINNYA').trim() as any,
      ID_Sumber: (row[4] || '').trim(),
      ID_Anggota: (row[5] || '').trim() || undefined,
      Uraian: (row[6] || '').trim(),
      Kas_Masuk: Number(row[7] || 0),
      Kas_Keluar: Number(row[8] || 0),
      Saldo: Number(row[9] || 0),
      Metode: (row[10] || 'Tunai').trim() as any,
      Nomor_Bukti: (row[11] || '').trim() || undefined,
      Petugas: (row[12] || '').trim(),
      Status: (row[13] || 'VALID').trim() as any,
      Keterangan: (row[14] || '').trim() || undefined,
      Tanggal_Dibuat: (row[15] || '').trim(),
    }));

    memoryStore.setCashTransactions(transactions);
    return transactions;
  } catch (error) {
    console.error('Error fetching cash transactions from Google Sheets, using memory store:', error);
    return [...memoryStore.getCashTransactions()];
  }
}

export async function getCashTransactionById(id: string): Promise<CashTransaction | null> {
  const transactions = await getAllCashTransactions();
  return transactions.find((t) => t.ID_Transaksi === id) || null;
}

export async function getCurrentCashBalance(): Promise<number> {
  const transactions = await getAllCashTransactions();
  const validTransactions = transactions.filter((t) => t.Status === 'VALID');
  if (validTransactions.length === 0) return 0;
  
  let balance = 0;
  for (const t of validTransactions) {
    balance += (t.Kas_Masuk || 0) - (t.Kas_Keluar || 0);
  }
  return balance;
}

export async function createCashTransaction(input: {
  Tanggal?: string;
  Jenis_Transaksi: CashTransactionJenis;
  Sumber_Transaksi: CashTransactionSumber;
  ID_Sumber: string;
  ID_Anggota?: string;
  Uraian: string;
  Kas_Masuk?: number;
  Kas_Keluar?: number;
  Metode?: CashTransactionMetode;
  Nomor_Bukti?: string;
  Petugas: string;
  Keterangan?: string;
}): Promise<CashTransaction> {
  const transactions = await getAllCashTransactions();

  // Idempotency Check: Prevent duplicate ledger entries for the same source
  if (input.Sumber_Transaksi && input.ID_Sumber) {
    const existing = transactions.find(
      (t) =>
        t.Status === 'VALID' &&
        t.Sumber_Transaksi === input.Sumber_Transaksi &&
        t.ID_Sumber === input.ID_Sumber
    );
    if (existing) {
      console.warn(`Idempotency check: Cash transaction for ${input.Sumber_Transaksi}:${input.ID_Sumber} already exists (${existing.ID_Transaksi})`);
      return existing;
    }
  }

  const currentBalance = await getCurrentCashBalance();
  const kasMasuk = Number(input.Kas_Masuk || 0);
  const kasKeluar = Number(input.Kas_Keluar || 0);
  const newSaldo = currentBalance + kasMasuk - kasKeluar;

  const nextId = await generateNextCashTransactionId();
  const nowStr = formatDateTime();

  const newTransaction: CashTransaction = {
    ID_Transaksi: nextId,
    Tanggal: input.Tanggal || new Date().toISOString().split('T')[0],
    Jenis_Transaksi: input.Jenis_Transaksi,
    Sumber_Transaksi: input.Sumber_Transaksi,
    ID_Sumber: input.ID_Sumber,
    ID_Anggota: input.ID_Anggota || undefined,
    Uraian: input.Uraian,
    Kas_Masuk: kasMasuk,
    Kas_Keluar: kasKeluar,
    Saldo: newSaldo,
    Metode: input.Metode || 'Tunai',
    Nomor_Bukti: input.Nomor_Bukti || undefined,
    Petugas: input.Petugas,
    Status: 'VALID',
    Keterangan: input.Keterangan || undefined,
    Tanggal_Dibuat: nowStr,
  };

  // Update memory store
  transactions.push(newTransaction);
  memoryStore.setCashTransactions(transactions);

  // Sync to Google Sheets if configured
  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newTransaction.ID_Transaksi,
        newTransaction.Tanggal,
        newTransaction.Jenis_Transaksi,
        newTransaction.Sumber_Transaksi,
        newTransaction.ID_Sumber,
        newTransaction.ID_Anggota || '',
        newTransaction.Uraian,
        newTransaction.Kas_Masuk,
        newTransaction.Kas_Keluar,
        newTransaction.Saldo,
        newTransaction.Metode,
        newTransaction.Nomor_Bukti || '',
        newTransaction.Petugas,
        newTransaction.Status,
        newTransaction.Keterangan || '',
        newTransaction.Tanggal_Dibuat,
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.BUKU_KAS}!A:P`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } catch (err) {
      console.error('Error appending cash transaction to Google Sheets:', err);
    }
  }

  return newTransaction;
}

export async function cancelCashTransaction(id: string, reason: string, petugas: string): Promise<CashTransaction> {
  const transactions = await getAllCashTransactions();
  const index = transactions.findIndex((t) => t.ID_Transaksi === id);
  if (index === -1) {
    throw new Error(`Transaksi Buku Kas ${id} tidak ditemukan.`);
  }

  const current = transactions[index];
  if (current.Status === 'DIBATALKAN') {
    throw new Error(`Transaksi Buku Kas ${id} sudah berstatus DIBATALKAN.`);
  }

  const updated: CashTransaction = {
    ...current,
    Status: 'DIBATALKAN',
    Keterangan: `${current.Keterangan ? current.Keterangan + ' | ' : ''}DIBATALKAN oleh ${petugas}: ${reason}`,
  };

  transactions[index] = updated;

  // Recalculate running balances across all valid transactions
  let running = 0;
  for (let i = 0; i < transactions.length; i++) {
    if (transactions[i].Status === 'VALID') {
      running += (transactions[i].Kas_Masuk || 0) - (transactions[i].Kas_Keluar || 0);
      transactions[i].Saldo = running;
    }
  }

  memoryStore.setCashTransactions(transactions);
  await syncAllTransactions(transactions);

  return updated;
}

async function syncAllTransactions(transactions: CashTransaction[]): Promise<void> {
  const client = getSheetsClient();
  if (!client) return;

  try {
    const rows = transactions.map((t) => [
      t.ID_Transaksi,
      t.Tanggal,
      t.Jenis_Transaksi,
      t.Sumber_Transaksi,
      t.ID_Sumber,
      t.ID_Anggota || '',
      t.Uraian,
      t.Kas_Masuk,
      t.Kas_Keluar,
      t.Saldo,
      t.Metode,
      t.Nomor_Bukti || '',
      t.Petugas,
      t.Status,
      t.Keterangan || '',
      t.Tanggal_Dibuat,
    ]);

    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.BUKU_KAS}!A2:P`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  } catch (error) {
    console.error('Error syncing all cash transactions to Google Sheets:', error);
  }
}

export async function getCashSummary(): Promise<CashSummary> {
  const transactions = await getAllCashTransactions();
  const valid = transactions.filter((t) => t.Status === 'VALID');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthPrefix = `${currentYear}-${currentMonth}`;

  let saldoKas = 0;
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let totalIuranTerkumpul = 0;
  let totalSantunanTersalur = 0;
  let totalPengeluaranOperasional = 0;
  let pemasukanBulanIni = 0;
  let pengeluaranBulanIni = 0;

  for (const t of valid) {
    const masuk = t.Kas_Masuk || 0;
    const keluar = t.Kas_Keluar || 0;
    totalPemasukan += masuk;
    totalPengeluaran += keluar;

    if (t.Sumber_Transaksi === 'IURAN') {
      totalIuranTerkumpul += masuk;
    }
    if (t.Sumber_Transaksi === 'SANTUNAN') {
      totalSantunanTersalur += keluar;
    }
    if (t.Sumber_Transaksi === 'PENGELUARAN') {
      totalPengeluaranOperasional += keluar;
    }

    if (t.Tanggal && t.Tanggal.startsWith(currentMonthPrefix)) {
      pemasukanBulanIni += masuk;
      pengeluaranBulanIni += keluar;
    }
  }

  saldoKas = totalPemasukan - totalPengeluaran;

  return {
    saldoKas,
    totalPemasukan,
    totalPengeluaran,
    totalIuranTerkumpul,
    totalSantunanTersalur,
    totalPengeluaranOperasional,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    totalTransaksiValid: valid.length,
  };
}
