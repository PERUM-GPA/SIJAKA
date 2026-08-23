import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  HeartHandshake,
  Receipt,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { FinancialSummaryReportData } from '../../types/index.ts';

interface ReportSummaryCardsProps {
  data: FinancialSummaryReportData;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ data }) => {
  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

  const isSurplus = (data.surplusDefisitPeriode ?? 0) >= 0;

  return (
    <div id="report-summary-cards" className="space-y-4">
      {/* Top 3 Core Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Kas Masuk */}
        <div id="card-report-kas-masuk" className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Kas Masuk (Periode)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatRupiah(data.totalKasMasukPeriode)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Dari Iuran & Penerimaan</span>
            <span className="font-medium text-emerald-700">{data.jumlahTransaksi.iuran} transaksi</span>
          </div>
        </div>

        {/* Total Kas Keluar */}
        <div id="card-report-kas-keluar" className="bg-white rounded-xl border border-red-100 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Total Kas Keluar (Periode)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatRupiah(data.totalKasKeluarPeriode)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Santunan & Operasional</span>
            <span className="font-medium text-red-700">
              {data.jumlahTransaksi.santunan + data.jumlahTransaksi.pengeluaran} transaksi
            </span>
          </div>
        </div>

        {/* Saldo Kas Riil (Single Source of Truth) */}
        <div id="card-report-saldo-kas" className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Saldo Kas Riil</p>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-700/80 text-emerald-100 uppercase tracking-tight">
                  Buku Kas (06)
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mt-1">
                {formatRupiah(data.saldoKasSekarang)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 text-emerald-200 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/80">
            <span>Arus Kas Bersih Periode:</span>
            <span className={`font-semibold ${isSurplus ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isSurplus ? '+' : ''}{formatRupiah(data.surplusDefisitPeriode)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary 4 Detailed Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Iuran Terkumpul */}
        <div id="card-report-iuran" className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Iuran Terkumpul</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.totalIuranPeriode)}</p>
            </div>
          </div>
          <div className="mt-2.5 text-xs text-gray-500 flex items-center justify-between">
            <span>{data.jumlahTransaksi.iuran} Pembayaran KK</span>
            <span className="text-teal-600 font-medium">1 KK = Rp {(data.settings?.iuranBulanan || 10000).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Santunan Dicairkan */}
        <div id="card-report-santunan" className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Santunan Dicairkan</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.totalSantunanPeriode)}</p>
            </div>
          </div>
          <div className="mt-2.5 text-xs text-gray-500 flex items-center justify-between">
            <span>{data.jumlahTransaksi.santunan} Kasus Santunan</span>
            <span className="text-rose-600 font-medium">Rp {(data.settings?.nominalSantunan || 600000).toLocaleString('id-ID')}/jiwa</span>
          </div>
        </div>

        {/* Pengeluaran Operasional */}
        <div id="card-report-pengeluaran" className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pengeluaran Operasional</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.totalPengeluaranPeriode)}</p>
            </div>
          </div>
          <div className="mt-2.5 text-xs text-gray-500 flex items-center justify-between">
            <span>{data.jumlahTransaksi.pengeluaran} Transaksi Disetujui</span>
            <span className="text-amber-600 font-medium">Rincian terverifikasi</span>
          </div>
        </div>

        {/* Kepesertaan Aktif */}
        <div id="card-report-anggota" className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Kepesertaan KK</p>
              <p className="text-lg font-bold text-gray-900">{data.anggotaMetrics.kkAktif} KK Aktif</p>
            </div>
          </div>
          <div className="mt-2.5 text-xs text-gray-500 flex items-center justify-between">
            <span>Total KK Terdaftar: {data.anggotaMetrics.totalKK}</span>
            <span className="text-blue-600 font-medium inline-flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> RT 06, 07, 10
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
