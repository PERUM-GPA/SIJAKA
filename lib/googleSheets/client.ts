import { google, sheets_v4 } from 'googleapis';
import {
  Member,
  User,
  ActivityLog,
  Setting,
  Family,
  Contribution,
  DeathReport,
  Compensation,
  CashTransaction,
  Expense,
} from '../../src/types/index.ts';
import {
  getInitialMembers,
  getInitialUsers,
  getInitialSettings,
  getInitialLogs,
  getInitialFamilies,
  getInitialContributions,
  getInitialDeathReports,
  getInitialSantunan,
  getInitialCashTransactions,
  getInitialExpenses,
} from './seed.ts';

// In-memory persistent cache / fallback store
let memoryMembers: Member[] = getInitialMembers();
let memoryUsers: User[] = getInitialUsers();
let memorySettings: Setting[] = getInitialSettings();
let memoryLogs: ActivityLog[] = getInitialLogs();
let memoryFamilies: Family[] = getInitialFamilies();
let memoryContributions: Contribution[] = getInitialContributions();
let memoryDeathReports: DeathReport[] = getInitialDeathReports();
let memorySantunan: Compensation[] = getInitialSantunan();
let memoryCashTransactions: CashTransaction[] = getInitialCashTransactions();
let memoryExpenses: Expense[] = getInitialExpenses();

export const SHEET_NAMES = {
  ANGGOTA: '01_ANGGOTA',
  KELUARGA: '02_KELUARGA',
  IURAN: '03_IURAN',
  LAPORAN_KEMATIAN: '04_LAPORAN_KEMATIAN',
  SANTUNAN: '05_SANTUNAN',
  BUKU_KAS: '06_BUKU_KAS',
  PENGELUARAN: '07_PENGELUARAN',
  USERS: '08_USERS',
  LOG_AKTIVITAS: '09_LOG_AKTIVITAS',
  SETTINGS: '10_SETTINGS',
} as const;

export const HEADERS = {
  [SHEET_NAMES.ANGGOTA]: [
    'ID_Anggota', 'No_KK', 'NIK', 'Nama', 'Tempat_Lahir', 'Tanggal_Lahir',
    'Alamat', 'RT', 'No_HP', 'Status', 'Tanggal_Daftar', 'Tanggal_Nonaktif', 'Keterangan'
  ],
  [SHEET_NAMES.KELUARGA]: [
    'ID_Keluarga', 'ID_Anggota', 'NIK', 'Nama', 'Tempat_Lahir', 'Tanggal_Lahir',
    'Hubungan', 'No_HP', 'Status', 'Calon_Ahli_Waris', 'Keterangan'
  ],
  [SHEET_NAMES.IURAN]: [
    'ID_Iuran', 'ID_Anggota', 'Periode_Bulan', 'Periode_Tahun', 'Tanggal_Bayar',
    'Nominal', 'Status', 'Metode', 'Petugas', 'Keterangan'
  ],
  [SHEET_NAMES.LAPORAN_KEMATIAN]: [
    'ID_Laporan', 'ID_Anggota', 'Tanggal_Lapor', 'Pelapor', 'Hubungan_Pelapor',
    'Waktu_Kematian', 'Tempat_Kematian', 'Penyebab_Kematian', 'Dokumen_Pendukung',
    'Status', 'Diverifikasi_Oleh', 'Tanggal_Verifikasi', 'Disetujui_Oleh',
    'Tanggal_Persetujuan', 'Keterangan', 'Tanggal_Dibuat', 'Tanggal_Diperbarui'
  ],
  [SHEET_NAMES.SANTUNAN]: [
    'ID_Santunan', 'ID_Laporan', 'ID_Anggota', 'ID_AhliWaris', 'Nama_Penerima',
    'Hubungan_Penerima', 'Nominal_Santunan', 'Tanggal_Pengajuan', 'Status_Verifikasi',
    'Diverifikasi_Oleh', 'Tanggal_Verifikasi', 'Status_Persetujuan', 'Disetujui_Oleh',
    'Tanggal_Persetujuan', 'Tanggal_Pencairan', 'Metode_Pencairan', 'Nomor_Bukti',
    'Bukti_Pencairan', 'Keterangan', 'Tanggal_Dibuat', 'Tanggal_Diperbarui'
  ],
  [SHEET_NAMES.BUKU_KAS]: [
    'ID_Transaksi', 'Tanggal', 'Jenis_Transaksi', 'Sumber_Transaksi', 'ID_Sumber',
    'ID_Anggota', 'Uraian', 'Kas_Masuk', 'Kas_Keluar', 'Saldo', 'Metode',
    'Nomor_Bukti', 'Petugas', 'Status', 'Keterangan', 'Tanggal_Dibuat'
  ],
  [SHEET_NAMES.PENGELUARAN]: [
    'ID_Pengeluaran', 'Tanggal_Pengeluaran', 'Kategori', 'Uraian', 'Nominal',
    'Metode_Pembayaran', 'Nomor_Bukti', 'Bukti_Pengeluaran', 'Diajukan_Oleh',
    'Disetujui_Oleh', 'Tanggal_Persetujuan', 'Status', 'Keterangan', 'Tanggal_Dibuat', 'Tanggal_Diperbarui'
  ],
  [SHEET_NAMES.USERS]: [
    'ID_User', 'ID_Anggota', 'Nama', 'Username', 'Password', 'Role', 'Status', 'Tanggal_Dibuat', 'Terakhir_Login'
  ],
  [SHEET_NAMES.LOG_AKTIVITAS]: [
    'ID_Log', 'Timestamp', 'ID_User', 'Nama_User', 'Aksi', 'Modul', 'Record_ID', 'Deskripsi', 'Status'
  ],
  [SHEET_NAMES.SETTINGS]: [
    'Key', 'Value', 'Keterangan', 'Tipe'
  ],
};

export function isGoogleSheetsConfigured(): boolean {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  return Boolean(sheetId && clientEmail && privateKey);
}

export function getSheetsClient(): { sheets: sheets_v4.Sheets; spreadsheetId: string } | null {
  if (!isGoogleSheetsConfigured()) {
    return null;
  }

  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // Format private key properly if newlines are escaped
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return {
      sheets,
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
    };
  } catch (err) {
    console.error('Error initializing Google Sheets client:', err);
    return null;
  }
}

// Memory store accessors for fallback and hybrid sync
export const memoryStore = {
  getMembers: () => memoryMembers,
  setMembers: (members: Member[]) => { memoryMembers = members; },
  getFamilies: () => memoryFamilies,
  setFamilies: (families: Family[]) => { memoryFamilies = families; },
  getContributions: () => memoryContributions,
  setContributions: (contributions: Contribution[]) => { memoryContributions = contributions; },
  getDeathReports: () => memoryDeathReports,
  setDeathReports: (reports: DeathReport[]) => { memoryDeathReports = reports; },
  getSantunan: () => memorySantunan,
  setSantunan: (items: Compensation[]) => { memorySantunan = items; },
  getCashTransactions: () => memoryCashTransactions,
  setCashTransactions: (transactions: CashTransaction[]) => { memoryCashTransactions = transactions; },
  getExpenses: () => memoryExpenses,
  setExpenses: (expenses: Expense[]) => { memoryExpenses = expenses; },
  getUsers: () => memoryUsers,
  setUsers: (users: User[]) => { memoryUsers = users; },
  getSettings: () => memorySettings,
  setSettings: (settings: Setting[]) => { memorySettings = settings; },
  getLogs: () => memoryLogs,
  setLogs: (logs: ActivityLog[]) => { memoryLogs = logs; },
  addLog: (log: ActivityLog) => {
    memoryLogs.unshift(log);
    // Keep max 500 logs in memory
    if (memoryLogs.length > 500) {
      memoryLogs = memoryLogs.slice(0, 500);
    }
  }
};
