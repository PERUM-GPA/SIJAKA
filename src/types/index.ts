/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Type Definitions
 */

export type RTEnum = '06' | '07' | '10';

export type MemberStatus = 'Aktif' | 'Tidak Aktif' | 'Meninggal';

export type UserRole = 'ADMIN' | 'BENDAHARA' | 'PENGURUS' | 'ANGGOTA' | 'VIEWER';

export type UserStatus = 'Aktif' | 'Tidak Aktif';

export type ActionType = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE';

// 01_ANGGOTA
export interface Member {
  ID_Anggota: string;
  No_KK: string;
  NIK: string;
  Nama: string;
  Tempat_Lahir: string;
  Tanggal_Lahir: string;
  Alamat: string;
  RT: RTEnum;
  No_HP: string;
  Status: MemberStatus;
  Tanggal_Daftar: string;
  Tanggal_Nonaktif?: string;
  Keterangan?: string;
}

export type FamilyRelation = 'Suami' | 'Istri' | 'Anak' | 'Orang Tua' | 'Lainnya';
export type FamilyStatus = 'Aktif' | 'Tidak Aktif';
export type HeirCandidate = 'Ya' | 'Tidak';

// 02_KELUARGA
export interface Family {
  ID_Keluarga: string;
  ID_Anggota: string;
  NIK?: string;
  Nama: string;
  Tempat_Lahir?: string;
  Tanggal_Lahir?: string;
  Hubungan: FamilyRelation;
  No_HP?: string;
  Status: FamilyStatus;
  Calon_Ahli_Waris: HeirCandidate;
  Keterangan?: string;
}

export type PaymentMethod = 'Tunai' | 'Transfer' | 'Kolektor';
export type PaymentStatus = 'Lunas' | 'Belum Bayar';

// 03_IURAN
export interface Contribution {
  ID_Iuran: string;
  ID_Anggota: string;
  Periode_Bulan: number; // 1 - 12
  Periode_Tahun: number; // e.g. 2026
  Tanggal_Bayar: string; // YYYY-MM-DD
  Nominal: number; // e.g. 5000
  Status: PaymentStatus;
  Metode: PaymentMethod;
  Petugas: string;
  Keterangan?: string;
}

export interface MemberArrearsInfo {
  idAnggota: string;
  namaAnggota: string;
  rt: RTEnum;
  statusAnggota: MemberStatus;
  tanggalDaftar: string;
  tanggalNonaktif?: string;
  totalBulanWajib: number;
  totalBulanLunas: number;
  totalBulanTunggakan: number;
  totalNominalTunggakan: number;
  periodeTunggakan: string[]; // ["2026-02", "2026-03"]
  belumBayarBulanBerjalan: boolean;
  periodeBelumBayar: string[]; // all unpaid including current month
}

export interface ContributionSummary {
  bulan: number;
  tahun: number;
  totalAnggotaAktif: number;
  jumlahSudahBayar: number;
  jumlahBelumBayar: number;
  totalNominalTerkumpul: number;
  totalNominalTunggakan: number;
}

// 04_LAPORAN_KEMATIAN (Placeholder for Phase 2+)
export interface DeathReport {
  ID_Kematian: string;
  ID_Anggota: string;
  ID_Keluarga?: string;
  Tanggal_Meninggal: string;
  Tempat_Meninggal: string;
  Penyebab?: string;
  Tanggal_Lapor: string;
  Pelapor: string;
  Status_Verifikasi: 'Menunggu' | 'Terverifikasi' | 'Ditolak';
}

// 05_SANTUNAN (Placeholder for Phase 2+)
export interface Compensation {
  ID_Santunan: string;
  ID_Kematian: string;
  ID_Anggota: string;
  Nominal: number;
  Tanggal_Serah: string;
  Penerima: string;
  Status_Penyaluran: 'Diproses' | 'Diserahkan' | 'Tertunda';
}

// 06_BUKU_KAS (Placeholder for Phase 2+)
export interface CashTransaction {
  ID_Kas: string;
  Tanggal: string;
  Jenis: 'Pemasukan' | 'Pengeluaran';
  Kategori: string;
  Nominal: number;
  Saldo: number;
  Keterangan: string;
  ID_User: string;
}

// 07_PENGELUARAN (Placeholder for Phase 2+)
export interface Expense {
  ID_Pengeluaran: string;
  Tanggal: string;
  Kategori: string;
  Nominal: number;
  Keterangan: string;
  Bukti_Foto?: string;
  ID_User: string;
}

// 08_USERS
export interface User {
  ID_User: string;
  ID_Anggota?: string;
  Nama: string;
  Username: string;
  Password?: string; // Hashed password, omitted on client
  Role: UserRole;
  Status: UserStatus;
  Tanggal_Dibuat: string;
  Terakhir_Login?: string;
}

// Public User profile safe for browser
export interface SafeUser {
  ID_User: string;
  ID_Anggota?: string;
  Nama: string;
  Username: string;
  Role: UserRole;
  Status: UserStatus;
  Tanggal_Dibuat: string;
  Terakhir_Login?: string;
}

// 09_LOG_AKTIVITAS
export interface ActivityLog {
  ID_Log: string;
  Timestamp: string;
  ID_User: string;
  Nama_User: string;
  Aksi: ActionType;
  Modul: string;
  Record_ID: string;
  Deskripsi: string;
  Status: 'SUCCESS' | 'FAILED';
}

// 10_SETTINGS
export interface Setting {
  Key: string;
  Value: string;
  Keterangan: string;
  Tipe: 'string' | 'number' | 'boolean' | 'array';
}

export interface AppSettings {
  NAMA_APLIKASI: string;
  NAMA_LEMBAGA: string;
  WILAYAH: string;
  RT_AKTIF: string[];
  IURAN_BULANAN: number;
  NOMINAL_SANTUNAN: number;
  MASA_TUNGGU_HARI: number;
  MATA_UANG: string;
}

export interface DashboardMetrics {
  totalAnggota: number;
  anggotaAktif: number;
  anggotaMeninggal: number;
  anggotaTidakAktif: number;
  totalUser: number;
  distribusiRT: {
    rt06: number;
    rt07: number;
    rt10: number;
  };
  totalKeluarga?: number;
  anggotaDenganAhliWaris?: number;
  iuranBulanIni?: number;
  jumlahSudahBayar?: number;
  jumlahBelumBayar?: number;
  totalTunggakanNominal?: number;
  totalKas?: number;
  iuranBulanan?: number;
  nominalSantunan?: number;
  masaTungguHari?: number;
}
