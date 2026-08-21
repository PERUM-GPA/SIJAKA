import { google, sheets_v4 } from 'googleapis';
import { Member, User, ActivityLog, Setting, Family, Contribution } from '../../src/types/index.ts';
import {
  getInitialMembers,
  getInitialUsers,
  getInitialSettings,
  getInitialLogs,
  getInitialFamilies,
  getInitialContributions
} from './seed.ts';

// In-memory persistent cache / fallback store
let memoryMembers: Member[] = getInitialMembers();
let memoryUsers: User[] = getInitialUsers();
let memorySettings: Setting[] = getInitialSettings();
let memoryLogs: ActivityLog[] = getInitialLogs();
let memoryFamilies: Family[] = getInitialFamilies();
let memoryContributions: Contribution[] = getInitialContributions();

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
    'ID_Kematian', 'ID_Anggota', 'ID_Keluarga', 'Tanggal_Meninggal',
    'Tempat_Meninggal', 'Penyebab', 'Tanggal_Lapor', 'Pelapor', 'Status_Verifikasi'
  ],
  [SHEET_NAMES.SANTUNAN]: [
    'ID_Santunan', 'ID_Kematian', 'ID_Anggota', 'Nominal',
    'Tanggal_Serah', 'Penerima', 'Status_Penyaluran'
  ],
  [SHEET_NAMES.BUKU_KAS]: [
    'ID_Kas', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Saldo', 'Keterangan', 'ID_User'
  ],
  [SHEET_NAMES.PENGELUARAN]: [
    'ID_Pengeluaran', 'Tanggal', 'Kategori', 'Nominal', 'Keterangan', 'Bukti_Foto', 'ID_User'
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
