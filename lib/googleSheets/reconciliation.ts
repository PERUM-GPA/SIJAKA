/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Financial Reconciliation & Integrity Check Service (PHASE 4)
 * 
 * Single source of truth: 06_BUKU_KAS
 * Read-only, mathematical validation, and audit tracking.
 */

import { getAllCashTransactions, getCashSummary } from './bukuKas.ts';
import { getAllContributions } from './iuran.ts';
import { getAllSantunan } from './santunan.ts';
import { getAllExpenses } from './pengeluaran.ts';

export interface AnomalyItem {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO';
  category: string;
  transactionId?: string;
  referenceId?: string;
  description: string;
  recommendation: string;
}

export interface SourceComparison {
  moduleName: string;
  sourceTotalRecords: number;
  sourceTotalAmount: number;
  ledgerTotalRecords: number;
  ledgerTotalAmount: number;
  difference: number;
  status: 'MATCH' | 'MISMATCH';
}

export interface ReconciliationReport {
  timestamp: string;
  reconciliationStatus: 'VALID' | 'PERLU PEMERIKSAAN';
  // Ledger summary
  ledger: {
    totalKasMasuk: number;
    totalKasKeluar: number;
    saldoBukuKas: number;
    expectedSaldo: number;
    selisih: number;
    totalTransaksiValid: number;
    totalTransaksiDibatalkan: number;
  };
  // Sources breakdown
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
  // Source vs Ledger comparison
  comparisons: {
    iuran: SourceComparison;
    santunan: SourceComparison;
    pengeluaran: SourceComparison;
  };
  // Integrity check items
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
  // List of detailed anomalies (if any)
  anomalies: AnomalyItem[];
}

/**
 * Runs complete financial reconciliation and integrity checks
 */
export async function runFinancialReconciliation(): Promise<ReconciliationReport> {
  const [cashTx, contributions, santunanList, expenses, summary] = await Promise.all([
    getAllCashTransactions(),
    getAllContributions(),
    getAllSantunan(),
    getAllExpenses(),
    getCashSummary(),
  ]);

  const anomalies: AnomalyItem[] = [];

  // Maps for source lookups
  const iuranMap = new Map<string, typeof contributions[0]>();
  contributions.forEach((c) => iuranMap.set(c.ID_Iuran, c));

  const santunanMap = new Map<string, typeof santunanList[0]>();
  santunanList.forEach((s) => santunanMap.set(s.ID_Santunan, s));

  const expenseMap = new Map<string, typeof expenses[0]>();
  expenses.forEach((e) => expenseMap.set(e.ID_Pengeluaran, e));

  // 1. Calculate Ledger Mathematical Totals
  let calculatedMasuk = 0;
  let calculatedKeluar = 0;
  let countValid = 0;
  let countDibatalkan = 0;

  const validTx = cashTx.filter((t) => t.Status === 'VALID');
  const cancelledTx = cashTx.filter((t) => t.Status === 'DIBATALKAN');

  validTx.forEach((tx) => {
    calculatedMasuk += tx.Kas_Masuk || 0;
    calculatedKeluar += tx.Kas_Keluar || 0;
    countValid++;
  });
  countDibatalkan = cancelledTx.length;

  const expectedSaldo = calculatedMasuk - calculatedKeluar;
  const currentSaldo = summary.saldoKas;
  const ledgerDifference = Math.abs(currentSaldo - expectedSaldo);

  // 2. Source Breakdown in Ledger
  const sourcesBreakdown = {
    kasMasuk: {
      iuran: { count: 0, total: 0 },
      penyesuaian: { count: 0, total: 0 },
      lainnya: { count: 0, total: 0 },
      total: 0,
    },
    kasKeluar: {
      santunan: { count: 0, total: 0 },
      pengeluaran: { count: 0, total: 0 },
      penyesuaian: { count: 0, total: 0 },
      lainnya: { count: 0, total: 0 },
      total: 0,
    },
  };

  validTx.forEach((tx) => {
    if (tx.Jenis_Transaksi === 'KAS_MASUK') {
      sourcesBreakdown.kasMasuk.total += tx.Kas_Masuk || 0;
      if (tx.Sumber_Transaksi === 'IURAN') {
        sourcesBreakdown.kasMasuk.iuran.count++;
        sourcesBreakdown.kasMasuk.iuran.total += tx.Kas_Masuk || 0;
      } else if (tx.Sumber_Transaksi === 'PENYESUAIAN') {
        sourcesBreakdown.kasMasuk.penyesuaian.count++;
        sourcesBreakdown.kasMasuk.penyesuaian.total += tx.Kas_Masuk || 0;
      } else {
        sourcesBreakdown.kasMasuk.lainnya.count++;
        sourcesBreakdown.kasMasuk.lainnya.total += tx.Kas_Masuk || 0;
      }
    } else if (tx.Jenis_Transaksi === 'KAS_KELUAR') {
      sourcesBreakdown.kasKeluar.total += tx.Kas_Keluar || 0;
      if (tx.Sumber_Transaksi === 'SANTUNAN') {
        sourcesBreakdown.kasKeluar.santunan.count++;
        sourcesBreakdown.kasKeluar.santunan.total += tx.Kas_Keluar || 0;
      } else if (tx.Sumber_Transaksi === 'PENGELUARAN') {
        sourcesBreakdown.kasKeluar.pengeluaran.count++;
        sourcesBreakdown.kasKeluar.pengeluaran.total += tx.Kas_Keluar || 0;
      } else if (tx.Sumber_Transaksi === 'PENYESUAIAN') {
        sourcesBreakdown.kasKeluar.penyesuaian.count++;
        sourcesBreakdown.kasKeluar.penyesuaian.total += tx.Kas_Keluar || 0;
      } else {
        sourcesBreakdown.kasKeluar.lainnya.count++;
        sourcesBreakdown.kasKeluar.lainnya.total += tx.Kas_Keluar || 0;
      }
    }
  });

  // 3. Compare Source Modules with Ledger
  // Iuran: Lunas
  const lunasIuran = contributions.filter((c) => c.Status === 'Lunas');
  const totalIuranSource = lunasIuran.reduce((sum, c) => sum + c.Nominal, 0);
  const iuranDiff = Math.abs(totalIuranSource - sourcesBreakdown.kasMasuk.iuran.total);

  // Santunan: Disbursed
  const disbursedSantunan = santunanList.filter((s) => Boolean(s.Tanggal_Pencairan));
  const totalSantunanSource = disbursedSantunan.reduce((sum, s) => sum + s.Nominal_Santunan, 0);
  const santunanDiff = Math.abs(totalSantunanSource - sourcesBreakdown.kasKeluar.santunan.total);

  // Pengeluaran: Dibayarkan
  const paidExpenses = expenses.filter((e) => e.Status === 'DIBAYARKAN');
  const totalExpenseSource = paidExpenses.reduce((sum, e) => sum + e.Nominal, 0);
  const expenseDiff = Math.abs(totalExpenseSource - sourcesBreakdown.kasKeluar.pengeluaran.total);

  const comparisons: ReconciliationReport['comparisons'] = {
    iuran: {
      moduleName: '03_IURAN (Lunas)',
      sourceTotalRecords: lunasIuran.length,
      sourceTotalAmount: totalIuranSource,
      ledgerTotalRecords: sourcesBreakdown.kasMasuk.iuran.count,
      ledgerTotalAmount: sourcesBreakdown.kasMasuk.iuran.total,
      difference: iuranDiff,
      status: iuranDiff === 0 ? 'MATCH' : 'MISMATCH',
    },
    santunan: {
      moduleName: '05_SANTUNAN (Dicairkan)',
      sourceTotalRecords: disbursedSantunan.length,
      sourceTotalAmount: totalSantunanSource,
      ledgerTotalRecords: sourcesBreakdown.kasKeluar.santunan.count,
      ledgerTotalAmount: sourcesBreakdown.kasKeluar.santunan.total,
      difference: santunanDiff,
      status: santunanDiff === 0 ? 'MATCH' : 'MISMATCH',
    },
    pengeluaran: {
      moduleName: '07_PENGELUARAN (Dibayarkan)',
      sourceTotalRecords: paidExpenses.length,
      sourceTotalAmount: totalExpenseSource,
      ledgerTotalRecords: sourcesBreakdown.kasKeluar.pengeluaran.count,
      ledgerTotalAmount: sourcesBreakdown.kasKeluar.pengeluaran.total,
      difference: expenseDiff,
      status: expenseDiff === 0 ? 'MATCH' : 'MISMATCH',
    },
  };

  // 4. Ten Point Integrity Checks
  const checks: Array<{ checkNumber: number; title: string; status: 'PASS' | 'FAIL'; details: string }> = [];

  // Check 1: Transaksi Buku Kas tanpa sumber (ID_Sumber kosong)
  const noSourceId = cashTx.filter((t) => !t.ID_Sumber || t.ID_Sumber.trim() === '');
  if (noSourceId.length > 0) {
    noSourceId.forEach((t) => {
      anomalies.push({
        id: `ANOMALY_1_${t.ID_Transaksi}`,
        type: 'WARNING',
        category: 'ID_SUMBER_KOSONG',
        transactionId: t.ID_Transaksi,
        description: `Transaksi ${t.ID_Transaksi} tidak memiliki ID_Sumber yang valid.`,
        recommendation: 'Lengkapi ID_Sumber rujukan untuk integritas audit trail.',
      });
    });
    checks.push({
      checkNumber: 1,
      title: 'Kelengkapan ID_Sumber Buku Kas',
      status: 'FAIL',
      details: `Ditemukan ${noSourceId.length} transaksi tanpa ID_Sumber.`,
    });
  } else {
    checks.push({
      checkNumber: 1,
      title: 'Kelengkapan ID_Sumber Buku Kas',
      status: 'PASS',
      details: 'Semua transaksi buku kas memiliki ID_Sumber yang terdefinisi.',
    });
  }

  // Check 2: ID Sumber tidak ditemukan pada tabel rujukan
  let orphanReferences = 0;
  validTx.forEach((tx) => {
    if (tx.Sumber_Transaksi === 'IURAN' && !iuranMap.has(tx.ID_Sumber)) {
      orphanReferences++;
      anomalies.push({
        id: `ANOMALY_2_${tx.ID_Transaksi}`,
        type: 'ERROR',
        category: 'ORPHAN_REFERENCE',
        transactionId: tx.ID_Transaksi,
        referenceId: tx.ID_Sumber,
        description: `Transaksi Kas ${tx.ID_Transaksi} mereferensikan Iuran ${tx.ID_Sumber} yang tidak ditemukan.`,
        recommendation: 'Periksa data Iuran atau batalkan transaksi kas yang tidak memiliki rujukan.',
      });
    } else if (tx.Sumber_Transaksi === 'SANTUNAN' && !santunanMap.has(tx.ID_Sumber)) {
      orphanReferences++;
      anomalies.push({
        id: `ANOMALY_2_${tx.ID_Transaksi}`,
        type: 'ERROR',
        category: 'ORPHAN_REFERENCE',
        transactionId: tx.ID_Transaksi,
        referenceId: tx.ID_Sumber,
        description: `Transaksi Kas ${tx.ID_Transaksi} mereferensikan Santunan ${tx.ID_Sumber} yang tidak ditemukan.`,
        recommendation: 'Periksa data Santunan yang berelasi.',
      });
    } else if (tx.Sumber_Transaksi === 'PENGELUARAN' && !expenseMap.has(tx.ID_Sumber)) {
      orphanReferences++;
      anomalies.push({
        id: `ANOMALY_2_${tx.ID_Transaksi}`,
        type: 'ERROR',
        category: 'ORPHAN_REFERENCE',
        transactionId: tx.ID_Transaksi,
        referenceId: tx.ID_Sumber,
        description: `Transaksi Kas ${tx.ID_Transaksi} mereferensikan Pengeluaran ${tx.ID_Sumber} yang tidak ditemukan.`,
        recommendation: 'Periksa data Pengeluaran yang berelasi.',
      });
    }
  });

  checks.push({
    checkNumber: 2,
    title: 'Validitas Referensi ID Sumber (Foreign Key Check)',
    status: orphanReferences === 0 ? 'PASS' : 'FAIL',
    details: orphanReferences === 0
      ? 'Seluruh transaksi kas terhubung ke sumber data yang sah.'
      : `Ditemukan ${orphanReferences} transaksi dengan referensi sumber tidak valid.`,
  });

  // Check 3: Duplikat ID Transaksi Buku Kas
  const txIds = new Set<string>();
  let duplicateTxIds = 0;
  cashTx.forEach((tx) => {
    if (txIds.has(tx.ID_Transaksi)) {
      duplicateTxIds++;
      anomalies.push({
        id: `ANOMALY_3_${tx.ID_Transaksi}`,
        type: 'ERROR',
        category: 'DUPLICATE_TX_ID',
        transactionId: tx.ID_Transaksi,
        description: `ID Transaksi ${tx.ID_Transaksi} terduplikasi dalam Buku Kas.`,
        recommendation: 'Regenerasi ID Transaksi unik untuk baris yang terduplikasi.',
      });
    }
    txIds.add(tx.ID_Transaksi);
  });

  checks.push({
    checkNumber: 3,
    title: 'Keunikan ID Transaksi Buku Kas',
    status: duplicateTxIds === 0 ? 'PASS' : 'FAIL',
    details: duplicateTxIds === 0
      ? 'Seluruh ID Transaksi buku kas unik.'
      : `Ditemukan ${duplicateTxIds} ID Transaksi duplikat.`,
  });

  // Check 4: Duplikat Sumber Transaksi (Idempotency Collision)
  const sourceKeys = new Set<string>();
  let duplicateSources = 0;
  validTx.forEach((tx) => {
    if (['IURAN', 'SANTUNAN', 'PENGELUARAN'].includes(tx.Sumber_Transaksi) && tx.ID_Sumber) {
      const key = `${tx.Sumber_Transaksi}:${tx.ID_Sumber}`;
      if (sourceKeys.has(key)) {
        duplicateSources++;
        anomalies.push({
          id: `ANOMALY_4_${tx.ID_Transaksi}`,
          type: 'ERROR',
          category: 'DUPLICATE_SOURCE_KEY',
          transactionId: tx.ID_Transaksi,
          referenceId: tx.ID_Sumber,
          description: `Sumber transaksi ${key} tercatat lebih dari satu kali di Buku Kas Aktif.`,
          recommendation: 'Batalkan transaksi duplikat untuk menjaga keakuratan saldo.',
        });
      }
      sourceKeys.add(key);
    }
  });

  checks.push({
    checkNumber: 4,
    title: 'Pencegahan Transaksi Ganda (Idempotency Key)',
    status: duplicateSources === 0 ? 'PASS' : 'FAIL',
    details: duplicateSources === 0
      ? 'Tidak ada transaksi ganda dari sumber yang sama.'
      : `Ditemukan ${duplicateSources} tabrakan sumber transaksi.`,
  });

  // Check 5: Transaksi Kas Negatif
  const negativeAmounts = cashTx.filter((t) => (t.Kas_Masuk && t.Kas_Masuk < 0) || (t.Kas_Keluar && t.Kas_Keluar < 0));
  if (negativeAmounts.length > 0) {
    negativeAmounts.forEach((t) => {
      anomalies.push({
        id: `ANOMALY_5_${t.ID_Transaksi}`,
        type: 'ERROR',
        category: 'NEGATIVE_AMOUNT',
        transactionId: t.ID_Transaksi,
        description: `Transaksi ${t.ID_Transaksi} memiliki nominal negatif.`,
        recommendation: 'Nominal transaksi kas harus selalu berupa angka positif.',
      });
    });
  }
  checks.push({
    checkNumber: 5,
    title: 'Validasi Nilai Positif Transaksi Kas',
    status: negativeAmounts.length === 0 ? 'PASS' : 'FAIL',
    details: negativeAmounts.length === 0
      ? 'Seluruh nominal transaksi kas bernilai positif.'
      : `Ditemukan ${negativeAmounts.length} transaksi dengan nominal negatif.`,
  });

  // Check 6: Nominal Nol pada Transaksi Valid
  const zeroAmounts = validTx.filter((t) => (!t.Kas_Masuk || t.Kas_Masuk === 0) && (!t.Kas_Keluar || t.Kas_Keluar === 0));
  if (zeroAmounts.length > 0) {
    zeroAmounts.forEach((t) => {
      anomalies.push({
        id: `ANOMALY_6_${t.ID_Transaksi}`,
        type: 'WARNING',
        category: 'ZERO_AMOUNT',
        transactionId: t.ID_Transaksi,
        description: `Transaksi ${t.ID_Transaksi} memiliki Kas Masuk dan Kas Keluar bernilai 0.`,
        recommendation: 'Periksa transaksi kas nominal nol.',
      });
    });
  }
  checks.push({
    checkNumber: 6,
    title: 'Verifikasi Nominal Non-Zero Transaksi Aktif',
    status: zeroAmounts.length === 0 ? 'PASS' : 'FAIL',
    details: zeroAmounts.length === 0
      ? 'Seluruh transaksi aktif memiliki nominal mutasi valid.'
      : `Ditemukan ${zeroAmounts.length} transaksi aktif dengan nominal nol.`,
  });

  // Check 7: Status Transaksi Valid (ENUM check)
  const invalidStatus = cashTx.filter((t) => !['VALID', 'DIBATALKAN'].includes(t.Status));
  if (invalidStatus.length > 0) {
    invalidStatus.forEach((t) => {
      anomalies.push({
        id: `ANOMALY_7_${t.ID_Transaksi}`,
        type: 'ERROR',
        category: 'INVALID_STATUS',
        transactionId: t.ID_Transaksi,
        description: `Transaksi ${t.ID_Transaksi} memiliki status tidak dikenal: ${t.Status}.`,
        recommendation: 'Perbaiki status menjadi VALID atau DIBATALKAN.',
      });
    });
  }
  checks.push({
    checkNumber: 7,
    title: 'Konsistensi Status ENUM Buku Kas',
    status: invalidStatus.length === 0 ? 'PASS' : 'FAIL',
    details: invalidStatus.length === 0
      ? 'Seluruh transaksi berstatus VALID atau DIBATALKAN.'
      : `Ditemukan ${invalidStatus.length} status tidak valid.`,
  });

  // Check 8: Saldo Berjalan (Running Balance) Konsistensi
  let runningCalc = 0;
  let runningMismatch = 0;
  for (let i = 0; i < cashTx.length; i++) {
    const tx = cashTx[i];
    if (tx.Status === 'VALID') {
      runningCalc += (tx.Kas_Masuk || 0) - (tx.Kas_Keluar || 0);
      if (tx.Saldo !== runningCalc) {
        runningMismatch++;
        anomalies.push({
          id: `ANOMALY_8_${tx.ID_Transaksi}`,
          type: 'WARNING',
          category: 'RUNNING_BALANCE_MISMATCH',
          transactionId: tx.ID_Transaksi,
          description: `Saldo berjalan pada transaksi ${tx.ID_Transaksi} tercatat Rp ${tx.Saldo}, seharusnya Rp ${runningCalc}.`,
          recommendation: 'Jalankan sinkronisasi dan rekalkulasi saldo berjalan.',
        });
      }
    }
  }
  checks.push({
    checkNumber: 8,
    title: 'Konsistensi Saldo Berjalan (Running Balance)',
    status: runningMismatch === 0 ? 'PASS' : 'FAIL',
    details: runningMismatch === 0
      ? 'Saldo berjalan di setiap baris transaksi konsisten dan akurat.'
      : `Ditemukan ${runningMismatch} ketidaksesuaian saldo berjalan.`,
  });

  // Check 9: Kas Masuk Tanpa Transaksi Sumber
  checks.push({
    checkNumber: 9,
    title: 'Kesesuaian Total Kas Masuk vs Modul Sumber',
    status: iuranDiff === 0 ? 'PASS' : 'FAIL',
    details: iuranDiff === 0
      ? 'Total penerimaan iuran di Buku Kas sama persis dengan total Iuran Lunas.'
      : `Terdapat selisih Rp ${(iuranDiff || 0).toLocaleString('id-ID')} antara Iuran dan Buku Kas.`,
  });

  // Check 10: Kas Keluar Tanpa Transaksi Sumber
  const totalExpenseDiscrepancy = santunanDiff + expenseDiff;
  checks.push({
    checkNumber: 10,
    title: 'Kesesuaian Total Kas Keluar vs Modul Sumber',
    status: totalExpenseDiscrepancy === 0 ? 'PASS' : 'FAIL',
    details: totalExpenseDiscrepancy === 0
      ? 'Total pengeluaran & santunan di Buku Kas sama persis dengan pencairan riil.'
      : `Terdapat selisih Rp ${(totalExpenseDiscrepancy || 0).toLocaleString('id-ID')} pada Kas Keluar.`,
  });

  // Overall Reconciliation Status
  const hasCriticalFailures =
    ledgerDifference > 0 ||
    orphanReferences > 0 ||
    duplicateTxIds > 0 ||
    duplicateSources > 0 ||
    negativeAmounts.length > 0 ||
    iuranDiff > 0 ||
    santunanDiff > 0 ||
    expenseDiff > 0;

  const reconciliationStatus = hasCriticalFailures ? 'PERLU PEMERIKSAAN' : 'VALID';

  const passedChecksCount = checks.filter((c) => c.status === 'PASS').length;

  return {
    timestamp: new Date().toISOString(),
    reconciliationStatus,
    ledger: {
      totalKasMasuk: calculatedMasuk,
      totalKasKeluar: calculatedKeluar,
      saldoBukuKas: currentSaldo,
      expectedSaldo,
      selisih: ledgerDifference,
      totalTransaksiValid: countValid,
      totalTransaksiDibatalkan: countDibatalkan,
    },
    sourcesBreakdown,
    comparisons,
    integrityChecks: {
      passed: !hasCriticalFailures,
      checksCount: checks.length,
      passedCount: passedChecksCount,
      failedCount: checks.length - passedChecksCount,
      checks,
    },
    anomalies,
  };
}
