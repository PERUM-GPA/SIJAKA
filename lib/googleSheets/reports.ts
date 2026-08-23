/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Reports Service Layer (PHASE 4)
 * 
 * Single source of truth: 06_BUKU_KAS for cash balances.
 * Read-only, idempotent, and non-destructive.
 */

import { getAllMembers } from './anggota.ts';
import { getAllFamilies } from './keluarga.ts';
import { getAllContributions } from './iuran.ts';
import { getAllDeathReports } from './kematian.ts';
import { getAllSantunan } from './santunan.ts';
import { getAllCashTransactions, getCashSummary } from './bukuKas.ts';
import { getAllExpenses } from './pengeluaran.ts';
import { getParsedSettings } from './settings.ts';
import {
  CashTransaction,
  Contribution,
  Compensation,
  Expense,
  DeathReport,
  Member,
  RTEnum,
} from '../../src/types/index.ts';

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
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  rt?: RTEnum | 'all';
  jenisTransaksi?: 'all' | 'KAS_MASUK' | 'KAS_KELUAR';
  status?: string;
  kategori?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

/**
 * Resolves period type into precise date range (YYYY-MM-DD)
 */
export function resolveDateRange(period?: ReportPeriodType, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (period === 'today') {
    return { startDate: todayStr, endDate: todayStr, label: 'Hari Ini' };
  }

  if (period === 'this_week') {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
      label: 'Minggu Ini',
    };
  }

  if (period === 'this_month') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m, 1).toISOString().split('T')[0];
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return { startDate: start, endDate: end, label: `Bulan Ini (${monthNames[m]} ${y})` };
  }

  if (period === 'last_month') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const start = new Date(y, m, 1).toISOString().split('T')[0];
    const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return { startDate: start, endDate: end, label: `Bulan Lalu (${monthNames[m]} ${y})` };
  }

  if (period === 'this_year') {
    const y = now.getFullYear();
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, label: `Tahun ${y}` };
  }

  if (period === 'last_year') {
    const y = now.getFullYear() - 1;
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, label: `Tahun ${y}` };
  }

  if (period === 'custom' && customStart && customEnd) {
    if (customStart > customEnd) {
      throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    }
    return {
      startDate: customStart,
      endDate: customEnd,
      label: `Kustom (${customStart} s/d ${customEnd})`,
    };
  }

  // Default to all time (e.g. from 2025 to 2030)
  return {
    startDate: '2025-01-01',
    endDate: '2030-12-31',
    label: 'Semua Periode',
  };
}

/**
 * Filter item date between startDate and endDate (inclusive)
 */
function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const target = dateStr.slice(0, 10);
  return target >= start && target <= end;
}

/**
 * 1. Financial Summary Report
 */
export async function getFinancialSummaryReport(filter: ReportFilterOptions) {
  const dateRange = resolveDateRange(filter.period, filter.startDate, filter.endDate);
  const [members, cashTx, contributions, santunanList, expenses, cashOverall, settings] = await Promise.all([
    getAllMembers(),
    getAllCashTransactions(),
    getAllContributions(),
    getAllSantunan(),
    getAllExpenses(),
    getCashSummary(),
    getParsedSettings(),
  ]);

  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.ID_Anggota, m));

  // Filter valid cash transactions by date range and optional RT
  const validCashInPeriod = cashTx.filter((tx) => {
    if (tx.Status !== 'VALID') return false;
    if (!isDateInRange(tx.Tanggal, dateRange.startDate, dateRange.endDate)) return false;

    if (filter.rt && filter.rt !== 'all') {
      if (tx.ID_Anggota) {
        const mem = memberMap.get(tx.ID_Anggota);
        if (mem && mem.RT !== filter.rt) return false;
      }
    }

    if (filter.jenisTransaksi && filter.jenisTransaksi !== 'all') {
      if (tx.Jenis_Transaksi !== filter.jenisTransaksi) return false;
    }

    return true;
  });

  let totalKasMasuk = 0;
  let totalKasKeluar = 0;
  let totalIuran = 0;
  let totalSantunan = 0;
  let totalPengeluaran = 0;
  let jumlahIuran = 0;
  let jumlahSantunan = 0;
  let jumlahPengeluaran = 0;

  validCashInPeriod.forEach((tx) => {
    totalKasMasuk += tx.Kas_Masuk || 0;
    totalKasKeluar += tx.Kas_Keluar || 0;
    if (tx.Sumber_Transaksi === 'IURAN') {
      totalIuran += tx.Kas_Masuk || 0;
      jumlahIuran++;
    } else if (tx.Sumber_Transaksi === 'SANTUNAN') {
      totalSantunan += tx.Kas_Keluar || 0;
      jumlahSantunan++;
    } else if (tx.Sumber_Transaksi === 'PENGELUARAN') {
      totalPengeluaran += tx.Kas_Keluar || 0;
      jumlahPengeluaran++;
    }
  });

  // Filtered members by RT if requested
  const filteredMembers = filter.rt && filter.rt !== 'all'
    ? members.filter((m) => m.RT === filter.rt)
    : members;
  const activeMembers = filteredMembers.filter((m) => m.Status === 'Aktif');

  // RT breakdown for cash flow
  const rtBreakdown: Record<string, { masuk: number; keluar: number; kkCount: number }> = {
    '06': { masuk: 0, keluar: 0, kkCount: 0 },
    '07': { masuk: 0, keluar: 0, kkCount: 0 },
    '10': { masuk: 0, keluar: 0, kkCount: 0 },
  };

  members.forEach((m) => {
    if (rtBreakdown[m.RT] && m.Status === 'Aktif') {
      rtBreakdown[m.RT].kkCount++;
    }
  });

  validCashInPeriod.forEach((tx) => {
    if (tx.ID_Anggota) {
      const m = memberMap.get(tx.ID_Anggota);
      if (m && rtBreakdown[m.RT]) {
        rtBreakdown[m.RT].masuk += tx.Kas_Masuk || 0;
        rtBreakdown[m.RT].keluar += tx.Kas_Keluar || 0;
      }
    }
  });

  // Category breakdown for expenses in this period
  const categoryBreakdown: Record<string, number> = {};
  const validExpensesInPeriod = expenses.filter((e) => {
    if (e.Status !== 'DIBAYARKAN') return false;
    return isDateInRange(e.Tanggal_Pengeluaran, dateRange.startDate, dateRange.endDate);
  });
  validExpensesInPeriod.forEach((e) => {
    categoryBreakdown[e.Kategori] = (categoryBreakdown[e.Kategori] || 0) + e.Nominal;
  });

  // Monthly trend (last 6 months)
  const monthlyTrend: Array<{ monthKey: string; label: string; masuk: number; keluar: number; saldo: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const mStr = String(m).padStart(2, '0');
    const monthKey = `${y}-${mStr}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const label = `${monthNames[m - 1]} ${y}`;

    let mMasuk = 0;
    let mKeluar = 0;
    cashTx.forEach((tx) => {
      if (tx.Status === 'VALID' && tx.Tanggal.startsWith(monthKey)) {
        mMasuk += tx.Kas_Masuk || 0;
        mKeluar += tx.Kas_Keluar || 0;
      }
    });

    monthlyTrend.push({
      monthKey,
      label,
      masuk: mMasuk,
      keluar: mKeluar,
      saldo: mMasuk - mKeluar,
    });
  }

  return {
    periodInfo: dateRange,
    filterApplied: {
      rt: filter.rt || 'all',
      jenisTransaksi: filter.jenisTransaksi || 'all',
    },
    // The Single Source of Truth for ongoing balance
    saldoKasSekarang: cashOverall.saldoKas,
    // Periode metrics
    totalKasMasukPeriode: totalKasMasuk,
    totalKasKeluarPeriode: totalKasKeluar,
    surplusDefisitPeriode: totalKasMasuk - totalKasKeluar,
    totalIuranPeriode: totalIuran,
    totalSantunanPeriode: totalSantunan,
    totalPengeluaranPeriode: totalPengeluaran,
    jumlahTransaksi: {
      total: validCashInPeriod.length,
      iuran: jumlahIuran,
      santunan: jumlahSantunan,
      pengeluaran: jumlahPengeluaran,
    },
    anggotaMetrics: {
      totalKK: filteredMembers.length,
      kkAktif: activeMembers.length,
    },
    rtBreakdown,
    categoryBreakdown,
    monthlyTrend,
    settings: {
      iuranBulanan: settings.IURAN_BULANAN,
      nominalSantunan: settings.NOMINAL_SANTUNAN,
      masaTungguHari: settings.MASA_TUNGGU_HARI,
    },
  };
}

/**
 * 2. Detailed Cashbook Report
 */
export async function getCashbookReport(filter: ReportFilterOptions) {
  const dateRange = resolveDateRange(filter.period, filter.startDate, filter.endDate);
  const [cashTx, members] = await Promise.all([
    getAllCashTransactions(),
    getAllMembers(),
  ]);

  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.ID_Anggota, m));

  const enriched = cashTx.map((tx) => {
    const mem = tx.ID_Anggota ? memberMap.get(tx.ID_Anggota) : undefined;
    return {
      ...tx,
      namaAnggota: mem ? mem.Nama : tx.namaAnggota || '',
      noKkAnggota: mem ? mem.No_KK : '',
      rtAnggota: mem ? mem.RT : '',
    };
  });

  const filtered = enriched.filter((tx) => {
    if (!isDateInRange(tx.Tanggal, dateRange.startDate, dateRange.endDate)) return false;

    if (filter.rt && filter.rt !== 'all') {
      if (tx.rtAnggota && tx.rtAnggota !== filter.rt) return false;
    }

    if (filter.jenisTransaksi && filter.jenisTransaksi !== 'all') {
      if (tx.Jenis_Transaksi !== filter.jenisTransaksi) return false;
    }

    if (filter.status && filter.status !== 'all') {
      if (tx.Status !== filter.status) return false;
    }

    return true;
  });

  // Calculate totals for filtered items
  let totalMasuk = 0;
  let totalKeluar = 0;
  let countValid = 0;
  let countDibatalkan = 0;

  filtered.forEach((tx) => {
    if (tx.Status === 'VALID') {
      totalMasuk += tx.Kas_Masuk || 0;
      totalKeluar += tx.Kas_Keluar || 0;
      countValid++;
    } else {
      countDibatalkan++;
    }
  });

  const overall = await getCashSummary();

  return {
    periodInfo: dateRange,
    filterApplied: filter,
    summary: {
      totalMasuk,
      totalKeluar,
      netCashFlow: totalMasuk - totalKeluar,
      countValid,
      countDibatalkan,
      totalRecords: filtered.length,
      saldoKasSaatIni: overall.saldoKas,
    },
    items: filtered,
  };
}

/**
 * 3. Detailed Iuran Report
 */
export async function getIuranReport(filter: ReportFilterOptions) {
  const dateRange = resolveDateRange(filter.period, filter.startDate, filter.endDate);
  const [contributions, members, settings] = await Promise.all([
    getAllContributions(),
    getAllMembers(),
    getParsedSettings(),
  ]);

  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.ID_Anggota, m));

  const enriched = contributions.map((c) => {
    const mem = memberMap.get(c.ID_Anggota);
    return {
      ...c,
      namaKepalaKeluarga: mem ? mem.Nama : 'Anggota Tidak Ditemukan',
      noKk: mem ? mem.No_KK : '-',
      rt: mem ? mem.RT : ('06' as RTEnum),
      statusAnggota: mem ? mem.Status : 'Aktif',
    };
  });

  const filtered = enriched.filter((c) => {
    if (!isDateInRange(c.Tanggal_Bayar, dateRange.startDate, dateRange.endDate)) return false;
    if (filter.rt && filter.rt !== 'all' && c.rt !== filter.rt) return false;
    if (filter.status && filter.status !== 'all' && c.Status !== filter.status) return false;
    return true;
  });

  // Calculate summary metrics
  const activeMembers = members.filter((m) => {
    if (filter.rt && filter.rt !== 'all') return m.Status === 'Aktif' && m.RT === filter.rt;
    return m.Status === 'Aktif';
  });

  const totalKK = activeMembers.length;
  const uniqueKKPaid = new Set(filtered.filter((c) => c.Status === 'Lunas').map((c) => c.ID_Anggota));
  const kkSudahBayar = uniqueKKPaid.size;
  const kkBelumBayar = Math.max(0, totalKK - kkSudahBayar);
  const totalNominal = filtered.reduce((sum, c) => sum + (c.Status === 'Lunas' ? c.Nominal : 0), 0);
  const persentaseKepatuhan = totalKK > 0 ? Math.round((kkSudahBayar / totalKK) * 100) : 0;

  // Breakdown per RT
  const rtSummary: Record<string, { totalKK: number; paidKK: number; totalNominal: number; rate: number }> = {
    '06': { totalKK: 0, paidKK: 0, totalNominal: 0, rate: 0 },
    '07': { totalKK: 0, paidKK: 0, totalNominal: 0, rate: 0 },
    '10': { totalKK: 0, paidKK: 0, totalNominal: 0, rate: 0 },
  };

  members.forEach((m) => {
    if (m.Status === 'Aktif' && rtSummary[m.RT]) {
      rtSummary[m.RT].totalKK++;
    }
  });

  const paidByRT = { '06': new Set<string>(), '07': new Set<string>(), '10': new Set<string>() };
  filtered.forEach((c) => {
    if (c.Status === 'Lunas' && rtSummary[c.rt]) {
      rtSummary[c.rt].totalNominal += c.Nominal;
      paidByRT[c.rt]?.add(c.ID_Anggota);
    }
  });

  (['06', '07', '10'] as const).forEach((rtKey) => {
    rtSummary[rtKey].paidKK = paidByRT[rtKey].size;
    rtSummary[rtKey].rate = rtSummary[rtKey].totalKK > 0
      ? Math.round((rtSummary[rtKey].paidKK / rtSummary[rtKey].totalKK) * 100)
      : 0;
  });

  // Monthly breakdown
  const monthlyMap = new Map<string, { bulan: number; tahun: number; nominal: number; count: number }>();
  filtered.forEach((c) => {
    if (c.Status === 'Lunas') {
      const key = `${c.Periode_Tahun}-${String(c.Periode_Bulan).padStart(2, '0')}`;
      const curr = monthlyMap.get(key) || { bulan: c.Periode_Bulan, tahun: c.Periode_Tahun, nominal: 0, count: 0 };
      curr.nominal += c.Nominal;
      curr.count++;
      monthlyMap.set(key, curr);
    }
  });

  const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.tahun !== b.tahun) return a.tahun - b.tahun;
    return a.bulan - b.bulan;
  });

  return {
    periodInfo: dateRange,
    filterApplied: filter,
    summary: {
      totalKK,
      kkSudahBayar,
      kkBelumBayar,
      totalNominal,
      totalTransaksi: filtered.length,
      persentaseKepatuhan,
      nominalIuranPerKK: settings.IURAN_BULANAN,
    },
    rtSummary,
    monthlyBreakdown,
    items: filtered,
  };
}

/**
 * 4. Detailed Santunan Report
 */
export async function getSantunanReport(filter: ReportFilterOptions) {
  const dateRange = resolveDateRange(filter.period, filter.startDate, filter.endDate);
  const [santunanList, deathReports, members, settings] = await Promise.all([
    getAllSantunan(),
    getAllDeathReports(),
    getAllMembers(),
    getParsedSettings(),
  ]);

  const memberMap = new Map<string, Member>();
  members.forEach((m) => memberMap.set(m.ID_Anggota, m));

  const reportMap = new Map<string, DeathReport>();
  deathReports.forEach((r) => reportMap.set(r.ID_Laporan, r));

  const enriched = santunanList.map((s) => {
    const mem = memberMap.get(s.ID_Anggota);
    const rep = reportMap.get(s.ID_Laporan);
    return {
      ...s,
      namaAnggota: mem ? mem.Nama : s.namaAnggota || '',
      noKk: mem ? mem.No_KK : '',
      rt: mem ? mem.RT : ('06' as RTEnum),
      statusLaporan: rep ? rep.Status : 'DISETUJUI',
      tanggalKematian: rep ? rep.Waktu_Kematian : '',
      tempatKematian: rep ? rep.Tempat_Kematian : '',
      pelapor: rep ? rep.Pelapor : '',
    };
  });

  const filtered = enriched.filter((s) => {
    const checkDate = s.Tanggal_Pencairan || s.Tanggal_Pengajuan;
    if (!isDateInRange(checkDate, dateRange.startDate, dateRange.endDate)) return false;
    if (filter.rt && filter.rt !== 'all' && s.rt !== filter.rt) return false;
    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'DICAIRKAN' && !s.Tanggal_Pencairan) return false;
      if (filter.status === 'DISETUJUI' && s.Status_Persetujuan !== 'DISETUJUI') return false;
      if (filter.status === 'MENUNGGU' && s.Status_Persetujuan !== 'MENUNGGU') return false;
      if (filter.status === 'DITOLAK' && s.Status_Persetujuan !== 'DITOLAK') return false;
    }
    return true;
  });

  let totalPengajuan = 0;
  let totalDisetujui = 0;
  let totalDicairkan = 0;
  let totalNominalDicairkan = 0;

  filtered.forEach((s) => {
    totalPengajuan++;
    if (s.Status_Persetujuan === 'DISETUJUI') totalDisetujui++;
    if (s.Tanggal_Pencairan) {
      totalDicairkan++;
      totalNominalDicairkan += s.Nominal_Santunan;
    }
  });

  // RT Breakdown
  const rtSummary: Record<string, { count: number; totalNominal: number }> = {
    '06': { count: 0, totalNominal: 0 },
    '07': { count: 0, totalNominal: 0 },
    '10': { count: 0, totalNominal: 0 },
  };

  filtered.forEach((s) => {
    if (s.Tanggal_Pencairan && rtSummary[s.rt]) {
      rtSummary[s.rt].count++;
      rtSummary[s.rt].totalNominal += s.Nominal_Santunan;
    }
  });

  return {
    periodInfo: dateRange,
    filterApplied: filter,
    summary: {
      totalLaporanKematian: deathReports.length,
      totalPengajuan,
      totalDisetujui,
      totalDicairkan,
      totalNominalDicairkan,
      standardNominal: settings.NOMINAL_SANTUNAN,
    },
    rtSummary,
    items: filtered,
  };
}

/**
 * 5. Detailed Pengeluaran Report
 */
export async function getPengeluaranReport(filter: ReportFilterOptions) {
  const dateRange = resolveDateRange(filter.period, filter.startDate, filter.endDate);
  const expenses = await getAllExpenses();

  const filtered = expenses.filter((e) => {
    if (!isDateInRange(e.Tanggal_Pengeluaran, dateRange.startDate, dateRange.endDate)) return false;
    if (filter.kategori && filter.kategori !== 'all' && e.Kategori !== filter.kategori) return false;
    if (filter.status && filter.status !== 'all' && e.Status !== filter.status) return false;
    return true;
  });

  let totalDiajukan = 0;
  let totalDisetujui = 0;
  let totalDibayarkan = 0;
  let totalDitolak = 0;
  let totalNominalDibayar = 0;

  const categoryBreakdown: Record<string, { count: number; nominal: number }> = {};

  filtered.forEach((e) => {
    if (e.Status === 'DIAJUKAN') totalDiajukan++;
    if (e.Status === 'DISETUJUI') totalDisetujui++;
    if (e.Status === 'DITOLAK') totalDitolak++;
    if (e.Status === 'DIBAYARKAN') {
      totalDibayarkan++;
      totalNominalDibayar += e.Nominal;

      if (!categoryBreakdown[e.Kategori]) {
        categoryBreakdown[e.Kategori] = { count: 0, nominal: 0 };
      }
      categoryBreakdown[e.Kategori].count++;
      categoryBreakdown[e.Kategori].nominal += e.Nominal;
    }
  });

  return {
    periodInfo: dateRange,
    filterApplied: filter,
    summary: {
      totalPengajuan: filtered.length,
      totalDiajukan,
      totalDisetujui,
      totalDibayarkan,
      totalDitolak,
      totalNominalDibayar,
    },
    categoryBreakdown,
    items: filtered,
  };
}
