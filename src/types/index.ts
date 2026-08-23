/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Type Definitions
 */

export type RTEnum = '06' | '07' | '10';

export type MemberStatus = 'Aktif' | 'Tidak Aktif' | 'Meninggal';

export type UserRole = 'ADMIN' | 'BENDAHARA' | 'PENGURUS' | 'ANGGOTA';

export type UserStatus = 'Aktif' | 'Tidak Aktif';

export type ActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VERIFY'
  | 'APPROVE'
  | 'DISBURSE'
  | 'CANCEL'
  | 'PAY'
  | 'SYNC'
  | 'CHANGE_PASSWORD'
  | 'UPDATE_PROFILE'
  | 'SUBMIT_DATA_CHANGE'
  | 'APPROVE_DATA_CHANGE'
  | 'REJECT_DATA_CHANGE'
  | 'CREATE_LAPORAN_KEMATIAN'
  | 'UPDATE_LAPORAN_KEMATIAN'
  | 'VERIFY_LAPORAN_KEMATIAN'
  | 'APPROVE_LAPORAN_KEMATIAN'
  | 'CREATE_SANTUNAN'
  | 'VERIFY_SANTUNAN'
  | 'APPROVE_SANTUNAN'
  | 'DISBURSE_SANTUNAN'
  | 'CREATE_PENGELUARAN'
  | 'APPROVE_PENGELUARAN'
  | 'PAY_PENGELUARAN'
  | 'CREATE_BUKU_KAS'
  | 'UPDATE_BUKU_KAS'
  | 'CANCEL_BUKU_KAS'
  | 'CREATE_REPORT'
  | 'VIEW_REPORT'
  | 'EXPORT_PDF'
  | 'EXPORT_EXCEL'
  | 'PRINT_REPORT'
  | 'RUN_RECONCILIATION';

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

export type FamilyRelation = 'Kepala Keluarga' | 'Suami' | 'Istri' | 'Anak' | 'Orang Tua' | 'Tanggungan' | 'Lainnya';
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

// 04_LAPORAN_KEMATIAN
export type DeathReportStatus = 'DIAJUKAN' | 'DIVERIFIKASI' | 'DISETUJUI' | 'DITOLAK' | 'SELESAI';
export type DeathReportHubungan =
  | 'Kepala Keluarga'
  | 'Pasangan'
  | 'Anak'
  | 'Orang Tua'
  | 'Tanggungan'
  | 'Ahli Waris'
  | 'Pengurus'
  | 'Lainnya';

export interface DeathReport {
  ID_Laporan: string;
  ID_Anggota: string;
  Tanggal_Lapor: string; // YYYY-MM-DD
  Pelapor: string;
  Hubungan_Pelapor: DeathReportHubungan;
  Waktu_Kematian: string; // YYYY-MM-DD HH:mm or ISO
  Tempat_Kematian: string;
  Penyebab_Kematian?: string;
  Dokumen_Pendukung?: string;
  Status: DeathReportStatus;
  Diverifikasi_Oleh?: string; // ID_User
  Tanggal_Verifikasi?: string;
  Disetujui_Oleh?: string; // ID_User
  Tanggal_Persetujuan?: string;
  Keterangan?: string;
  Tanggal_Dibuat: string;
  Tanggal_Diperbarui: string;
  // Enriched
  namaAnggota?: string;
  noKk?: string;
  rtAnggota?: string;
  namaDiverifikasi?: string;
  namaDisetujui?: string;
}

// 05_SANTUNAN
export type SantunanVerifikasiStatus = 'MENUNGGU' | 'TERVERIFIKASI' | 'DITOLAK';
export type SantunanPersetujuanStatus = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
export type SantunanMetodePencairan = 'Tunai' | 'Transfer';

export interface Compensation {
  ID_Santunan: string;
  ID_Laporan: string;
  ID_Anggota: string;
  ID_AhliWaris: string;
  Nama_Penerima: string;
  Hubungan_Penerima: string;
  Nominal_Santunan: number; // default 600000
  Tanggal_Pengajuan: string;
  Status_Verifikasi: SantunanVerifikasiStatus;
  Diverifikasi_Oleh?: string; // ID_User
  Tanggal_Verifikasi?: string;
  Status_Persetujuan: SantunanPersetujuanStatus;
  Disetujui_Oleh?: string; // ID_User
  Tanggal_Persetujuan?: string;
  Tanggal_Pencairan?: string;
  Metode_Pencairan?: SantunanMetodePencairan;
  Nomor_Bukti?: string;
  Bukti_Pencairan?: string;
  Keterangan?: string;
  Tanggal_Dibuat: string;
  Tanggal_Diperbarui: string;
  // Enriched
  namaAnggota?: string;
  rtAnggota?: string;
  namaPelapor?: string;
  namaDiverifikasi?: string;
  namaDisetujui?: string;
}

// Alias for convenience
export type Santunan = Compensation;

// 06_BUKU_KAS
export type CashTransactionJenis = 'KAS_MASUK' | 'KAS_KELUAR';
export type CashTransactionSumber = 'IURAN' | 'SANTUNAN' | 'PENGELUARAN' | 'PENYESUAIAN' | 'LAINNYA';
export type CashTransactionStatus = 'VALID' | 'DIBATALKAN';
export type CashTransactionMetode = 'Tunai' | 'Transfer';

export interface CashTransaction {
  ID_Transaksi: string;
  Tanggal: string;
  Jenis_Transaksi: CashTransactionJenis;
  Sumber_Transaksi: CashTransactionSumber;
  ID_Sumber: string;
  ID_Anggota?: string;
  Uraian: string;
  Kas_Masuk: number;
  Kas_Keluar: number;
  Saldo: number;
  Metode: CashTransactionMetode;
  Nomor_Bukti?: string;
  Petugas: string;
  Status: CashTransactionStatus;
  Keterangan?: string;
  Tanggal_Dibuat: string;
  // Enriched
  namaAnggota?: string;
}

export interface CashSummary {
  saldoKas: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  totalIuranTerkumpul: number;
  totalSantunanTersalur: number;
  totalPengeluaranOperasional: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  totalTransaksiValid: number;
}

// 07_PENGELUARAN
export type ExpenseCategory =
  | 'Operasional'
  | 'Administrasi'
  | 'Kegiatan Jamaah'
  | 'Sosial'
  | 'Perlengkapan'
  | 'Transportasi'
  | 'Lainnya';

export type ExpenseStatus = 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK' | 'DIBAYARKAN';
export type ExpensePaymentMethod = 'Tunai' | 'Transfer';

export interface Expense {
  ID_Pengeluaran: string;
  Tanggal_Pengeluaran: string;
  Kategori: ExpenseCategory;
  Uraian: string;
  Nominal: number;
  Metode_Pembayaran: ExpensePaymentMethod;
  Nomor_Bukti?: string;
  Bukti_Pengeluaran?: string;
  Diajukan_Oleh: string; // ID_User
  Disetujui_Oleh?: string; // ID_User
  Tanggal_Persetujuan?: string;
  Status: ExpenseStatus;
  Keterangan?: string;
  Tanggal_Dibuat: string;
  Tanggal_Diperbarui: string;
  // Enriched
  namaDiajukan?: string;
  namaDisetujui?: string;
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
  MustChangePassword?: boolean;
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
  MustChangePassword?: boolean;
}

// Member Self-Service Payloads
export interface MemberSelfServiceProfilePayload {
  No_HP?: string;
  Alamat?: string;
  Keterangan?: string;
}

export interface MemberSelfServiceFamilyPayload {
  ID_Keluarga?: string;
  NIK?: string;
  Nama: string;
  Tempat_Lahir?: string;
  Tanggal_Lahir?: string;
  Hubungan: FamilyRelation;
  No_HP?: string;
  Calon_Ahli_Waris?: HeirCandidate;
  Keterangan?: string;
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
  saldoKas?: number;
  totalPemasukan?: number;
  totalPengeluaran?: number;
  totalLaporanKematian?: number;
  laporanPending?: number;
  santunanPending?: number;
  iuranBulanan?: number;
  nominalSantunan?: number;
  masaTungguHari?: number;
}

export interface PublicDashboardMetrics {
  totalKK: number;
  kkAktif: number;
  keluargaTerlindungi: number;
  pembayaranBulanIni: number;
  belumBayarBulanIni: number;
  persentaseKepatuhan: number;
  totalPemasukanBulanIni: number;
  totalPengeluaranBulanIni: number;
  saldoKas: number;
  distribusiRT: {
    rt06: number;
    rt07: number;
    rt10: number;
  };
}

export interface PublicDaftarKKPayload {
  kepalaKeluarga: {
    No_KK: string;
    NIK: string;
    Nama: string;
    Tempat_Lahir: string;
    Tanggal_Lahir: string;
    Alamat: string;
    RT: RTEnum;
    No_HP: string;
  };
  anggotaKeluarga: Array<{
    NIK?: string;
    Nama: string;
    Tempat_Lahir?: string;
    Tanggal_Lahir?: string;
    Hubungan: FamilyRelation;
    No_HP?: string;
    Calon_Ahli_Waris: HeirCandidate;
  }>;
}

// ==========================================
// PHASE 4: REPORT & RECONCILIATION TYPES
// ==========================================

export type ReportPeriodType =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom'
  | 'all';

export interface ReportFilterOptions {
  period?: ReportPeriodType;
  startDate?: string;
  endDate?: string;
  rt?: RTEnum | 'all';
  jenisTransaksi?: 'all' | 'KAS_MASUK' | 'KAS_KELUAR';
  status?: string;
  kategori?: string;
}

export interface FinancialSummaryReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filterApplied: {
    rt: RTEnum | 'all';
    jenisTransaksi: 'all' | 'KAS_MASUK' | 'KAS_KELUAR';
  };
  saldoKasSekarang: number;
  totalKasMasukPeriode: number;
  totalKasKeluarPeriode: number;
  surplusDefisitPeriode: number;
  totalIuranPeriode: number;
  totalSantunanPeriode: number;
  totalPengeluaranPeriode: number;
  jumlahTransaksi: {
    total: number;
    iuran: number;
    santunan: number;
    pengeluaran: number;
  };
  anggotaMetrics: {
    totalKK: number;
    kkAktif: number;
  };
  rtBreakdown: Record<string, { masuk: number; keluar: number; kkCount: number }>;
  categoryBreakdown: Record<string, number>;
  monthlyTrend: Array<{ monthKey: string; label: string; masuk: number; keluar: number; saldo: number }>;
  settings: {
    iuranBulanan: number;
    nominalSantunan: number;
    masaTungguHari: number;
  };
}

export interface CashbookReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filterApplied: ReportFilterOptions;
  summary: {
    totalMasuk: number;
    totalKeluar: number;
    netCashFlow: number;
    countValid: number;
    countDibatalkan: number;
    totalRecords: number;
    saldoKasSaatIni: number;
  };
  items: Array<CashTransaction & {
    namaAnggota?: string;
    noKkAnggota?: string;
    rtAnggota?: string;
  }>;
}

export interface IuranReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filterApplied: ReportFilterOptions;
  summary: {
    totalKK: number;
    kkSudahBayar: number;
    kkBelumBayar: number;
    totalNominal: number;
    totalTransaksi: number;
    persentaseKepatuhan: number;
    nominalIuranPerKK: number;
  };
  rtSummary: Record<string, { totalKK: number; paidKK: number; totalNominal: number; rate: number }>;
  monthlyBreakdown: Array<{ bulan: number; tahun: number; nominal: number; count: number }>;
  items: Array<Contribution & {
    namaKepalaKeluarga: string;
    noKk: string;
    rt: RTEnum;
    statusAnggota: string;
  }>;
}

export interface SantunanReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filterApplied: ReportFilterOptions;
  summary: {
    totalLaporanKematian: number;
    totalPengajuan: number;
    totalDisetujui: number;
    totalDicairkan: number;
    totalNominalDicairkan: number;
    standardNominal: number;
  };
  rtSummary: Record<string, { count: number; totalNominal: number }>;
  items: Array<Compensation & {
    namaAnggota?: string;
    noKk?: string;
    rt?: RTEnum;
    statusLaporan?: string;
    tanggalKematian?: string;
    tempatKematian?: string;
    pelapor?: string;
  }>;
}

export interface PengeluaranReportData {
  periodInfo: {
    startDate: string;
    endDate: string;
    label: string;
  };
  filterApplied: ReportFilterOptions;
  summary: {
    totalPengajuan: number;
    totalDiajukan: number;
    totalDisetujui: number;
    totalDibayarkan: number;
    totalDitolak: number;
    totalNominalDibayar: number;
  };
  categoryBreakdown: Record<string, { count: number; nominal: number }>;
  items: Expense[];
}

export interface ReconciliationReportData {
  timestamp: string;
  reconciliationStatus: 'VALID' | 'PERLU PEMERIKSAAN';
  ledger: {
    totalKasMasuk: number;
    totalKasKeluar: number;
    saldoBukuKas: number;
    expectedSaldo: number;
    selisih: number;
    totalTransaksiValid: number;
    totalTransaksiDibatalkan: number;
  };
  sourcesBreakdown: {
    kasMasuk: {
      iuran: { count: number; total: number };
      penyesuaian: { count: number; total: number };
      lainnya: { count: number; total: number };
      total: number;
    };
    kasKeluar: {
      santunan: { count: number; total: number };
      pengeluaran: { count: number; total: number };
      penyesuaian: { count: number; total: number };
      lainnya: { count: number; total: number };
      total: number;
    };
  };
  comparisons: {
    iuran: {
      moduleName: string;
      sourceTotalRecords: number;
      sourceTotalAmount: number;
      ledgerTotalRecords: number;
      ledgerTotalAmount: number;
      difference: number;
      status: 'MATCH' | 'MISMATCH';
    };
    santunan: {
      moduleName: string;
      sourceTotalRecords: number;
      sourceTotalAmount: number;
      ledgerTotalRecords: number;
      ledgerTotalAmount: number;
      difference: number;
      status: 'MATCH' | 'MISMATCH';
    };
    pengeluaran: {
      moduleName: string;
      sourceTotalRecords: number;
      sourceTotalAmount: number;
      ledgerTotalRecords: number;
      ledgerTotalAmount: number;
      difference: number;
      status: 'MATCH' | 'MISMATCH';
    };
  };
  integrityChecks: {
    passed: boolean;
    checksCount: number;
    passedCount: number;
    failedCount: number;
    checks: Array<{
      checkNumber: number;
      title: string;
      status: 'PASS' | 'FAIL';
      details: string;
    }>;
  };
  anomalies: Array<{
    id: string;
    type: 'WARNING' | 'ERROR' | 'INFO';
    category: string;
    transactionId?: string;
    referenceId?: string;
    description: string;
    recommendation: string;
  }>;
}


