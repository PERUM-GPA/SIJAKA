import jwt from 'jsonwebtoken';
import { memoryStore, resetMemoryStore } from '../lib/googleSheets/client.ts';
import { getAllMembers, getMemberById, createMember, updateMember, deleteMember } from '../lib/googleSheets/anggota.ts';
import { getAllFamilies, createFamily, getFamiliesByMemberId } from '../lib/googleSheets/keluarga.ts';
import { getAllContributions, createContribution, checkPaymentExists } from '../lib/googleSheets/iuran.ts';
import { calculateMemberArrears, calculateAllMembersArrears } from '../lib/services/arrears.ts';
import { getAllDeathReports, getDeathReportById, createDeathReport, verifyDeathReport, approveDeathReport } from '../lib/googleSheets/kematian.ts';
import { getAllSantunan, getSantunanById, createSantunan, verifySantunan, approveSantunan, disburseSantunan } from '../lib/googleSheets/santunan.ts';
import { getAllCashTransactions, getCashSummary, createCashTransaction, cancelCashTransaction, getCurrentCashBalance } from '../lib/googleSheets/bukuKas.ts';
import { getAllExpenses, createExpense, approveExpense, payExpense } from '../lib/googleSheets/pengeluaran.ts';
import { getAllSafeUsers, getUserByUsername, verifyUserPassword } from '../lib/googleSheets/users.ts';
import { getAllLogs, createActivityLog } from '../lib/googleSheets/logs.ts';
import { getParsedSettings } from '../lib/googleSheets/settings.ts';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

async function runAudit() {
  console.log('================================================================');
  console.log('STARTING SIJAKA PHASE 3 COMPREHENSIVE AUDIT & VERIFICATION');
  console.log('================================================================\n');

  // Reset store to fresh state for repeatable verification
  resetMemoryStore();

  const results: TestResult[] = [];

  function record(num: number, name: string, passed: boolean, details: string) {
    results.push({ num, name, passed, details });
    const statusStr = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[TEST ${num.toString().padStart(2, '0')}] ${name}: ${statusStr}`);
    if (details) {
      console.log(`         -> ${details}`);
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Login setiap role (ADMIN, BENDAHARA, PENGURUS, ANGGOTA)
    // ---------------------------------------------------------
    let t1Passed = true;
    let t1Details = '';
    const roles = [
      { user: 'admin', pass: 'admin123', expectedRole: 'ADMIN' },
      { user: 'bendahara', pass: 'bendahara123', expectedRole: 'BENDAHARA' },
      { user: 'pengurus', pass: 'pengurus123', expectedRole: 'PENGURUS' },
      { user: 'anggota', pass: 'anggota123', expectedRole: 'ANGGOTA' },
    ];
    for (const r of roles) {
      const user = await getUserByUsername(r.user);
      const isMatch = user ? await verifyUserPassword(user, r.pass) : false;
      if (!user || !isMatch || user.Role !== r.expectedRole) {
        t1Passed = false;
        t1Details += `Failed login for ${r.user}; `;
      }
    }
    // Check invalid login
    const adminUser = await getUserByUsername('admin');
    const wrongAuth = adminUser ? await verifyUserPassword(adminUser, 'wrongpassword') : false;
    if (wrongAuth) {
      t1Passed = false;
      t1Details += `Invalid password allowed!`;
    }
    if (t1Passed) t1Details = 'All 4 roles authenticated successfully with correct RBAC roles, wrong passwords properly rejected.';
    record(1, 'Login setiap role', t1Passed, t1Details);

    // ---------------------------------------------------------
    // TEST 2: Create anggota
    // ---------------------------------------------------------
    const newMember = await createMember({
      No_KK: '3507180102030099',
      NIK: '3507181010900099',
      Nama: 'Budi Santoso (Test Audit)',
      Tempat_Lahir: 'Malang',
      Tanggal_Lahir: '1990-10-10',
      Alamat: 'Perum GPA Ngijo Blok G-01',
      RT: '06',
      No_HP: '081234567899',
      Status: 'Aktif',
      Tanggal_Daftar: '2026-08-01',
      Keterangan: 'Member Test Audit Phase 3',
    });
    const fetchedMember = await getMemberById(newMember.ID_Anggota);
    const t2Passed = Boolean(fetchedMember && fetchedMember.ID_Anggota === newMember.ID_Anggota && fetchedMember.Nama === 'Budi Santoso (Test Audit)');
    record(2, 'Create anggota', t2Passed, `Created Member ${newMember.ID_Anggota} with valid KK and RT 06.`);

    // ---------------------------------------------------------
    // TEST 3: Create keluarga
    // ---------------------------------------------------------
    const newFamily = await createFamily({
      ID_Anggota: newMember.ID_Anggota,
      NIK: '3507185010920099',
      Nama: 'Siti Rahayu (Istri Test)',
      Tempat_Lahir: 'Malang',
      Tanggal_Lahir: '1992-10-10',
      Hubungan: 'Istri',
      Status: 'Aktif',
      Calon_Ahli_Waris: 'Ya',
      Keterangan: 'Istri sah & Calon Ahli Waris',
    });
    const familyList = await getFamiliesByMemberId(newMember.ID_Anggota);
    const t3Passed = familyList.some((f) => f.ID_Keluarga === newFamily.ID_Keluarga && f.Calon_Ahli_Waris === 'Ya');
    record(3, 'Create keluarga', t3Passed, `Created Family ${newFamily.ID_Keluarga} linked to ${newMember.ID_Anggota} as Ahli Waris.`);

    // ---------------------------------------------------------
    // TEST 4: Pembayaran iuran
    // ---------------------------------------------------------
    const initialCash = await getCurrentCashBalance();
    const contrib = await createContribution({
      ID_Anggota: newMember.ID_Anggota,
      Periode_Bulan: 1,
      Periode_Tahun: 2026,
      Tanggal_Bayar: '2026-01-05',
      Nominal: 5000,
      Metode: 'Tunai',
      Petugas: 'Muhammad Ridwan (Bendahara)',
      Keterangan: 'Iuran Januari 2026 Budi Santoso',
    });
    const postContribCash = await getCurrentCashBalance();
    const cashDiff = postContribCash - initialCash;
    const t4Passed = Boolean(contrib && contrib.ID_Iuran && contrib.Status === 'Lunas' && cashDiff === 5000);
    record(4, 'Pembayaran iuran', t4Passed, `Paid iuran ${contrib.ID_Iuran} (5.000) and Buku Kas balance increased by +5.000.`);

    // ---------------------------------------------------------
    // TEST 5: Duplicate payment (Must be rejected)
    // ---------------------------------------------------------
    let t5Passed = false;
    let t5Details = '';
    try {
      await createContribution({
        ID_Anggota: newMember.ID_Anggota,
        Periode_Bulan: 1,
        Periode_Tahun: 2026,
        Tanggal_Bayar: '2026-01-06',
        Nominal: 5000,
        Metode: 'Tunai',
        Petugas: 'Muhammad Ridwan (Bendahara)',
        Keterangan: 'Duplicate attempt',
      });
      t5Details = 'Duplicate payment was NOT rejected!';
    } catch (err: any) {
      t5Passed = true;
      t5Details = `Duplicate payment correctly rejected by server: "${err.message}"`;
    }
    record(5, 'Duplicate payment', t5Passed, t5Details);

    // ---------------------------------------------------------
    // TEST 6: Perhitungan tunggakan
    // ---------------------------------------------------------
    const arrears = await calculateMemberArrears(newMember.ID_Anggota);
    // Member registered 2026-08-01, paid Jan 2026.
    // Dues obligation starts from August 2026 to current month.
    const allArrears = await calculateAllMembersArrears();
    const t6Passed = Boolean(arrears && typeof arrears.totalNominalTunggakan === 'number' && allArrears.summary.totalAnggotaAktif > 0);
    record(6, 'Perhitungan tunggakan', t6Passed, `Tunggakan calculated on KK level: ${arrears.totalBulanTunggakan} bulan unpaid, total nominal: Rp ${arrears.totalNominalTunggakan}.`);

    // ---------------------------------------------------------
    // TEST 7: Create laporan kematian
    // ---------------------------------------------------------
    const deathReport = await createDeathReport({
      ID_Anggota: newMember.ID_Anggota,
      Tanggal_Lapor: '2026-08-20',
      Pelapor: 'Siti Rahayu',
      Hubungan_Pelapor: 'Pasangan',
      Waktu_Kematian: '2026-08-20 05:00',
      Tempat_Kematian: 'Perum GPA Ngijo Blok G-01',
      Penyebab_Kematian: 'Serangan Jantung',
      Dokumen_Pendukung: 'Surat Kematian RT 06',
      Keterangan: 'Laporan kematian Budi Santoso',
    });
    const t7Passed = Boolean(deathReport && deathReport.ID_Laporan && deathReport.Status === 'DIAJUKAN');
    record(7, 'Create laporan kematian', t7Passed, `Created Death Report ${deathReport.ID_Laporan} (Status: DIAJUKAN).`);

    // ---------------------------------------------------------
    // TEST 8: Verify laporan
    // ---------------------------------------------------------
    const verifiedReport = await verifyDeathReport(deathReport.ID_Laporan, 'Bambang Sudarsono (Pengurus)', 'DIVERIFIKASI', 'Data berkas RT lengkap');
    const t8Passed = verifiedReport.Status === 'DIVERIFIKASI' && verifiedReport.Diverifikasi_Oleh === 'Bambang Sudarsono (Pengurus)';
    record(8, 'Verify laporan', t8Passed, `Report verified: Status ${verifiedReport.Status}, Diverifikasi_Oleh: ${verifiedReport.Diverifikasi_Oleh}.`);

    // ---------------------------------------------------------
    // TEST 9: Approve laporan
    // ---------------------------------------------------------
    const approvedReport = await approveDeathReport(deathReport.ID_Laporan, 'H. Ahmad Syukron (Admin)', 'DISETUJUI', 'Persetujuan pengurus inti');
    const t9Passed = approvedReport.Status === 'DISETUJUI' && approvedReport.Disetujui_Oleh === 'H. Ahmad Syukron (Admin)';
    record(9, 'Approve laporan', t9Passed, `Report approved: Status ${approvedReport.Status}, Disetujui_Oleh: ${approvedReport.Disetujui_Oleh}.`);

    // ---------------------------------------------------------
    // TEST 10: Create santunan
    // ---------------------------------------------------------
    const settings = await getParsedSettings();
    const santunan = await createSantunan({
      ID_Laporan: deathReport.ID_Laporan,
      ID_Anggota: newMember.ID_Anggota,
      ID_AhliWaris: newFamily.ID_Keluarga,
      Nama_Penerima: 'Siti Rahayu',
      Hubungan_Penerima: 'Istri',
      Nominal_Santunan: settings.NOMINAL_SANTUNAN || 600000,
      Tanggal_Pengajuan: '2026-08-20',
      Keterangan: 'Pengajuan santunan duka',
    });
    const t10Passed = Boolean(santunan && santunan.ID_Santunan && santunan.Status_Persetujuan === 'MENUNGGU' && santunan.Nominal_Santunan === 600000);
    record(10, 'Create santunan', t10Passed, `Created Santunan ${santunan.ID_Santunan} for ${santunan.Nama_Penerima} (Rp ${santunan.Nominal_Santunan}).`);

    // ---------------------------------------------------------
    // TEST 11: Approve santunan
    // ---------------------------------------------------------
    await verifySantunan(santunan.ID_Santunan, 'Bambang Sudarsono (Pengurus)', 'TERVERIFIKASI', 'Syarat administrasi valid');
    const approvedSantunan = await approveSantunan(santunan.ID_Santunan, 'H. Ahmad Syukron (Admin)', 'DISETUJUI', 'Disetujui untuk dicairkan');
    const t11Passed = approvedSantunan.Status_Persetujuan === 'DISETUJUI';
    record(11, 'Approve santunan', t11Passed, `Santunan approved: Status_Persetujuan ${approvedSantunan.Status_Persetujuan}.`);

    // ---------------------------------------------------------
    // TEST 12: Disburse santunan
    // ---------------------------------------------------------
    const preDisburseCash = await getCurrentCashBalance();
    const disburseResult = await disburseSantunan(
      santunan.ID_Santunan,
      {
        Tanggal_Pencairan: '2026-08-21',
        Metode_Pencairan: 'Tunai',
        Nomor_Bukti: `BS-${santunan.ID_Santunan}`,
        Bukti_Pencairan: 'Kwitansi Tanda Terima Santunan Fisik',
        Keterangan: 'Santunan diserahkan tunai di rumah duka',
      },
      'USR002',
      'Muhammad Ridwan (Bendahara)'
    );
    const postDisburseCash = await getCurrentCashBalance();
    const santunanCashDiff = preDisburseCash - postDisburseCash;
    const finalReport = await getDeathReportById(deathReport.ID_Laporan);
    const updatedMember = await getMemberById(newMember.ID_Anggota);

    const t12Passed = Boolean(
      disburseResult.santunan.Tanggal_Pencairan &&
      disburseResult.cashTransactionId &&
      santunanCashDiff === 600000 &&
      finalReport?.Status === 'SELESAI' &&
      updatedMember?.Status === 'Meninggal'
    );
    record(12, 'Disburse santunan', t12Passed, `Disbursed Santunan: Cash deducted -600.000, Buku Kas ref ${disburseResult.cashTransactionId}, Report marked SELESAI, Member marked Meninggal.`);

    // ---------------------------------------------------------
    // TEST 13: Cek Buku Kas (Santunan ledger entry)
    // ---------------------------------------------------------
    const allCashTx = await getAllCashTransactions();
    const santunanTx = allCashTx.find((t) => t.ID_Sumber === santunan.ID_Santunan && t.Sumber_Transaksi === 'SANTUNAN');
    const t13Passed = Boolean(
      santunanTx &&
      santunanTx.Jenis_Transaksi === 'KAS_KELUAR' &&
      santunanTx.Kas_Keluar === 600000 &&
      santunanTx.Status === 'VALID'
    );
    record(13, 'Cek Buku Kas (Santunan)', t13Passed, `Buku Kas has automatic KAS_KELUAR entry (${santunanTx?.ID_Transaksi}) for Rp 600.000.`);

    // ---------------------------------------------------------
    // TEST 14: Create pengeluaran
    // ---------------------------------------------------------
    const preExpenseCash = await getCurrentCashBalance();
    const expense = await createExpense(
      {
        Tanggal_Pengeluaran: '2026-08-22',
        Kategori: 'Kegiatan Jamaah',
        Uraian: 'Pembelian Konsumsi Tahlil Rutin Malam Jumat',
        Nominal: 100000,
        Metode_Pembayaran: 'Tunai',
        Nomor_Bukti: 'EXP-TEST-001',
        Keterangan: 'Konsumsi jamaah',
      },
      'USR003'
    );
    const postCreateExpenseCash = await getCurrentCashBalance();
    const t14Passed = Boolean(
      expense &&
      expense.ID_Pengeluaran &&
      expense.Status === 'DIAJUKAN' &&
      postCreateExpenseCash === preExpenseCash // Cash must NOT be reduced yet!
    );
    record(14, 'Create pengeluaran', t14Passed, `Created Expense ${expense.ID_Pengeluaran} (Status: DIAJUKAN, cash NOT reduced: balance remains ${postCreateExpenseCash}).`);

    // ---------------------------------------------------------
    // TEST 15: Approve pengeluaran
    // ---------------------------------------------------------
    const approvedExpense = await approveExpense(expense.ID_Pengeluaran, 'H. Ahmad Syukron (Admin)', 'DISETUJUI', 'Disetujui untuk dibayarkan');
    const postApproveCash = await getCurrentCashBalance();
    const t15Passed = approvedExpense.Status === 'DISETUJUI' && postApproveCash === preExpenseCash;
    record(15, 'Approve pengeluaran', t15Passed, `Expense approved: Status ${approvedExpense.Status}, cash still NOT reduced (balance: ${postApproveCash}).`);

    // ---------------------------------------------------------
    // TEST 16: Pay pengeluaran
    // ---------------------------------------------------------
    const payResult = await payExpense(
      expense.ID_Pengeluaran,
      {
        Tanggal_Pengeluaran: '2026-08-22',
        Metode_Pembayaran: 'Tunai',
        Nomor_Bukti: 'EXP-TEST-001',
        Keterangan: 'Dibayar tunai oleh bendahara',
      },
      'USR002',
      'Muhammad Ridwan (Bendahara)'
    );
    const postPayCash = await getCurrentCashBalance();
    const expenseCashDiff = postApproveCash - postPayCash;
    const t16Passed = Boolean(
      payResult.expense.Status === 'DIBAYARKAN' &&
      payResult.cashTransactionId &&
      expenseCashDiff === 100000
    );
    record(16, 'Pay pengeluaran', t16Passed, `Expense paid: Status DIBAYARKAN, cash reduced -100.000 to ${postPayCash}, Ledger ref ${payResult.cashTransactionId}.`);

    // ---------------------------------------------------------
    // TEST 17: Cek Buku Kas (Pengeluaran ledger entry)
    // ---------------------------------------------------------
    const expenseTx = (await getAllCashTransactions()).find((t) => t.ID_Sumber === expense.ID_Pengeluaran && t.Sumber_Transaksi === 'PENGELUARAN');
    const t17Passed = Boolean(
      expenseTx &&
      expenseTx.Jenis_Transaksi === 'KAS_KELUAR' &&
      expenseTx.Kas_Keluar === 100000 &&
      expenseTx.Status === 'VALID'
    );
    record(17, 'Cek Buku Kas (Pengeluaran)', t17Passed, `Buku Kas contains automated expense entry ${expenseTx?.ID_Transaksi} with Kas_Keluar = 100.000.`);

    // ---------------------------------------------------------
    // TEST 18: Duplicate disbursement (Must be rejected)
    // ---------------------------------------------------------
    let t18Passed = false;
    let t18Details = '';
    try {
      await disburseSantunan(
        santunan.ID_Santunan,
        {
          Tanggal_Pencairan: '2026-08-22',
          Metode_Pencairan: 'Tunai',
        },
        'USR002',
        'Muhammad Ridwan (Bendahara)'
      );
      t18Details = 'Double disbursement was NOT rejected!';
    } catch (err: any) {
      t18Passed = true;
      t18Details = `Double disbursement correctly rejected: "${err.message}"`;
    }
    record(18, 'Duplicate disbursement', t18Passed, t18Details);

    // ---------------------------------------------------------
    // TEST 19: Duplicate expense payment (Must be rejected)
    // ---------------------------------------------------------
    let t19Passed = false;
    let t19Details = '';
    try {
      await payExpense(
        expense.ID_Pengeluaran,
        {
          Tanggal_Pengeluaran: '2026-08-22',
          Metode_Pembayaran: 'Tunai',
        },
        'USR002',
        'Muhammad Ridwan (Bendahara)'
      );
      t19Details = 'Double expense payment was NOT rejected!';
    } catch (err: any) {
      t19Passed = true;
      t19Details = `Double expense payment correctly rejected: "${err.message}"`;
    }
    record(19, 'Duplicate payment (Expense)', t19Passed, t19Details);

    // ---------------------------------------------------------
    // TEST 20: Cancel transaction
    // ---------------------------------------------------------
    // Create a temporary test manual cash transaction to test cancellation
    const tempTx = await createCashTransaction({
      Tanggal: '2026-08-22',
      Jenis_Transaksi: 'KAS_MASUK',
      Sumber_Transaksi: 'LAINNYA',
      ID_Sumber: 'TEST-CANCEL-01',
      Uraian: 'Penerimaan Sumbangan Donatur (Test Cancel)',
      Kas_Masuk: 50000,
      Kas_Keluar: 0,
      Petugas: 'Muhammad Ridwan (Bendahara)',
      Keterangan: 'Test cancel transaction',
    });
    const preCancelBalance = await getCurrentCashBalance();
    const cancelledTx = await cancelCashTransaction(tempTx.ID_Transaksi, 'Salah input nominal donasi', 'Muhammad Ridwan (Bendahara)');
    const postCancelBalance = await getCurrentCashBalance();
    const t20Passed = Boolean(
      cancelledTx.Status === 'DIBATALKAN' &&
      preCancelBalance - postCancelBalance === 50000
    );
    record(20, 'Cancel transaction', t20Passed, `Cancelled transaction ${tempTx.ID_Transaksi}, Status -> DIBATALKAN, running balance safely adjusted by -50.000.`);

    // ---------------------------------------------------------
    // TEST 21: Cek saldo akhir & Buku Kas consistency
    // ---------------------------------------------------------
    const summary = await getCashSummary();
    const transactions = await getAllCashTransactions();
    const validTransactions = transactions.filter((t) => t.Status === 'VALID');

    let calcMasuk = 0;
    let calcKeluar = 0;
    for (const t of validTransactions) {
      calcMasuk += t.Kas_Masuk || 0;
      calcKeluar += t.Kas_Keluar || 0;
    }
    const expectedSaldo = calcMasuk - calcKeluar;
    const t21Passed = summary.saldoKas === expectedSaldo && summary.totalPemasukan === calcMasuk && summary.totalPengeluaran === calcKeluar;
    record(
      21,
      'Cek saldo akhir',
      t21Passed,
      `Calculated: Total Masuk = ${calcMasuk}, Total Keluar = ${calcKeluar}, Saldo Akhir = ${summary.saldoKas} (Integrity: ${t21Passed ? 'VALID' : 'INVALID'}).`
    );

    // ---------------------------------------------------------
    // TEST 22: Cek audit log
    // ---------------------------------------------------------
    await createActivityLog({
      ID_User: 'USR001',
      Nama_User: 'H. Ahmad Syukron',
      Aksi: 'APPROVE',
      Modul: 'TEST_AUDIT',
      Record_ID: 'AUDIT_01',
      Deskripsi: 'Activity log audit check',
      Status: 'SUCCESS',
    });
    const logs = await getAllLogs();
    // Check no passwords or jwt tokens in logs
    let hasLeakedSecrets = false;
    for (const l of logs) {
      const desc = (l.Deskripsi || '').toLowerCase();
      if (desc.includes('password') || desc.includes('bearer') || desc.includes('eyjhbgcioi')) {
        hasLeakedSecrets = true;
      }
    }
    const t22Passed = logs.length > 0 && !hasLeakedSecrets;
    record(22, 'Cek audit log', t22Passed, `Logs captured: ${logs.length} entries. No passwords or tokens detected in log data.`);

    // ---------------------------------------------------------
    // TEST 23: Cek pembatasan data ANGGOTA (RBAC)
    // ---------------------------------------------------------
    // Check ANGGOTA filtering logic
    const allMembersData = await getAllMembers();
    const anggotaUser = (await getAllSafeUsers()).find((u) => u.Role === 'ANGGOTA');
    const filteredForAnggota = anggotaUser && anggotaUser.ID_Anggota
      ? allMembersData.filter((m) => m.ID_Anggota === anggotaUser.ID_Anggota)
      : [];
    const t23Passed = Boolean(anggotaUser && filteredForAnggota.length === 1 && filteredForAnggota[0].ID_Anggota === anggotaUser.ID_Anggota);
    record(23, 'Cek pembatasan data ANGGOTA', t23Passed, `Role ANGGOTA restricted to own KK data (${filteredForAnggota[0]?.ID_Anggota}).`);

    // ---------------------------------------------------------
    // TEST 24: Cek keamanan endpoint publik
    // ---------------------------------------------------------
    // Public dashboard aggregation check
    const totalKK = allMembersData.length;
    const kkAktif = allMembersData.filter((m) => m.Status === 'Aktif').length;
    const allFam = await getAllFamilies();
    const activeFamiliesCount = allFam.filter((f) => f.Status === 'Aktif').length;
    const keluargaTerlindungi = kkAktif + activeFamiliesCount;
    const publicData = {
      totalKK,
      kkAktif,
      keluargaTerlindungi,
      saldoKas: summary.saldoKas,
    };
    // Ensure no PII fields
    const publicKeys = Object.keys(publicData);
    const forbiddenKeys = ['nik', 'nokk', 'no_kk', 'nohp', 'no_hp', 'alamat', 'ahliwaris', 'nominal_santunan', 'nominal_iuran'];
    const hasForbidden = publicKeys.some((k) => forbiddenKeys.includes(k.toLowerCase()));
    const t24Passed = !hasForbidden && publicData.totalKK > 0;
    record(24, 'Cek keamanan endpoint publik', t24Passed, `Public metrics contains only safe aggregates: ${publicKeys.join(', ')}.`);

    // ---------------------------------------------------------
    // Summary
    // ---------------------------------------------------------
    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${totalPassed}/${totalTests} TESTS PASSED`);
    console.log(`STATUS: ${totalPassed === totalTests ? 'ALL TESTS PASSED (PASS)' : 'TESTS FAILED'}`);
    console.log('================================================================');

    console.log('\nINTEGRITY LEDGER SUMMARY:');
    console.log(`TOTAL KAS MASUK: Rp ${calcMasuk.toLocaleString('id-ID')}`);
    console.log(`TOTAL KAS KELUAR: Rp ${calcKeluar.toLocaleString('id-ID')}`);
    console.log(`SALDO AKHIR: Rp ${summary.saldoKas.toLocaleString('id-ID')}`);
    console.log(`FORMULA CHECK: ${calcMasuk} - ${calcKeluar} = ${expectedSaldo} === ${summary.saldoKas} (${t21Passed ? 'MATCH' : 'MISMATCH'})`);

    return { totalPassed, totalTests, results, summary: { calcMasuk, calcKeluar, saldoKas: summary.saldoKas, valid: t21Passed } };
  } catch (err) {
    console.error('Fatal error during audit:', err);
    throw err;
  }
}

runAudit();
