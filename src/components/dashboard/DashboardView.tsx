import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  HeartCrack,
  Shield,
  ArrowRight,
  PlusCircle,
  Building2,
  Calendar,
  Layers,
  History,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Receipt,
  HeartHandshake,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardMetrics, ActivityLog } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { ActiveTab } from '../layout/Sidebar.tsx';
import { formatDateTimeIndo, formatRupiah } from '../../lib/formatters.ts';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewPolicy =
    ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '') &&
    metrics?.iuranBulanan !== undefined;

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metricsRes, logsRes] = await Promise.allSettled([
        api.dashboard.getMetrics(),
        api.logs.list(),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) {
        setMetrics(metricsRes.value.data);
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.success) {
        setRecentLogs(logsRes.value.data.slice(0, 5));
      }
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setError('Gagal terhubung ke database. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div id="dashboard-view-container" className="space-y-6">
      {/* Header Card / Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Jamaah Tahlil Ar Rohman</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              SIJAKA
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-300">
              Sistem Informasi Jaminan Kematian
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Cakupan Wilayah: <span className="text-emerald-400 font-semibold">RT 06 • RT 07 • RT 10</span> Perum GPA Ngijo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '') && (
              <button
                id="btn-dash-add-member"
                onClick={() => onNavigate('anggota-tambah')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Anggota</span>
              </button>
            )}

            <button
              id="btn-dash-refresh"
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div id="metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Anggota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Anggota
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">
              {isLoading ? '...' : metrics?.totalAnggota ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Seluruh warga terdaftar di sistem</p>
          </div>
        </div>

        {/* Anggota Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Anggota Aktif
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700">
              {isLoading ? '...' : metrics?.anggotaAktif ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Berhak menerima manfaat santunan</p>
          </div>
        </div>

        {/* Saldo Kas (Phase 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Saldo Kas Ledger
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
              {isLoading ? '...' : formatRupiah(metrics?.saldoKas ?? 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Kas riil tercatat di Buku Kas</p>
          </div>
        </div>

        {/* Total User Sistem */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Total User
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-purple-700">
              {isLoading ? '...' : metrics?.totalUser ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Pengurus & anggota berhak akses</p>
          </div>
        </div>
      </div>

      {/* RT Distribution & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribusi Anggota per RT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Distribusi Anggota per Rukun Tetangga (RT)
              </h2>
              <p className="text-xs text-slate-500">
                Data anggota terpusat global meliputi wilayah RT 06, RT 07, dan RT 10
              </p>
            </div>
            <button
              onClick={() => onNavigate('anggota')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-xs font-semibold text-slate-600 uppercase">RT 06</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics?.distribusiRT?.rt06 ?? 0}
              </p>
              <p className="text-[11px] text-slate-400">Warga Terdaftar</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-xs font-semibold text-slate-600 uppercase">RT 07</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics?.distribusiRT?.rt07 ?? 0}
              </p>
              <p className="text-[11px] text-slate-400">Warga Terdaftar</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-xs font-semibold text-slate-600 uppercase">RT 10</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {metrics?.distribusiRT?.rt10 ?? 0}
              </p>
              <p className="text-[11px] text-slate-400">Warga Terdaftar</p>
            </div>
          </div>

          {canViewPolicy && (
            <div
              id="policy-info-bar"
              className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2"
            >
              <span>
                Standar Iuran: <strong>{formatRupiah(metrics?.iuranBulanan ?? 5000)} / Bulan</strong>
              </span>
              <span>
                Besaran Santunan: <strong>{formatRupiah(metrics?.nominalSantunan ?? 600000)}</strong>
              </span>
              <span>
                Masa Tunggu: <strong>{metrics?.masaTungguHari ?? 0} Hari (Langsung Aktif)</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions & Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Aksi Cepat</h2>
            <p className="text-xs text-slate-500 mb-4">Pintasan modul terpadu</p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('kematian')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left flex items-center justify-between text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <HeartCrack className="w-4 h-4 text-rose-600" />
                  <span>Laporan Kematian</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('santunan')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left flex items-center justify-between text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <HeartHandshake className="w-4 h-4 text-purple-600" />
                  <span>Santunan Kematian</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '') && (
                <button
                  onClick={() => onNavigate('buku-kas')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left flex items-center justify-between text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Buku Kas (Ledger Otomatis)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '') && (
                <button
                  onClick={() => onNavigate('pengeluaran')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left flex items-center justify-between text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>Pengeluaran Operasional</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Login sebagai: <span className="font-semibold text-slate-700">{user?.Nama}</span> ({user?.Role})
          </div>
        </div>
      </div>

      {/* Recent Activity Logs */}
      {['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '') && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-600" />
              <h2 className="text-base font-semibold text-slate-900">Aktivitas Terkini (09_LOG_AKTIVITAS)</h2>
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>Lihat Semua Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Belum ada riwayat aktivitas terbaru.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div key={log.ID_Log} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.Aksi === 'CREATE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.Aksi === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800'
                          : log.Aksi === 'DELETE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {log.Aksi}
                    </span>
                    <div className="truncate">
                      <p className="font-medium text-slate-800 truncate">{log.Deskripsi}</p>
                      <p className="text-slate-400 text-[11px]">
                        Oleh {log.Nama_User} • Modul {log.Modul}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-[11px] shrink-0 ml-4">
                    {formatDateTimeIndo(log.Timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
