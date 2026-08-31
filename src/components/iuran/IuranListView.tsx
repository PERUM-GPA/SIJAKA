import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Printer,
  Edit3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Users,
  Building2,
  Clock,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Contribution, Member, MemberArrearsInfo, RTEnum } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { RTBadge } from '../common/Badge.tsx';
import { formatDateIndo, formatRupiah } from '../../lib/formatters.ts';
import { IuranFormModal } from './IuranFormModal.tsx';
import { KwitansiModal } from './KwitansiModal.tsx';

const MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function IuranListView() {
  const { user } = useAuth();
  const role = user?.Role || 'VIEWER';
  const canManage = ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(role);

  // Tab: 'riwayat' | 'tunggakan'
  const [activeTab, setActiveTab] = useState<'riwayat' | 'tunggakan'>('riwayat');

  // Contributions List States
  const [contributions, setContributions] = useState<
    (Contribution & { namaAnggota?: string; rtAnggota?: string })[]
  >([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bulanFilter, setBulanFilter] = useState<number>(0);
  const [tahunFilter, setTahunFilter] = useState<number>(0);
  const [rtFilter, setRtFilter] = useState<string>('ALL');
  const [metodeFilter, setMetodeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Arrears Data States
  const [arrearsData, setArrearsData] = useState<{
    membersArrears: MemberArrearsInfo[];
    summary: {
      totalAnggotaAktif: number;
      jumlahSudahBayarBulanIni: number;
      jumlahBelumBayarBulanIni: number;
      totalAnggotaMenunggak: number;
      totalNominalTunggakan: number;
      totalIuranTerkumpulBulanIni: number;
    };
  } | null>(null);
  const [arrearsSearch, setArrearsSearch] = useState('');
  const [arrearsRtFilter, setArrearsRtFilter] = useState<string>('ALL');
  const [arrearsStatusFilter, setArrearsStatusFilter] = useState<string>('ALL');

  // Modals & Feedback
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | undefined>(undefined);
  const [selectedContributionForEdit, setSelectedContributionForEdit] = useState<
    (Contribution & { namaAnggota?: string; rtAnggota?: string }) | null
  >(null);
  const [selectedContributionForReceipt, setSelectedContributionForReceipt] = useState<
    (Contribution & { namaAnggota?: string; rtAnggota?: string }) | null
  >(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch all members for dropdown selection
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.anggota.list({ limit: 500 });
        if (res.success && res.data) {
          setMembersList(res.data);
        }
      } catch (err) {
        console.error('Error fetching members list:', err);
      }
    };
    fetchMembers();
  }, []);

  // Fetch Contributions
  const fetchContributions = async () => {
    try {
      setIsLoading(true);
      const res = await api.iuran.list({
        search,
        bulan: bulanFilter > 0 ? bulanFilter : undefined,
        tahun: tahunFilter > 0 ? tahunFilter : undefined,
        rt: rtFilter !== 'ALL' ? rtFilter : undefined,
        metode: metodeFilter !== 'ALL' ? metodeFilter : undefined,
        page,
        limit: 10,
      });

      if (res.success) {
        setContributions(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal memuat data iuran.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Arrears Summary if authorized
  const fetchArrears = async () => {
    if (!canManage) return;
    try {
      const res = await api.iuran.getArrearsSummary();
      if (res.success && res.data) {
        setArrearsData(res.data);
      }
    } catch (err) {
      console.error('Error fetching arrears:', err);
    }
  };

  useEffect(() => {
    fetchContributions();
    if (canManage) {
      fetchArrears();
    }
  }, [search, bulanFilter, tahunFilter, rtFilter, metodeFilter, page]);

  const handleOpenForm = (memberId?: string) => {
    setSelectedContributionForEdit(null);
    setSelectedMemberForPayment(memberId);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (contrib: Contribution & { namaAnggota?: string; rtAnggota?: string }) => {
    setSelectedContributionForEdit(contrib);
    setSelectedMemberForPayment(undefined);
    setIsFormModalOpen(true);
  };

  const handleOpenReceipt = (contrib: Contribution & { namaAnggota?: string; rtAnggota?: string }) => {
    setSelectedContributionForReceipt(contrib);
    setIsReceiptModalOpen(true);
  };

  // Filtered arrears list
  const filteredArrears = (arrearsData?.membersArrears || []).filter((item) => {
    const matchSearch =
      item.namaAnggota.toLowerCase().includes(arrearsSearch.toLowerCase()) ||
      item.idAnggota.toLowerCase().includes(arrearsSearch.toLowerCase());
    const matchRt = arrearsRtFilter === 'ALL' || item.rt === arrearsRtFilter;
    const matchStatus =
      arrearsStatusFilter === 'ALL' ||
      (arrearsStatusFilter === 'MENUNGGAK' && item.totalBulanTunggakan > 0) ||
      (arrearsStatusFilter === 'LUNAS' && item.totalBulanTunggakan === 0);
    return matchSearch && matchRt && matchStatus;
  });

  return (
    <div id="iuran-view-root" className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Iuran Wajib & Monitoring Tunggakan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan kas masuk Rp5.000/bulan dan monitoring kepatuhan iuran anggota (03_IURAN)
          </p>
        </div>

        {canManage && (
          <button
            id="btn-catat-iuran"
            type="button"
            onClick={() => handleOpenForm()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Iuran Baru</span>
          </button>
        )}
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2 text-xs sm:text-sm">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline ml-4 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Financial Summary Cards for Admin/Bendahara/Pengurus */}
      {canManage && arrearsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Terkumpul Bulan Ini</p>
              <p className="text-xl font-bold text-emerald-700">
                {formatRupiah(arrearsData.summary.totalIuranTerkumpulBulanIni)}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Sudah Bayar Bulan Ini</p>
              <p className="text-xl font-bold text-slate-900">
                {arrearsData.summary.jumlahSudahBayarBulanIni} / {arrearsData.summary.totalAnggotaAktif} KK
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Belum Bayar Bulan Ini</p>
              <p className="text-xl font-bold text-amber-700">
                {arrearsData.summary.jumlahBelumBayarBulanIni} Anggota
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Tunggakan Kas</p>
              <p className="text-xl font-bold text-rose-700">
                {formatRupiah(arrearsData.summary.totalNominalTunggakan)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 -mb-[2px] cursor-pointer flex items-center space-x-2 ${
            activeTab === 'riwayat'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Riwayat Transaksi Iuran ({totalCount})</span>
        </button>

        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('tunggakan')}
            className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 -mb-[2px] cursor-pointer flex items-center space-x-2 ${
              activeTab === 'tunggakan'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Tabel Status & Tunggakan Anggota</span>
            {arrearsData && arrearsData.summary.totalAnggotaMenunggak > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                {arrearsData.summary.totalAnggotaMenunggak}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: RIWAYAT TRANSAKSI IURAN */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-search-iuran"
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nama anggota, ID Iuran, petugas..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {/* Bulan Filter */}
              <div>
                <select
                  id="select-filter-bulan"
                  value={bulanFilter}
                  onChange={(e) => {
                    setBulanFilter(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  <option value={0}>Semua Bulan</option>
                  {MONTH_NAMES.slice(1).map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* RT Filter */}
              <div>
                <select
                  id="select-filter-rt-iuran"
                  value={rtFilter}
                  onChange={(e) => {
                    setRtFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  <option value="ALL">Semua RT</option>
                  <option value="06">RT 06</option>
                  <option value="07">RT 07</option>
                  <option value="10">RT 10</option>
                </select>
              </div>

              {/* Metode Filter */}
              <div>
                <select
                  id="select-filter-metode"
                  value={metodeFilter}
                  onChange={(e) => {
                    setMetodeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  <option value="ALL">Semua Metode</option>
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Kolektor">Kolektor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">No</th>
                    <th className="px-4 py-3.5">ID & Tgl Bayar</th>
                    <th className="px-4 py-3.5">Anggota Utama</th>
                    <th className="px-4 py-3.5">RT</th>
                    <th className="px-4 py-3.5">Periode</th>
                    <th className="px-4 py-3.5">Nominal</th>
                    <th className="px-4 py-3.5">Metode</th>
                    <th className="px-4 py-3.5">Petugas</th>
                    <th className="px-4 py-3.5 text-right">Kuitansi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Memuat data iuran...
                      </td>
                    </tr>
                  ) : contributions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        Tidak ada catatan pembayaran iuran yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    contributions.map((item, idx) => (
                      <tr key={item.ID_Iuran} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                          {(page - 1) * 10 + idx + 1}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-semibold text-slate-900 block">
                            {item.ID_Iuran}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatDateIndo(item.Tanggal_Bayar)}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{item.namaAnggota}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.ID_Anggota}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          {item.rtAnggota ? <RTBadge rt={item.rtAnggota as RTEnum} /> : '-'}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            {MONTH_NAMES[item.Periode_Bulan]} {item.Periode_Tahun}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          {formatRupiah(item.Nominal)}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {item.Metode}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 text-xs">
                          {item.Petugas}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                title="Koreksi / Edit Data Iuran"
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors cursor-pointer border border-amber-200 shadow-2xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(item)}
                              title="Cetak Kuitansi Resmi"
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Kuitansi</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div>
                Menampilkan <span className="font-semibold">{contributions.length}</span> dari{' '}
                <span className="font-semibold">{totalCount}</span> total transaksi
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium">
                  Hal {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONITORING TUNGGAKAN & KEPATUHAN ANGGOTA */}
      {activeTab === 'tunggakan' && canManage && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={arrearsSearch}
                onChange={(e) => setArrearsSearch(e.target.value)}
                placeholder="Cari nama anggota atau ID Anggota..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <select
                value={arrearsRtFilter}
                onChange={(e) => setArrearsRtFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              >
                <option value="ALL">Semua RT</option>
                <option value="06">RT 06</option>
                <option value="07">RT 07</option>
                <option value="10">RT 10</option>
              </select>

              <select
                value={arrearsStatusFilter}
                onChange={(e) => setArrearsStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              >
                <option value="ALL">Semua Status</option>
                <option value="MENUNGGAK">Hanya Yang Menunggak</option>
                <option value="LUNAS">Hanya Yang Lunas</option>
              </select>
            </div>
          </div>

          {/* Arrears Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">No</th>
                    <th className="px-4 py-3.5">Nama Anggota</th>
                    <th className="px-4 py-3.5">RT</th>
                    <th className="px-4 py-3.5">Terdaftar</th>
                    <th className="px-4 py-3.5 text-center">Total Wajib / Lunas</th>
                    <th className="px-4 py-3.5">Status Tunggakan</th>
                    <th className="px-4 py-3.5">Bulan Menunggak</th>
                    <th className="px-4 py-3.5 text-right">Aksi Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArrears.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        Tidak ada data anggota sesuai filter tunggakan.
                      </td>
                    </tr>
                  ) : (
                    filteredArrears.map((item, idx) => (
                      <tr key={item.idAnggota} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{item.namaAnggota}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.idAnggota}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <RTBadge rt={item.rt} />
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 text-xs">
                          {item.tanggalDaftar ? formatDateIndo(item.tanggalDaftar) : '-'}
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-700">
                          {item.totalBulanLunas} / {item.totalBulanWajib} Bulan
                        </td>

                        <td className="px-4 py-3.5">
                          {item.totalBulanTunggakan > 0 ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>
                                Nunggak {item.totalBulanTunggakan} bln ({formatRupiah(item.totalNominalTunggakan)})
                              </span>
                            </span>
                          ) : item.belumBayarBulanBerjalan ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Belum Bayar Bulan Ini</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Lunas</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {item.periodeBelumBayar.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.periodeBelumBayar.slice(0, 3).map((p) => (
                                <span
                                  key={p}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700"
                                >
                                  {p}
                                </span>
                              ))}
                              {item.periodeBelumBayar.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-bold self-center">
                                  +{item.periodeBelumBayar.length - 3} lainnya
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenForm(item.idAnggota)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Bayar</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create or Edit) */}
      <IuranFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedContributionForEdit(null);
        }}
        onSuccess={(msg) => {
          setFeedback({ type: 'success', message: msg });
          setSelectedContributionForEdit(null);
          fetchContributions();
          if (canManage) fetchArrears();
        }}
        defaultMemberId={selectedMemberForPayment}
        membersList={membersList}
        editContribution={selectedContributionForEdit}
      />

      {/* Official Kwitansi Receipt Modal */}
      <KwitansiModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        contribution={selectedContributionForReceipt}
      />
    </div>
  );
}
