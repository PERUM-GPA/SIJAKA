import React, { useState, useEffect, useCallback } from 'react';
import {
  HandHeart,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  ArrowDownRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building,
  Info,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';
import { Donation, DonationStatus, DonationMethod } from '../../types/index.ts';
import { formatRupiah, formatDateTimeIndo } from '../../lib/formatters.ts';

export function DonasiListView() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [metodeFilter, setMetodeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Summary Metrics
  const [summary, setSummary] = useState<{
    totalDonasi: number;
    totalNominalDiterima: number;
    totalDiajukan: number;
    totalDiverifikasi: number;
    totalDiterima: number;
    totalDitolak: number;
  } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  // Verification Modal
  const [verifyModal, setVerifyModal] = useState<{
    donation: Donation;
    status: 'DIVERIFIKASI' | 'DITOLAK';
  } | null>(null);
  const [verifyKeterangan, setVerifyKeterangan] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Accept to Cash Ledger Modal
  const [acceptModal, setAcceptModal] = useState<Donation | null>(null);
  const [acceptKeterangan, setAcceptKeterangan] = useState('');
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  // Form State for New Donation
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formDonatur, setFormDonatur] = useState('');
  const [formNominal, setFormNominal] = useState<number | ''>('');
  const [formMetode, setFormMetode] = useState<DonationMethod>('Tunai');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const isBendaharaOrAdmin = ['ADMIN', 'BENDAHARA'].includes(user?.Role || '');
  const isPengurusOrStaff = ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '');

  const loadDonations = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, summaryRes] = await Promise.allSettled([
        api.donasi.list({
          search,
          status: statusFilter,
          metode: metodeFilter,
          page,
          limit: 10,
        }),
        api.donasi.summary(),
      ]);

      if (listRes.status === 'fulfilled' && listRes.value.success) {
        setDonations(listRes.value.data);
        setTotalPages(listRes.value.pagination.totalPages);
        setTotalCount(listRes.value.pagination.total);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.success) {
        setSummary(summaryRes.value.data);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat data dana sumbangan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, metodeFilter, page, showToast]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDonatur.trim()) {
      showToast('Nama donatur wajib diisi.', 'error');
      return;
    }
    const num = Number(formNominal);
    if (isNaN(num) || num <= 0) {
      showToast('Nominal donasi harus lebih besar dari 0.', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await api.donasi.create({
        Tanggal: formTanggal,
        Donatur: formDonatur.trim(),
        Nominal: num,
        Metode: formMetode,
        Keterangan: formKeterangan.trim() || undefined,
      });

      if (res.success) {
        showToast(res.message || 'Pencatatan sumbangan berhasil dikirim.', 'success');
        setShowCreateModal(false);
        // Reset form
        setFormDonatur('');
        setFormNominal('');
        setFormKeterangan('');
        setFormTanggal(new Date().toISOString().split('T')[0]);
        setFormMetode('Tunai');
        loadDonations();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mencatat donasi.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleProcessVerify = async () => {
    if (!verifyModal) return;

    try {
      setVerifySubmitting(true);
      const res = await api.donasi.verify(verifyModal.donation.ID_Donasi, {
        status: verifyModal.status,
        keterangan: verifyKeterangan.trim() || undefined,
      });

      if (res.success) {
        showToast(res.message || 'Status verifikasi berhasil diperbarui.', 'success');
        setVerifyModal(null);
        setVerifyKeterangan('');
        loadDonations();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses verifikasi.', 'error');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleProcessAccept = async () => {
    if (!acceptModal) return;

    try {
      setAcceptSubmitting(true);
      const res = await api.donasi.accept(acceptModal.ID_Donasi, {
        keterangan: acceptKeterangan.trim() || undefined,
      });

      if (res.success) {
        showToast(
          res.message ||
            `Dana sumbangan ${acceptModal.ID_Donasi} berhasil diterima dan masuk ke Buku Kas!`,
          'success'
        );
        setAcceptModal(null);
        setAcceptKeterangan('');
        loadDonations();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses penerimaan sumbangan.', 'error');
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const getStatusBadge = (status: DonationStatus) => {
    switch (status) {
      case 'DIAJUKAN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Diajukan
          </span>
        );
      case 'DIVERIFIKASI':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Diverifikasi
          </span>
        );
      case 'DITERIMA':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Diterima (Kas Masuk)
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="donasi-list-root" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HandHeart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Dana Sumbangan & Infaq (11_DONASI)
              </h1>
              <p className="text-xs text-slate-500">
                Pencatatan dan verifikasi penerimaan sumbangan sukarela warga/donatur ke Buku Kas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadDonations}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPengurusOrStaff && (
            <button
              id="btn-tambah-donasi"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Sumbangan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sumbangan Masuk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Sumbangan Diterima
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {formatRupiah(summary?.totalNominalDiterima || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary?.totalDiterima || 0} donasi telah masuk Buku Kas
            </p>
          </div>
        </div>

        {/* Menunggu Verifikasi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Menunggu Verifikasi
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-700 font-mono">
              {summary?.totalDiajukan || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Status DIAJUKAN, bukti belum diperiksa</p>
          </div>
        </div>

        {/* Menunggu Penerimaan Kas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Siap Diterima Kas
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-blue-700 font-mono">
              {summary?.totalDiverifikasi || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Status DIVERIFIKASI, siap dimasukkan Kas</p>
          </div>
        </div>

        {/* Total Dicatat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Total Catatan
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <HandHeart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 font-mono">
              {summary?.totalDonasi || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ditolak: {summary?.totalDitolak || 0} pengajuan
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID donasi, donatur, atau keterangan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 text-xs sm:text-sm text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIAJUKAN">Diajukan</option>
            <option value="DIVERIFIKASI">Diverifikasi</option>
            <option value="DITERIMA">Diterima (Kas Masuk)</option>
            <option value="DITOLAK">Ditolak</option>
          </select>

          {/* Metode Filter */}
          <select
            value={metodeFilter}
            onChange={(e) => {
              setMetodeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">Semua Metode</option>
            <option value="Tunai">Tunai</option>
            <option value="Transfer">Transfer</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
                <th className="py-3 px-4">ID Donasi</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Donatur</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Buku Kas</th>
                <th className="py-3 px-4">Verifikator</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading && donations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p>Memuat daftar sumbangan...</p>
                    </div>
                  </td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Belum ada data dana sumbangan yang dicatat.
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
                  <tr key={d.ID_Donasi} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {d.ID_Donasi}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {d.Tanggal}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{d.Donatur}</div>
                      {d.Keterangan && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {d.Keterangan}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatRupiah(d.Nominal)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                        {d.Metode}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(d.Status)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                      {d.ID_Kas ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          {d.ID_Kas}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {d.Diverifikasi_Oleh ? (
                        <div>
                          <span className="font-medium text-slate-800">{d.Diverifikasi_Oleh}</span>
                          {d.Tanggal_Verifikasi && (
                            <span className="text-[10px] text-slate-400 block">
                              {d.Tanggal_Verifikasi.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Detail */}
                        <button
                          onClick={() => setSelectedDonation(d)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Verification Action (Role: Admin, Pengurus, Bendahara) */}
                        {isPengurusOrStaff && d.Status === 'DIAJUKAN' && (
                          <>
                            <button
                              onClick={() => setVerifyModal({ donation: d, status: 'DIVERIFIKASI' })}
                              className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 flex items-center space-x-1 cursor-pointer"
                              title="Verifikasi Penerimaan"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verifikasi</span>
                            </button>

                            <button
                              onClick={() => setVerifyModal({ donation: d, status: 'DITOLAK' })}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Tolak Sumbangan"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Accept Action (Role: Admin, Bendahara) */}
                        {isBendaharaOrAdmin && d.Status === 'DIVERIFIKASI' && (
                          <button
                            onClick={() => setAcceptModal(d)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-xs cursor-pointer"
                            title="Terima ke Buku Kas (KAS MASUK)"
                          >
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Terima Kas</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Total <strong>{totalCount}</strong> catatan sumbangan
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Form Catat Sumbangan Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <HandHeart className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base">Catat Dana Sumbangan Baru</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDonation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Sumbangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Donatur / Sumber Infaq <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Bpk. H. Ahmad / Hamba Allah / Paguyuban RT 06"
                  value={formDonatur}
                  onChange={(e) => setFormDonatur(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Donasi (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="50000"
                  min="1000"
                  step="1000"
                  value={formNominal}
                  onChange={(e) => setFormNominal(e.target.value ? Number(e.target.value) : '')}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
                {formNominal !== '' && Number(formNominal) > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Terbilang: {formatRupiah(Number(formNominal))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={formMetode}
                  onChange={(e) => setFormMetode(e.target.value as DonationMethod)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 bg-white"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Niat Sumbangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Infaq untuk operasional jamaah tahlil..."
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Sumbangan yang dicatat berstatus <strong>DIAJUKAN</strong>. Saldo kas belum akan bertambah hingga sumbangan diverifikasi dan disetujui untuk dimasukkan ke Buku Kas.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Verifikasi Sumbangan */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
              {verifyModal.status === 'DIVERIFIKASI' ? (
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600" />
              )}
              <h3 className="text-base">
                {verifyModal.status === 'DIVERIFIKASI'
                  ? 'Konfirmasi Verifikasi Sumbangan'
                  : 'Tolak Sumbangan'}
              </h3>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Sumbangan:</span>
                <span className="font-mono font-bold">{verifyModal.donation.ID_Donasi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Donatur:</span>
                <span className="font-semibold text-slate-800">{verifyModal.donation.Donatur}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatRupiah(verifyModal.donation.Nominal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span>{verifyModal.donation.Metode}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Verifikasi (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Bukti transfer telah valid / tunai telah dicek..."
                value={verifyKeterangan}
                onChange={(e) => setVerifyKeterangan(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                disabled={verifySubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessVerify}
                disabled={verifySubmitting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                  verifyModal.status === 'DIVERIFIKASI'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {verifySubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {verifyModal.status === 'DIVERIFIKASI'
                    ? 'Setujui Verifikasi'
                    : 'Tolak Sumbangan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Penerimaan ke Buku Kas (KAS MASUK) */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base">Terima Dana ke Buku Kas</h3>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Sumbangan:</span>
                <span className="font-mono font-bold text-slate-900">{acceptModal.ID_Donasi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Donatur:</span>
                <span className="font-semibold text-slate-900">{acceptModal.Donatur}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Kas Masuk:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatRupiah(acceptModal.Nominal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="font-medium text-slate-800">{acceptModal.Metode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Saat Ini:</span>
                <span>{getStatusBadge(acceptModal.Status)}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 space-y-1">
              <div className="font-bold flex items-center space-x-1 text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pencatatan Otomatis Buku Kas</span>
              </div>
              <p>
                Tindakan ini akan membuat satu transaksi <strong>KAS_MASUK</strong> pada Buku Kas
                (Sumber: <strong>DONASI</strong>), saldo kas bertambah, dan ID Transaksi Buku Kas
                akan otomatis ditautkan ke record donasi ini.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Penerimaan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Diterima oleh bendahara..."
                value={acceptKeterangan}
                onChange={(e) => setAcceptKeterangan(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAcceptModal(null)}
                disabled={acceptSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessAccept}
                disabled={acceptSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {acceptSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi Terima Kas Masuk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Detail Sumbangan */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold">
                <HandHeart className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base">Detail Dana Sumbangan</h3>
              </div>
              <button
                onClick={() => setSelectedDonation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 block">ID Donasi</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedDonation.ID_Donasi}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Status</span>
                  <div>{getStatusBadge(selectedDonation.Status)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Tanggal Donasi</span>
                  <span className="font-medium text-slate-800">{selectedDonation.Tanggal}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Metode Pembayaran</span>
                  <span className="font-medium text-slate-800">{selectedDonation.Metode}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-emerald-800 block">Donatur & Nominal</span>
                <p className="text-base font-bold text-slate-900">{selectedDonation.Donatur}</p>
                <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                  {formatRupiah(selectedDonation.Nominal)}
                </p>
              </div>

              {selectedDonation.Keterangan && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Keterangan / Niat</span>
                  <p className="text-slate-700 italic">{selectedDonation.Keterangan}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">ID Transaksi Buku Kas</span>
                  {selectedDonation.ID_Kas ? (
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedDonation.ID_Kas}
                    </span>
                  ) : (
                    <span className="text-slate-400">Belum masuk buku kas</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Diverifikasi Oleh</span>
                  <span className="font-medium text-slate-800">
                    {selectedDonation.Diverifikasi_Oleh || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Tanggal Dibuat</span>
                  <span className="text-slate-600">{selectedDonation.Tanggal_Dibuat}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Terakhir Diubah</span>
                  <span className="text-slate-600">{selectedDonation.Tanggal_Diubah}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDonation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
