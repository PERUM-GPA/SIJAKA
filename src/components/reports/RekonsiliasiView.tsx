import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Equal,
  Minus,
  Plus,
  Scale,
  FileCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ReconciliationReportData } from '../../types/index.ts';

interface RekonsiliasiViewProps {
  data: ReconciliationReportData;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const RekonsiliasiView: React.FC<RekonsiliasiViewProps> = ({ data, onRefresh, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'anomalies'>('overview');

  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

  const isValid = data.reconciliationStatus === 'VALID';

  return (
    <div id="rekonsiliasi-view" className="space-y-5">
      {/* Top Status & Action Banner */}
      <div
        id="banner-status-rekonsiliasi"
        className={`rounded-xl border p-5 shadow-sm transition-all ${
          isValid
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isValid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {isValid ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border text-gray-800">
                  Status Rekonsiliasi
                </span>
                <span
                  className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    isValid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {data.reconciliationStatus}
                </span>
              </div>
              <h3 className="text-lg font-bold mt-1 text-gray-900">
                {isValid
                  ? 'Integritas Buku Kas & Modul Transaksi 100% Cocok'
                  : `Ditemukan Selisih / Anomali (Selisih: ${formatRupiah(data.ledger?.selisih)})`}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Pemeriksaan terakhir: {data.timestamp ? new Date(data.timestamp).toLocaleString('id-ID') : '-'} • Single Source of Truth: 06_BUKU_KAS
              </p>
            </div>
          </div>

          {/* Refresh Reconciliation Button */}
          <button
            id="btn-run-reconciliation"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-black transition-colors shadow-sm disabled:opacity-50 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Memeriksa Integritas...' : 'Jalankan Rekonsiliasi Ulang'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Ikhtisar & Matematika Kas
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'checklist'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>10-Point Checklist Integritas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {data.integrityChecks.passedCount}/{data.integrityChecks.checksCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'anomalies'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>Daftar Anomali</span>
          {data.anomalies.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
              {data.anomalies.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & MATH */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Mathematical Formula Balance Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-gray-900">
                Formula Verifikasi Keseimbangan Kas
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center">
              {/* Kas Masuk */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Total Kas Masuk Valid</span>
                <p className="text-base font-bold text-emerald-900 mt-1">
                  {formatRupiah(data.ledger.totalKasMasuk)}
                </p>
                <span className="text-[10px] text-emerald-600">Penerimaan Tercatat</span>
              </div>

              <div className="hidden md:flex justify-center text-gray-400">
                <Minus className="w-5 h-5" />
              </div>

              {/* Kas Keluar */}
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[11px] font-semibold text-red-700 uppercase">Total Kas Keluar Valid</span>
                <p className="text-base font-bold text-red-900 mt-1">
                  {formatRupiah(data.ledger.totalKasKeluar)}
                </p>
                <span className="text-[10px] text-red-600">Pengeluaran & Santunan</span>
              </div>

              <div className="hidden md:flex justify-center text-gray-400">
                <Equal className="w-5 h-5" />
              </div>

              {/* Saldo Akhir */}
              <div className="p-3.5 bg-gray-900 text-white rounded-xl shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-300 uppercase">Saldo Akhir Buku Kas</span>
                <p className="text-base font-bold text-white mt-1">
                  {formatRupiah(data.ledger.saldoBukuKas)}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
                  {data.ledger.selisih === 0 ? (
                    <span className="text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Selisih Rp 0 (Sempurna)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold">
                      Selisih: {formatRupiah(data.ledger.selisih)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Module Cross-Match Verification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Iuran vs Cashbook */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">03_IURAN (Lunas)</span>
                {data.comparisons.iuran.status === 'MATCH' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> MATCH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3" /> SELISIH
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Modul Iuran:</span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(data.comparisons.iuran.sourceTotalAmount)} ({data.comparisons.iuran.sourceTotalRecords} tx)
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Buku Kas (IURAN):</span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(data.comparisons.iuran.ledgerTotalAmount)} ({data.comparisons.iuran.ledgerTotalRecords} tx)
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                  <span>Selisih:</span>
                  <span className={data.comparisons.iuran.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatRupiah(data.comparisons.iuran.difference)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Santunan vs Cashbook */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">05_SANTUNAN (Dicairkan)</span>
                {data.comparisons.santunan.status === 'MATCH' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> MATCH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3" /> SELISIH
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Modul Santunan:</span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(data.comparisons.santunan.sourceTotalAmount)} ({data.comparisons.santunan.sourceTotalRecords} tx)
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Buku Kas (SANTUNAN):</span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(data.comparisons.santunan.ledgerTotalAmount)} ({data.comparisons.santunan.ledgerTotalRecords} tx)
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                  <span>Selisih:</span>
                  <span className={data.comparisons.santunan.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatRupiah(data.comparisons.santunan.difference)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Pengeluaran vs Cashbook */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">07_PENGELUARAN (Dibayar)</span>
                {data.comparisons.pengeluaran.status === 'MATCH' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> MATCH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3" /> SELISIH
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Modul Pengeluaran:</span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(data.comparisons.pengeluaran.sourceTotalAmount)} ({data.comparisons.pengeluaran.sourceTotalRecords} tx)
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Buku Kas (PENGELUARAN):</span>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(data.comparisons.pengeluaran.ledgerTotalAmount)} ({data.comparisons.pengeluaran.ledgerTotalRecords} tx)
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                  <span>Selisih:</span>
                  <span className={data.comparisons.pengeluaran.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatRupiah(data.comparisons.pengeluaran.difference)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 10-POINT INTEGRITY CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Hasil Pemeriksaan Integritas Otomatis (10 Poin)
              </h4>
            </div>
            <span className="text-xs font-bold text-gray-700">
              Lulus: {data.integrityChecks.passedCount} / {data.integrityChecks.checksCount}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {data.integrityChecks.checks.map((item) => (
              <div key={item.checkNumber} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      item.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.checkNumber}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">{item.title}</h5>
                    <p className="text-xs text-gray-600 mt-0.5">{item.details}</p>
                  </div>
                </div>

                <div>
                  {item.status === 'PASS' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" /> LULUS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 whitespace-nowrap">
                      <AlertCircle className="w-3.5 h-3.5" /> PERLU TINDAKAN
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANOMALIES */}
      {activeTab === 'anomalies' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Daftar Temuan & Rekomendasi Audit
            </h4>
          </div>

          {data.anomalies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">Tidak ada anomali yang ditemukan</p>
              <p className="text-xs text-gray-500 mt-1">
                Seluruh data transaksi konsisten, terhubung ke sumber yang valid, dan tidak ada duplikasi.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.anomalies.map((ano) => (
                <div key={ano.id} className="p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ano.type === 'ERROR'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ano.type}
                    </span>
                    <span className="text-xs font-mono font-medium text-gray-700">{ano.category}</span>
                    {ano.transactionId && (
                      <span className="text-[11px] text-gray-400 font-mono">({ano.transactionId})</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 font-medium">{ano.description}</p>
                  <p className="text-xs text-emerald-700">
                    <span className="font-semibold">Rekomendasi:</span> {ano.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
