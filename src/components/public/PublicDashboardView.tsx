import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users2,
  CreditCard,
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  LogIn,
  RefreshCw,
  MapPin,
  TrendingUp,
  FileCheck2,
  Wallet,
  Sparkles,
  Percent,
} from 'lucide-react';
import { PublicDashboardMetrics } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatRupiah } from '../../lib/formatters.ts';
import { PendaftaranKkModal } from './PendaftaranKkModal.tsx';

interface PublicDashboardViewProps {
  onOpenLogin: () => void;
}

export function PublicDashboardView({ onOpenLogin }: PublicDashboardViewProps) {
  const [metrics, setMetrics] = useState<PublicDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'kas' | 'perlindungan' | 'iuran' | 'ketentuan'>('kas');
  const [isDaftarKkOpen, setIsDaftarKkOpen] = useState(false);

  const fetchPublicMetrics = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.public.getDashboard();
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error('Error fetching public dashboard metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublicMetrics();
  }, []);

  const currentMonthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div id="public-dashboard-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Public Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  SIJAKA
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  Publik
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                Jamaah Tahlil Ar Rohman • RT 06, RT 07, RT 10 Perum GPA Ngijo
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="btn-public-daftar-kk"
              type="button"
              onClick={() => setIsDaftarKkOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Daftar KK Baru</span>
              <span className="sm:hidden">Daftar</span>
            </button>

            <button
              id="btn-public-login"
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>Login Internal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Official Welcome Hero Banner */}
        <div className="relative rounded-3xl bg-linear-to-r from-emerald-950 via-slate-800 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Layanan Jamaah Tahlil Ar Rohman</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Selamat Datang di Dashboard Publik SIJAKA
            </h2>

            <p className="text-xs sm:text-sm text-emerald-300 font-medium">
              Jamaah Tahlil Ar Rohman • RT 06, RT 07, RT 10 Perum GPA Ngijo
            </p>

            <blockquote className="italic text-slate-200 text-sm sm:text-base border-l-2 border-emerald-500/60 pl-3 py-0.5">
              “Bersama dalam ukhuwah, peduli dalam kebersamaan, dan hadir untuk saling membantu.”
            </blockquote>

            <div className="space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Selamat datang di SIJAKA (Sistem Informasi Jaminan Kematian).
              </p>
              <p>
                Dashboard ini hadir sebagai sarana informasi dan pelayanan bagi keluarga besar Jamaah Tahlil Ar Rohman, khususnya warga RT 06, RT 07, dan RT 10 Perum GPA Ngijo.
              </p>
              <p>
                Melalui SIJAKA, kami berupaya membangun pelayanan yang lebih mudah, transparan, tertib, dan bermanfaat, sebagai wujud kepedulian serta semangat ta'awun di antara sesama jamaah.
              </p>
              <p>
                Semoga SIJAKA menjadi sarana yang mempererat ukhuwah, memudahkan pelayanan, dan memberikan manfaat bagi seluruh jamaah.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-emerald-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jamaah Bersatu • Saling Peduli • Saling Membantu</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Aggregated Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Kas */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Saldo Kas SIJAKA</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {isLoading ? '...' : formatRupiah(metrics?.saldoKas || 0)}
            </p>
            <p className="text-[11px] text-slate-400">Akumulasi penerimaan kas</p>
          </div>

          {/* Card 2: Pemasukan Bulan Ini */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Iuran Terkumpul ({currentMonthName.split(' ')[0]})</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {isLoading ? '...' : formatRupiah(metrics?.totalPemasukanBulanIni || 0)}
            </p>
            <p className="text-[11px] text-slate-400">
              {metrics?.pembayaranBulanIni || 0} dari {metrics?.kkAktif || 0} KK telah berpartisipasi
            </p>
          </div>

          {/* Card 3: Total KK Terdaftar */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Kepesertaan KK</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Users2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isLoading ? '...' : `${metrics?.kkAktif || 0} KK`}
            </p>
            <p className="text-[11px] text-slate-400">
              Mencakup RT 06, 07, dan 10
            </p>
          </div>

          {/* Card 4: Jiwa Terlindungi */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Jiwa Terlindungi</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <HeartHandshake className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
              {isLoading ? '...' : `${metrics?.keluargaTerlindungi || 0} Jiwa`}
            </p>
            <p className="text-[11px] text-slate-400">Kepala keluarga & seluruh anggota KK</p>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex border-b border-slate-800 gap-4 sm:gap-6 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveSubTab('kas')}
            className={`pb-3 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'kas'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Transparansi Kas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('perlindungan')}
            className={`pb-3 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'perlindungan'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>Perlindungan KK & Wilayah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('iuran')}
            className={`pb-3 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'iuran'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Kepatuhan Iuran</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ketentuan')}
            className={`pb-3 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'ketentuan'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Informasi Program</span>
          </button>
        </div>

        {/* SUBTAB 1: TRANSPARANSI KAS */}
        {activeSubTab === 'kas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Financial Box */}
              <div className="md:col-span-2 bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Ringkasan Keuangan Kas Periode {currentMonthName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Laporan keuangan terbuka untuk seluruh warga & jamaah
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchPublicMetrics}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Perbarui Data"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                    <span className="text-xs text-slate-400 font-medium">Pemasukan Bulan Ini</span>
                    <p className="text-lg font-bold text-emerald-400 font-mono">
                      {formatRupiah(metrics?.totalPemasukanBulanIni || 0)}
                    </p>
                    <span className="text-[10px] text-slate-500 block">Iuran terverifikasi</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                    <span className="text-xs text-slate-400 font-medium">Pengeluaran Bulan Ini</span>
                    <p className="text-lg font-bold text-rose-400 font-mono">
                      {formatRupiah(metrics?.totalPengeluaranBulanIni || 0)}
                    </p>
                    <span className="text-[10px] text-slate-500 block">Penyaluran duka jamaah</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-1">
                    <span className="text-xs text-slate-400 font-medium">Saldo Kas Bersih</span>
                    <p className="text-lg font-bold text-white font-mono">
                      {formatRupiah(metrics?.saldoKas || 0)}
                    </p>
                    <span className="text-[10px] text-emerald-400 block font-medium">Dana aman & siap salur</span>
                  </div>
                </div>

                {/* Contribution Progress */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                    <span className="text-slate-300">Tingkat Kepatuhan Iuran Bulan Ini:</span>
                    <span className="text-emerald-400 font-mono">{metrics?.persentaseKepatuhan || 0}% KK Terpenuhi</span>
                  </div>

                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-linear-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, metrics?.persentaseKepatuhan || 0))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{metrics?.pembayaranBulanIni || 0} KK Lunas</span>
                    <span>{metrics?.belumBayarBulanIni || 0} KK Belum Bayar</span>
                  </div>
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Akuntabilitas Publik</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    SIJAKA menjamin pengelolaan kas berbasis transparansi mutlak. Data keuangan diperbarui langsung
                    melalui sistem pencatatan iuran pengurus dan kasir RT.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-700/60 text-xs">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Prinsip Gotong Royong & Ta'awun Jamaah</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Perlindungan Seluruh Anggota dalam KK</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Metode: Tunai, Transfer, atau Kolektor RT</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDaftarKkOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan Kartu Keluarga Anda</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: PERLINDUNGAN KK & WILAYAH */}
        {activeSubTab === 'perlindungan' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Cakupan Perlindungan Wilayah RT
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribusi data kepesertaan jaminan kematian Jamaah Tahlil Ar Rohman di Perum GPA Ngijo
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>Rukun Tetangga 06</span>
                  </div>
                  <p className="text-2xl font-extrabold text-white">
                    {metrics?.distribusiRT.rt06 || 0} <span className="text-xs font-normal text-slate-400">KK</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Perum GPA Ngijo Blok RT 06</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>Rukun Tetangga 07</span>
                  </div>
                  <p className="text-2xl font-extrabold text-white">
                    {metrics?.distribusiRT.rt07 || 0} <span className="text-xs font-normal text-slate-400">KK</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Perum GPA Ngijo Blok RT 07</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>Rukun Tetangga 10</span>
                  </div>
                  <p className="text-2xl font-extrabold text-white">
                    {metrics?.distribusiRT.rt10 || 0} <span className="text-xs font-normal text-slate-400">KK</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Perum GPA Ngijo Blok RT 10</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs sm:text-sm text-slate-300 space-y-2">
                <p className="font-bold text-emerald-300">Prinsip 1 KK = 1 Kepesertaan Terlindungi</p>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Setiap Kartu Keluarga yang terdaftar mencakup seluruh anggota keluarga yang tinggal dalam satu rumah
                  (Kepala Keluarga, Pasangan, Anak, Orang Tua, dan Tanggungan). Pelayanan perlindungan duka berlaku utuh untuk seluruh anggota keluarga tercatat.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">Pendaftaran Anggota Keluarga Baru</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bagi warga yang baru pindah ke RT 06, RT 07, atau RT 10, atau ingin mendaftarkan Kartu Keluarga baru,
                Anda dapat mengisi formulir pendaftaran secara langsung.
              </p>
              <button
                type="button"
                onClick={() => setIsDaftarKkOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Formulir Pendaftaran KK</span>
              </button>
            </div>
          </div>
        )}

        {/* SUBTAB 3: KEPATUHAN IURAN */}
        {activeSubTab === 'iuran' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Statistik Partisipasi & Kepatuhan Iuran Jamaah
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring agregat partisipasi warga dalam menjaga ketahanan dana santunan sosial
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                <span className="text-xs text-emerald-300 font-semibold">KK Sudah Berpartisipasi</span>
                <p className="text-3xl font-black text-emerald-400">
                  {metrics?.pembayaranBulanIni || 0} <span className="text-sm font-normal text-slate-400">KK</span>
                </p>
                <p className="text-[11px] text-slate-400">Telah tertib untuk periode {currentMonthName}</p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-2">
                <span className="text-xs text-amber-300 font-semibold">KK Belum Berpartisipasi</span>
                <p className="text-3xl font-black text-amber-400">
                  {metrics?.belumBayarBulanIni || 0} <span className="text-sm font-normal text-slate-400">KK</span>
                </p>
                <p className="text-[11px] text-slate-400">Dapat disalurkan via Kolektor RT / Bendahara</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                <span className="text-xs text-slate-300 font-semibold">Persentase Partisipasi</span>
                <p className="text-3xl font-black text-teal-300 font-mono">
                  {metrics?.persentaseKepatuhan || 0}%
                </p>
                <p className="text-[11px] text-slate-400">Tingkat ketertiban gotong royong</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white">Cara Pembayaran Iuran:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Melalui Petugas Kolektor RT saat pertemuan rutin jamaah tahlil.</li>
                <li>Pembayaran tunai langsung ke Bendahara Jamaah Tahlil Ar Rohman.</li>
                <li>Transfer ke rekening kas jamaah dengan konfirmasi bukti ke pengurus.</li>
              </ul>
            </div>
          </div>
        )}

        {/* SUBTAB 4: INFORMASI PROGRAM */}
        {activeSubTab === 'ketentuan' && (
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Informasi Program & Pelayanan Jamaah
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pedoman kebersamaan dan pelayanan Jamaah Tahlil Ar Rohman
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                <h4 className="font-bold text-emerald-400">1. Ketentuan Kepesertaan Kartu Keluarga</h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Kepesertaan didasarkan pada satu kesatuan Kartu Keluarga (KK). Seluruh anggota keluarga yang tercantum di dalam KK otomatis memperoleh naungan pelayanan dan kepedulian bersama.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                <h4 className="font-bold text-emerald-400">2. Keanggotaan</h4>
                <div className="text-slate-300 leading-relaxed text-xs space-y-1.5">
                  <p>Keanggotaan SIJAKA diperuntukkan bagi:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Anggota Jamaah Tahlil Ar-Rohman yang berdomisili di RT 06, RT 07, dan RT 10.</li>
                    <li>Orang tua kandung atau mertua yang berbeda KK, tetapi berdomisili di RT 06, RT 07, dan RT 10.</li>
                  </ul>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                <h4 className="font-bold text-emerald-400">3. Semangat Ta'awun & Kepedulian Sosial</h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Program ini dikelola secara kekeluargaan dan gotong royong untuk saling membantu dan meringankan beban keluarga jamaah saat menghadapi musibah kedukaan.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                <h4 className="font-bold text-emerald-400">4. Transparansi & Akuntabilitas Kas</h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Pengelolaan keuangan kas dilaporkan secara terbuka guna menjaga amanah jamaah dan keberlanjutan dana sosial bersama di lingkungan RT 06, RT 07, dan RT 10.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2 sm:col-span-2">
                <h4 className="font-bold text-emerald-400">5. Prinsip Musyawarah & Kekeluargaan</h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Pelayanan jamaah senantiasa mengedepankan ukhuwah islamiyah, saling peduli, dan musyawarah dalam setiap penyelesaian urusan sosial kemasyarakatan.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-medium text-slate-400">
            SIJAKA • Sistem Informasi Jaminan Kematian Jamaah Tahlil Ar Rohman
          </p>
          <p className="text-[11px] text-slate-600">
            RT 06 • RT 07 • RT 10 Perum GPA Ngijo, Karangploso, Malang
          </p>
        </div>
      </footer>

      {/* Modal Pendaftaran KK Baru */}
      <PendaftaranKkModal
        isOpen={isDaftarKkOpen}
        onClose={() => setIsDaftarKkOpen(false)}
        onSuccess={() => {
          fetchPublicMetrics();
        }}
      />
    </div>
  );
}
