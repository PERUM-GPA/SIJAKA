import React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import {
  FinancialSummaryReportData,
  CashbookReportData,
  IuranReportData,
  SantunanReportData,
  PengeluaranReportData,
  ReconciliationReportData,
  SafeUser,
} from '../../types/index.ts';

interface PrintReportViewProps {
  type: 'summary' | 'cashbook' | 'iuran' | 'santunan' | 'pengeluaran' | 'reconciliation';
  currentUser: SafeUser | null;
  summaryData?: FinancialSummaryReportData | null;
  cashbookData?: CashbookReportData | null;
  iuranData?: IuranReportData | null;
  santunanData?: SantunanReportData | null;
  pengeluaranData?: PengeluaranReportData | null;
  reconciliationData?: ReconciliationReportData | null;
  onBack: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  type,
  currentUser,
  summaryData,
  cashbookData,
  iuranData,
  santunanData,
  pengeluaranData,
  reconciliationData,
  onBack,
}) => {
  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getReportTitle = () => {
    switch (type) {
      case 'summary':
        return 'LAPORAN REKAPITULASI KEUANGAN';
      case 'cashbook':
        return 'LAPORAN MUTASI BUKU KAS';
      case 'iuran':
        return 'LAPORAN REKAP PENERIMAAN IURAN KEMATIAN';
      case 'santunan':
        return 'LAPORAN REKAP PENCAIRAN SANTUNAN KEMATIAN';
      case 'pengeluaran':
        return 'LAPORAN REKAP PENGELUARAN OPERASIONAL';
      case 'reconciliation':
        return 'LAPORAN REKONSILIASI & INTEGRITAS KAS';
      default:
        return 'LAPORAN KEUANGAN SIJAKA';
    }
  };

  const periodLabel =
    summaryData?.periodInfo.label ||
    cashbookData?.periodInfo.label ||
    iuranData?.periodInfo.label ||
    santunanData?.periodInfo.label ||
    pengeluaranData?.periodInfo.label ||
    'Semua Periode';

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex items-center justify-between print:hidden bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Laporan
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Pratinjau Cetak Siap</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Sekarang (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div id="print-sheet-content" className="bg-white p-8 sm:p-12 rounded-xl border border-gray-200 shadow-sm print:p-0 print:border-none print:shadow-none font-sans text-gray-900 space-y-6">
        {/* Kop Surat Header */}
        <div className="border-b-2 border-gray-900 pb-4 text-center">
          <h2 className="text-xl font-extrabold uppercase tracking-wide text-gray-900">
            JAMAAH TAHLIL AR ROHMAN
          </h2>
          <p className="text-sm font-semibold text-gray-700">
            RUKUN TETANGGA 06 • RUKUN TETANGGA 07 • RUKUN TETANGGA 10
          </p>
          <p className="text-xs text-gray-600">
            Perum Graha Permata Asri (GPA) Ngijo, Karangploso, Malang, Jawa Timur
          </p>
          <div className="mt-2 inline-block px-3 py-0.5 bg-emerald-100 text-emerald-900 text-xs font-bold rounded">
            SIJAKA — Sistem Informasi Jaminan Kematian
          </div>
        </div>

        {/* Report Metadata */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-2 pt-2 border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 uppercase">{getReportTitle()}</h3>
            <p className="text-gray-600 mt-0.5">
              <span className="font-semibold">Periode Laporan:</span> {periodLabel}
            </p>
          </div>
          <div className="sm:text-right text-gray-600 text-[11px]">
            <p><span className="font-semibold">Dicetak Pada:</span> {printDate}</p>
            <p><span className="font-semibold">Petugas:</span> {currentUser?.Nama || 'Admin'} ({currentUser?.Role || 'PENGURUS'})</p>
          </div>
        </div>

        {/* 1. SUMMARY PRINT VIEW */}
        {type === 'summary' && summaryData && (
          <div className="space-y-6">
            {/* Core Figures Box */}
            <div className="grid grid-cols-3 gap-4 border border-gray-300 rounded-lg p-4 bg-gray-50/60 text-center">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Total Kas Masuk</p>
                <p className="text-lg font-bold text-emerald-800 mt-1">{formatRupiah(summaryData.totalKasMasukPeriode)}</p>
                <span className="text-[10px] text-gray-500">{summaryData.jumlahTransaksi.iuran} transaksi</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Total Kas Keluar</p>
                <p className="text-lg font-bold text-red-800 mt-1">{formatRupiah(summaryData.totalKasKeluarPeriode)}</p>
                <span className="text-[10px] text-gray-500">
                  {summaryData.jumlahTransaksi.santunan + summaryData.jumlahTransaksi.pengeluaran} transaksi
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Saldo Kas Riil (Buku Kas)</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatRupiah(summaryData.saldoKasSekarang)}</p>
                <span className="text-[10px] text-emerald-700 font-medium">Single Source of Truth</span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase mb-2">Rincian Per Komponen Keuangan</h4>
              <table className="w-full text-xs text-left border border-gray-300">
                <thead className="bg-gray-100 font-semibold border-b border-gray-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-gray-300">Komponen</th>
                    <th className="py-2 px-3 border-r border-gray-300 text-right">Jumlah Transaksi</th>
                    <th className="py-2 px-3 text-right">Total Nominal (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3 border-r border-gray-300 font-medium">Penerimaan Iuran Anggota (1 KK = Rp {(summaryData.settings?.iuranBulanan || 10000).toLocaleString('id-ID')})</td>
                    <td className="py-2 px-3 border-r border-gray-300 text-right">{summaryData.jumlahTransaksi.iuran}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatRupiah(summaryData.totalIuranPeriode)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 border-r border-gray-300 font-medium">Pencairan Santunan Kematian (Rp {(summaryData.settings?.nominalSantunan || 600000).toLocaleString('id-ID')}/jiwa)</td>
                    <td className="py-2 px-3 border-r border-gray-300 text-right">{summaryData.jumlahTransaksi.santunan}</td>
                    <td className="py-2 px-3 text-right font-semibold text-red-700">{formatRupiah(summaryData.totalSantunanPeriode)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 border-r border-gray-300 font-medium">Pengeluaran Operasional & Jamaah</td>
                    <td className="py-2 px-3 border-r border-gray-300 text-right">{summaryData.jumlahTransaksi.pengeluaran}</td>
                    <td className="py-2 px-3 text-right font-semibold text-red-700">{formatRupiah(summaryData.totalPengeluaranPeriode)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <tr>
                    <td className="py-2 px-3 border-r border-gray-300">Surplus / Defisit Arus Kas Periode</td>
                    <td className="py-2 px-3 border-r border-gray-300 text-right">{summaryData.jumlahTransaksi.total}</td>
                    <td className={`py-2 px-3 text-right ${summaryData.surplusDefisitPeriode >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                      {summaryData.surplusDefisitPeriode >= 0 ? '+' : ''}{formatRupiah(summaryData.surplusDefisitPeriode)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* RT Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase mb-2">Rekapitulasi Kas Berdasarkan RT</h4>
              <table className="w-full text-xs text-left border border-gray-300">
                <thead className="bg-gray-100 font-semibold border-b border-gray-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-gray-300">Wilayah RT</th>
                    <th className="py-2 px-3 border-r border-gray-300 text-center">Jumlah KK Aktif</th>
                    <th className="py-2 px-3 border-r border-gray-300 text-right">Kas Masuk (IDR)</th>
                    <th className="py-2 px-3 text-right">Kas Keluar (IDR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(['06', '07', '10'] as const).map((rt) => (
                    <tr key={rt}>
                      <td className="py-2 px-3 border-r border-gray-300 font-medium">RT {rt}</td>
                      <td className="py-2 px-3 border-r border-gray-300 text-center">{summaryData.rtBreakdown[rt]?.kkCount || 0} KK</td>
                      <td className="py-2 px-3 border-r border-gray-300 text-right font-medium text-emerald-700">
                        {formatRupiah(summaryData.rtBreakdown[rt]?.masuk || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-red-700">
                        {formatRupiah(summaryData.rtBreakdown[rt]?.keluar || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. BUKU KAS PRINT VIEW */}
        {type === 'cashbook' && cashbookData && (
          <div className="space-y-4">
            <table className="w-full text-xs text-left border border-gray-300">
              <thead className="bg-gray-100 font-semibold border-b border-gray-300">
                <tr>
                  <th className="py-2 px-2.5 border-r border-gray-300">Tanggal</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">ID Transaksi</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Sumber</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Uraian Transaksi</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Masuk</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Keluar</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Saldo</th>
                  <th className="py-2 px-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cashbookData.items.map((tx) => (
                  <tr key={tx.ID_Transaksi} className={tx.Status === 'DIBATALKAN' ? 'line-through text-gray-400' : ''}>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 whitespace-nowrap">{tx.Tanggal}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono whitespace-nowrap">{tx.ID_Transaksi}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{tx.Sumber_Transaksi}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{tx.Uraian}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-right">{tx.Kas_Masuk ? formatRupiah(tx.Kas_Masuk) : '-'}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-right">{tx.Kas_Keluar ? formatRupiah(tx.Kas_Keluar) : '-'}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-right font-medium">{formatRupiah(tx.Saldo)}</td>
                    <td className="py-1.5 px-2.5 text-center text-[10px]">{tx.Status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                <tr>
                  <td colSpan={4} className="py-2 px-2.5 border-r border-gray-300 text-right">TOTAL TRANSAKSI VALID:</td>
                  <td className="py-2 px-2.5 border-r border-gray-300 text-right text-emerald-800">{formatRupiah(cashbookData.summary.totalMasuk)}</td>
                  <td className="py-2 px-2.5 border-r border-gray-300 text-right text-red-800">{formatRupiah(cashbookData.summary.totalKeluar)}</td>
                  <td className="py-2 px-2.5 border-r border-gray-300 text-right">{formatRupiah(cashbookData.summary.saldoKasSaatIni)}</td>
                  <td className="py-2 px-2.5 text-center">{cashbookData.summary.countValid} Valid</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 3. IURAN PRINT VIEW */}
        {type === 'iuran' && iuranData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded border border-gray-200 text-center text-xs">
              <div><span className="text-gray-500">Total Penerimaan:</span><p className="font-bold text-gray-900">{formatRupiah(iuranData.summary.totalNominal)}</p></div>
              <div><span className="text-gray-500">KK Sudah Bayar:</span><p className="font-bold text-emerald-700">{iuranData.summary.kkSudahBayar} KK</p></div>
              <div><span className="text-gray-500">KK Belum Bayar:</span><p className="font-bold text-amber-700">{iuranData.summary.kkBelumBayar} KK</p></div>
              <div><span className="text-gray-500">Tingkat Kepatuhan:</span><p className="font-bold text-blue-700">{iuranData.summary.persentaseKepatuhan}%</p></div>
            </div>

            <table className="w-full text-xs text-left border border-gray-300">
              <thead className="bg-gray-100 font-semibold border-b border-gray-300">
                <tr>
                  <th className="py-2 px-2.5 border-r border-gray-300">ID Iuran</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Nama Kepala Keluarga</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-center">RT</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Periode</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Tanggal Bayar</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Nominal</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-center">Status</th>
                  <th className="py-2 px-2.5">No Kuitansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {iuranData.items.map((i) => (
                  <tr key={i.ID_Iuran}>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">{i.ID_Iuran}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-medium">{i.namaKepalaKeluarga}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-center">RT {i.rt}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{i.Periode_Bulan}/{i.Periode_Tahun}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{i.Tanggal_Bayar || '-'}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-right font-medium">{formatRupiah(i.Nominal)}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-center">{i.Status}</td>
                    <td className="py-1.5 px-2.5 font-mono text-[11px]">{i.Nomor_Kuitansi || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                <tr>
                  <td colSpan={5} className="py-2 px-2.5 border-r border-gray-300 text-right">TOTAL PENERIMAAN IURAN:</td>
                  <td className="py-2 px-2.5 border-r border-gray-300 text-right text-emerald-800">{formatRupiah(iuranData.summary.totalNominal)}</td>
                  <td colSpan={2} className="py-2 px-2.5 text-center">{iuranData.summary.totalTransaksi} Transaksi</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 4. SANTUNAN PRINT VIEW */}
        {type === 'santunan' && santunanData && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs flex justify-between">
              <span><strong className="text-gray-900">Total Santunan Dicairkan:</strong> {formatRupiah(santunanData.summary.totalNominalDicairkan)}</span>
              <span><strong className="text-gray-900">Jumlah Kasus Dicairkan:</strong> {santunanData.summary.totalDicairkan} Kasus</span>
              <span><strong className="text-gray-900">Standar / Jiwa:</strong> {formatRupiah(santunanData.summary.standardNominal)}</span>
            </div>

            <table className="w-full text-xs text-left border border-gray-300">
              <thead className="bg-gray-100 font-semibold border-b border-gray-300">
                <tr>
                  <th className="py-2 px-2.5 border-r border-gray-300">ID Santunan</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Nama Almarhum</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-center">RT</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Penerima & Hubungan</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Nominal</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Tgl Cair</th>
                  <th className="py-2 px-2.5">No Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {santunanData.items.map((s) => (
                  <tr key={s.ID_Santunan}>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">{s.ID_Santunan}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-medium">{s.namaAnggota || '-'}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-center">RT {s.rt || '-'}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{s.Nama_Penerima} ({s.Hubungan_Penerima})</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-right font-medium text-rose-800">{formatRupiah(s.Nominal_Santunan)}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{s.Tanggal_Pencairan || 'Menunggu'}</td>
                    <td className="py-1.5 px-2.5 font-mono text-[11px]">{s.Nomor_Bukti || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PENGELUARAN PRINT VIEW */}
        {type === 'pengeluaran' && pengeluaranData && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs flex justify-between">
              <span><strong className="text-gray-900">Total Pengeluaran Dibayar:</strong> {formatRupiah(pengeluaranData.summary.totalNominalDibayar)}</span>
              <span><strong className="text-gray-900">Total Transaksi Dibayar:</strong> {pengeluaranData.summary.totalDibayarkan} Item</span>
            </div>

            <table className="w-full text-xs text-left border border-gray-300">
              <thead className="bg-gray-100 font-semibold border-b border-gray-300">
                <tr>
                  <th className="py-2 px-2.5 border-r border-gray-300">Tanggal</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">ID Pengeluaran</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Kategori</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Uraian</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Nominal</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-center">Status</th>
                  <th className="py-2 px-2.5">No Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pengeluaranData.items.map((e) => (
                  <tr key={e.ID_Pengeluaran}>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{e.Tanggal_Pengeluaran}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono">{e.ID_Pengeluaran}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{e.Kategori}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300">{e.Uraian}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-right font-medium text-red-800">{formatRupiah(e.Nominal)}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 text-center">{e.Status}</td>
                    <td className="py-1.5 px-2.5 font-mono text-[11px]">{e.Nomor_Bukti || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. RECONCILIATION PRINT VIEW */}
        {type === 'reconciliation' && reconciliationData && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded border border-gray-300 text-xs space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span><strong>Status Rekonsiliasi:</strong></span>
                <span className="font-bold text-emerald-800">{reconciliationData.reconciliationStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Kas Masuk Valid:</span>
                <span>{formatRupiah(reconciliationData.ledger.totalKasMasuk)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Kas Keluar Valid:</span>
                <span>{formatRupiah(reconciliationData.ledger.totalKasKeluar)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-sm">
                <span>Saldo Akhir Buku Kas:</span>
                <span>{formatRupiah(reconciliationData.ledger.saldoBukuKas)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Selisih:</span>
                <span>{formatRupiah(reconciliationData.ledger.selisih)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase mb-2">10-Point Checklist Integritas Kas</h4>
              <table className="w-full text-xs text-left border border-gray-300">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="py-1.5 px-2 border-r border-gray-300">No</th>
                    <th className="py-1.5 px-2 border-r border-gray-300">Parameter Uji Integritas</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center">Status</th>
                    <th className="py-1.5 px-2">Catatan Hasil Pemeriksaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reconciliationData.integrityChecks.checks.map((c) => (
                    <tr key={c.checkNumber}>
                      <td className="py-1 px-2 border-r border-gray-300 text-center font-bold">{c.checkNumber}</td>
                      <td className="py-1 px-2 border-r border-gray-300 font-medium">{c.title}</td>
                      <td className="py-1 px-2 border-r border-gray-300 text-center font-bold text-emerald-800">{c.status}</td>
                      <td className="py-1 px-2 text-[11px] text-gray-600">{c.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lembar Tanda Tangan Resmi */}
        <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs break-inside-avoid">
          <div>
            <p className="font-semibold text-gray-800">Mengetahui,</p>
            <p className="text-gray-600">Ketua Jamaah Tahlil</p>
            <div className="h-16"></div>
            <p className="font-bold text-gray-900 border-t border-gray-400 pt-1 inline-block min-w-[120px]">
              ( Bpk. Sumardi )
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-800">Diverifikasi Oleh,</p>
            <p className="text-gray-600">Bendahara</p>
            <div className="h-16"></div>
            <p className="font-bold text-gray-900 border-t border-gray-400 pt-1 inline-block min-w-[120px]">
              ( Bpk. H. Rahmat )
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-800">Malang, {new Date().toLocaleDateString('id-ID')}</p>
            <p className="text-gray-600">Petugas Operator</p>
            <div className="h-16"></div>
            <p className="font-bold text-gray-900 border-t border-gray-400 pt-1 inline-block min-w-[120px]">
              ( {currentUser?.Nama || 'Petugas SIJAKA'} )
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-6 border-t border-gray-200 text-center text-[10px] text-gray-500">
          Dokumen laporan ini dicetak secara sah dan otomatis melalui Sistem Informasi Jaminan Kematian (SIJAKA) Jamaah Tahlil Ar Rohman Perum GPA Ngijo.
        </div>
      </div>
    </div>
  );
};
