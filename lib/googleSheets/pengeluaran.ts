import { Expense, ExpenseCategory, ExpenseStatus, ExpensePaymentMethod } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, HEADERS, memoryStore } from './client.ts';
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

export async function generateNextExpenseId(): Promise<string> {
  const expenses = await getAllExpenses();
  if (expenses.length === 0) {
    return 'P000001';
  }

  const numericIds = expenses
    .map((e) => {
      const match = e.ID_Pengeluaran.match(/^P(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `P${String(nextNum).padStart(6, '0')}`;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const client = getSheetsClient();
  if (!client) {
    return [...memoryStore.getExpenses()];
  }

  try {
    const res = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.PENGELUARAN}!A2:O`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      return [...memoryStore.getExpenses()];
    }

    const expenses: Expense[] = rows.map((row) => ({
      ID_Pengeluaran: (row[0] || '').trim(),
      Tanggal_Pengeluaran: (row[1] || '').trim(),
      Kategori: (row[2] || 'Lainnya').trim() as ExpenseCategory,
      Uraian: (row[3] || '').trim(),
      Nominal: Number(row[4] || 0),
      Metode_Pembayaran: (row[5] || 'Tunai').trim() as ExpensePaymentMethod,
      Nomor_Bukti: (row[6] || '').trim() || undefined,
      Bukti_Pengeluaran: (row[7] || '').trim() || undefined,
      Diajukan_Oleh: (row[8] || '').trim(),
      Disetujui_Oleh: (row[9] || '').trim() || undefined,
      Tanggal_Persetujuan: (row[10] || '').trim() || undefined,
      Status: (row[11] || 'DIAJUKAN').trim() as ExpenseStatus,
      Keterangan: (row[12] || '').trim() || undefined,
      Tanggal_Dibuat: (row[13] || '').trim(),
      Tanggal_Diperbarui: (row[14] || '').trim(),
    }));

    memoryStore.setExpenses(expenses);
    return expenses;
  } catch (error) {
    console.error('Error fetching expenses from Google Sheets, using memory store:', error);
    return [...memoryStore.getExpenses()];
  }
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const expenses = await getAllExpenses();
  return expenses.find((e) => e.ID_Pengeluaran === id) || null;
}

export async function createExpense(
  input: {
    Tanggal_Pengeluaran?: string;
    Kategori: ExpenseCategory;
    Uraian: string;
    Nominal: number;
    Metode_Pembayaran?: ExpensePaymentMethod;
    Nomor_Bukti?: string;
    Bukti_Pengeluaran?: string;
    Keterangan?: string;
  },
  userId: string
): Promise<Expense> {
  if (input.Nominal <= 0) {
    throw new Error('Nominal pengeluaran harus lebih besar dari 0.');
  }

  const nextId = await generateNextExpenseId();
  const nowStr = formatDateTime();

  const newExpense: Expense = {
    ID_Pengeluaran: nextId,
    Tanggal_Pengeluaran: input.Tanggal_Pengeluaran || new Date().toISOString().split('T')[0],
    Kategori: input.Kategori,
    Uraian: input.Uraian.trim(),
    Nominal: Number(input.Nominal),
    Metode_Pembayaran: input.Metode_Pembayaran || 'Tunai',
    Nomor_Bukti: input.Nomor_Bukti ? input.Nomor_Bukti.trim() : undefined,
    Bukti_Pengeluaran: input.Bukti_Pengeluaran ? input.Bukti_Pengeluaran.trim() : undefined,
    Diajukan_Oleh: userId,
    Status: 'DIAJUKAN',
    Keterangan: input.Keterangan ? input.Keterangan.trim() : undefined,
    Tanggal_Dibuat: nowStr,
    Tanggal_Diperbarui: nowStr,
  };

  const expenses = await getAllExpenses();
  expenses.push(newExpense);
  memoryStore.setExpenses(expenses);

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newExpense.ID_Pengeluaran,
        newExpense.Tanggal_Pengeluaran,
        newExpense.Kategori,
        newExpense.Uraian,
        newExpense.Nominal,
        newExpense.Metode_Pembayaran,
        newExpense.Nomor_Bukti || '',
        newExpense.Bukti_Pengeluaran || '',
        newExpense.Diajukan_Oleh,
        '',
        '',
        newExpense.Status,
        newExpense.Keterangan || '',
        newExpense.Tanggal_Dibuat,
        newExpense.Tanggal_Diperbarui,
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.PENGELUARAN}!A:O`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } catch (err) {
      console.error('Error appending expense to Google Sheets:', err);
    }
  }

  return newExpense;
}

export async function updateExpense(
  id: string,
  updates: Partial<Expense>
): Promise<Expense> {
  const expenses = await getAllExpenses();
  const index = expenses.findIndex((e) => e.ID_Pengeluaran === id);
  if (index === -1) {
    throw new Error(`Pengeluaran ${id} tidak ditemukan.`);
  }

  const current = expenses[index];
  if (current.Status === 'DIBAYARKAN') {
    throw new Error(`Pengeluaran ${id} sudah berstatus DIBAYARKAN dan tidak dapat diubah.`);
  }

  const updated: Expense = {
    ...current,
    ...updates,
    ID_Pengeluaran: current.ID_Pengeluaran,
    Diajukan_Oleh: current.Diajukan_Oleh,
    Tanggal_Diperbarui: formatDateTime(),
  };

  expenses[index] = updated;
  memoryStore.setExpenses(expenses);

  await syncAllExpenses(expenses);
  return updated;
}

export async function approveExpense(
  id: string,
  userId: string,
  status: 'DISETUJUI' | 'DITOLAK',
  keterangan?: string
): Promise<Expense> {
  const expenses = await getAllExpenses();
  const index = expenses.findIndex((e) => e.ID_Pengeluaran === id);
  if (index === -1) {
    throw new Error(`Pengeluaran ${id} tidak ditemukan.`);
  }

  const current = expenses[index];
  if (current.Status === 'DIBAYARKAN') {
    throw new Error(`Pengeluaran ${id} sudah berstatus DIBAYARKAN.`);
  }

  const nowStr = formatDateTime();
  const updated: Expense = {
    ...current,
    Status: status,
    Disetujui_Oleh: userId,
    Tanggal_Persetujuan: nowStr,
    Keterangan: keterangan ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Persetujuan: ${keterangan}` : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  expenses[index] = updated;
  memoryStore.setExpenses(expenses);

  await syncAllExpenses(expenses);
  return updated;
}

export async function payExpense(
  id: string,
  payData: {
    Tanggal_Pengeluaran?: string;
    Metode_Pembayaran?: ExpensePaymentMethod;
    Nomor_Bukti?: string;
    Bukti_Pengeluaran?: string;
    Keterangan?: string;
  },
  userId: string,
  userName: string
): Promise<{ expense: Expense; cashTransactionId: string }> {
  const expenses = await getAllExpenses();
  const index = expenses.findIndex((e) => e.ID_Pengeluaran === id);
  if (index === -1) {
    throw new Error(`Pengeluaran ${id} tidak ditemukan.`);
  }

  const current = expenses[index];
  if (current.Status === 'DIBAYARKAN') {
    throw new Error(`Pengeluaran ${id} sudah pernah dibayarkan.`);
  }

  if (current.Status !== 'DISETUJUI') {
    throw new Error(`Pengeluaran ${id} harus disetujui terlebih dahulu sebelum dibayarkan. Status saat ini: ${current.Status}.`);
  }

  const tanggal = payData.Tanggal_Pengeluaran || current.Tanggal_Pengeluaran || new Date().toISOString().split('T')[0];
  const metode = payData.Metode_Pembayaran || current.Metode_Pembayaran || 'Tunai';
  const nomorBukti = payData.Nomor_Bukti || current.Nomor_Bukti || `EXP-${current.ID_Pengeluaran}`;
  const nowStr = formatDateTime();

  // 1. Create automatic Buku Kas entry (KAS KELUAR)
  const cashTransaction = await createCashTransaction({
    Tanggal: tanggal,
    Jenis_Transaksi: 'KAS_KELUAR',
    Sumber_Transaksi: 'PENGELUARAN',
    ID_Sumber: current.ID_Pengeluaran,
    Uraian: `Pengeluaran [${current.Kategori}]: ${current.Uraian}`,
    Kas_Masuk: 0,
    Kas_Keluar: current.Nominal,
    Metode: metode,
    Nomor_Bukti: nomorBukti,
    Petugas: userName,
    Keterangan: payData.Keterangan || current.Keterangan || `Pembayaran ${current.ID_Pengeluaran}`,
  });

  // 2. Mark Expense as DIBAYARKAN
  const updated: Expense = {
    ...current,
    Tanggal_Pengeluaran: tanggal,
    Metode_Pembayaran: metode,
    Nomor_Bukti: nomorBukti,
    Bukti_Pengeluaran: payData.Bukti_Pengeluaran || current.Bukti_Pengeluaran,
    Status: 'DIBAYARKAN',
    Keterangan: payData.Keterangan
      ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Pembayaran: ${payData.Keterangan}`
      : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  expenses[index] = updated;
  memoryStore.setExpenses(expenses);
  await syncAllExpenses(expenses);

  return { expense: updated, cashTransactionId: cashTransaction.ID_Transaksi };
}

async function syncAllExpenses(expenses: Expense[]): Promise<void> {
  const client = getSheetsClient();
  if (!client) return;

  try {
    const rows = expenses.map((e) => [
      e.ID_Pengeluaran,
      e.Tanggal_Pengeluaran,
      e.Kategori,
      e.Uraian,
      e.Nominal,
      e.Metode_Pembayaran,
      e.Nomor_Bukti || '',
      e.Bukti_Pengeluaran || '',
      e.Diajukan_Oleh,
      e.Disetujui_Oleh || '',
      e.Tanggal_Persetujuan || '',
      e.Status,
      e.Keterangan || '',
      e.Tanggal_Dibuat,
      e.Tanggal_Diperbarui,
    ]);

    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.PENGELUARAN}!A2:O`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  } catch (error) {
    console.error('Error syncing all expenses to Google Sheets:', error);
  }
}
