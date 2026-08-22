import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Banknote,
  FileCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';
import { Expense } from '../../types/index.ts';

export function PengeluaranListView() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Action Approval Modal
  const [approveModal, setApproveModal] = useState<{
    id: string;
    status: 'DISETUJUI' | 'DITOLAK';
    title: string;
  } | null>(null);
  const [actionKeterangan, setActionKeterangan] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Payment Modal
  const [payModal, setPayModal] = useState<Expense | null>(null);
  const [payTanggal, setPayTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [payMetode, setPayMetode] = useState('Tunai');
  const [payNomorBukti, setPayNomorBukti] = useState('');
  const [payBukti, setPayBukti] = useState('');
  const [payKeterangan, setPayKeterangan] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Create Form State
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formKategori, setFormKategori] = useState('OPERASIONAL');
  const [formUraian, setFormUraian] = useState('');
  const [formNominal, setFormNominal] = useState<number | ''>('');
  const [formMetode, setFormMetode] = useState('Tunai');
  const [formNomorBukti, setFormNomorBukti] = useState('');
  const [formBukti, setFormBukti] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const isBendaharaOrAdmin = ['ADMIN', 'BENDAHARA'].includes(user?.Role || '');
  const isPengurusOrAdmin = ['ADMIN', 'PENGURUS'].includes(user?.Role || '');

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.pengeluaran.list({
        search,
        kategori: kategoriFilter,
        status: statusFilter,
        page,
        limit: 10,
      });

      if (res.success) {
        setExpenses(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat data pengeluaran.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, kategoriFilter, statusFilter, page, showToast]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUraian || !formNominal || Number(formNominal) <= 0) {
      showToast('Mohon lengkapi uraian dan nominal pengeluaran.', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await api.pengeluaran.create({
        Tanggal_Pengeluaran: formTanggal,
        Kategori: formKategori,
        Uraian: formUraian,
        Nominal: Number(formNominal),
        Metode_Pembayaran: formMetode,
        Nomor_Bukti: formNomorBukti,
        Bukti_Pengeluaran: formBukti,
        Keterangan: formKeterangan,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setShowCreateModal(false);
        // Reset form
        setFormUraian('');
        setFormNominal('');
        setFormNomorBukti('');
        setFormBukti('');
        setFormKeterangan('');
        loadExpenses();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal mengajukan pengeluaran.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExecuteApproval = async () => {
    if (!approveModal) return;
    try {
      setActionSubmitting(true);
      const res = await api.pengeluaran.approve(approveModal.id, approveModal.status, actionKeterangan);
      if (res.success) {
        showToast(res.message, 'success');
        setApproveModal(null);
        setActionKeterangan('');
        setSelectedExpense(null);
        loadExpenses();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memproses persetujuan.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;

    try {
      setPaySubmitting(true);
      const res = await api.pengeluaran.pay(payModal.ID_Pengeluaran, {
        Tanggal_Pengeluaran: payTanggal,
        Metode_Pembayaran: payMetode,
        Nomor_Bukti: payNomorBukti,
        Bukti_Pengeluaran: payBukti,
        Keterangan: payKeterangan,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setPayModal(null);
        setSelectedExpense(null);
        loadExpenses();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memproses pembayaran pengeluaran.', 'error');
    } finally {
      setPaySubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DIBAYARKAN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Dibayarkan
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Siap Dibayar (Disetujui)
          </span>
        );
      case 'DIAJUKAN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Diajukan
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-400" />
            Pengeluaran Operasional & Jamaah
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pengajuan biaya operasional, perlengkapan rukun kematian, persetujuan pengurus, dan pencatatan pembayaran kas otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadExpenses()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPengurusOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Ajukan Pengeluaran
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Total Item</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{totalCount}</div>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-amber-400 font-medium">Menunggu Persetujuan</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {expenses.filter((e) => e.Status === 'DIAJUKAN').length}
          </div>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-blue-400 font-medium">Siap Dibayar</div>
          <div className="text-2xl font-bold text-blue-300 mt-1">
            {expenses.filter((e) => e.Status === 'DISETUJUI').length}
          </div>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-emerald-400 font-medium">Telah Dibayar</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {expenses.filter((e) => e.Status === 'DIBAYARKAN').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID pengeluaran, uraian, nomor bukti, pengaju..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={kategoriFilter}
            onChange={(e) => {
              setKategoriFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="OPERASIONAL">Operasional</option>
            <option value="PERLENGKAPAN">Perlengkapan Rukun</option>
            <option value="ADMINISTRASI">Administrasi & ATK</option>
            <option value="LAIN_LAIN">Lain-lain</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIAJUKAN">Diajukan</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DIBAYARKAN">Dibayarkan</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Tanggal & ID</th>
                <th className="px-4 py-3">Kategori & Uraian</th>
                <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                <th className="px-4 py-3">Pengaju</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Memuat data pengeluaran...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Tidak ada data pengeluaran yang cocok.
                  </td>
                </tr>
              ) : (
                expenses.map((item) => (
                  <tr key={item.ID_Pengeluaran} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{item.Tanggal_Pengeluaran}</div>
                      <div className="text-[11px] font-mono text-amber-400">{item.ID_Pengeluaran}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 mr-2 font-semibold text-[10px]">
                        {item.Kategori}
                      </span>
                      <span className="text-slate-100 font-medium">{item.Uraian}</span>
                      {item.Nomor_Bukti && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Bukti: {item.Nomor_Bukti}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                      Rp {item.Nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div>{item.Diajukan_Oleh}</div>
                      <div className="text-[11px] text-slate-500">{item.Metode_Pembayaran || '-'}</div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item.Status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedExpense(item)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                        >
                          Detail
                        </button>
                        {isBendaharaOrAdmin && item.Status === 'DISETUJUI' && (
                          <button
                            onClick={() => setPayModal(item)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                          >
                            Bayar
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

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Total: <span className="font-semibold text-slate-200">{totalCount}</span> pengeluaran
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-700 text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Halaman <span className="font-semibold text-slate-200">{page}</span> dari {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-700 text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Expense */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                Pengajuan Pengeluaran Operasional
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tanggal Pengeluaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Kategori Pengeluaran *
                  </label>
                  <select
                    required
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="OPERASIONAL">Operasional</option>
                    <option value="PERLENGKAPAN">Perlengkapan Rukun Kematian</option>
                    <option value="ADMINISTRASI">Administrasi & ATK</option>
                    <option value="LAIN_LAIN">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Uraian / Keperluan Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembelian kain kafan & perlengkapan jenazah"
                  value={formUraian}
                  onChange={(e) => setFormUraian(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Contoh: 150000"
                    value={formNominal}
                    onChange={(e) => setFormNominal(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Rencana Metode Pembayaran
                  </label>
                  <select
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer">Transfer Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nomor Bukti / Nota / Nota Pembelian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: NOTA-0821/TK-BERKAH"
                  value={formNomorBukti}
                  onChange={(e) => setFormNomorBukti(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Keterangan tambahan keperluan pengeluaran..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Ajukan Pengeluaran'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Expense */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {selectedExpense.ID_Pengeluaran}
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Detail Pengeluaran Kas
                </h3>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-slate-400">Status:</div>
                  <div className="mt-1">{getStatusBadge(selectedExpense.Status)}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">Nominal:</div>
                  <div className="text-base font-bold text-rose-400 font-mono">
                    Rp {selectedExpense.Nominal.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <div>
                  <span className="text-slate-400">Kategori & Uraian:</span>
                  <p className="text-slate-100 font-semibold mt-0.5">
                    [{selectedExpense.Kategori}] {selectedExpense.Uraian}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                  <div>
                    <span className="text-slate-400">Diajukan Oleh:</span>
                    <p className="text-slate-200 font-medium">{selectedExpense.Diajukan_Oleh}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Tanggal:</span>
                    <p className="text-slate-200">{selectedExpense.Tanggal_Pengeluaran}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div>
                  <span className="text-slate-400">Persetujuan:</span>
                  <p className="text-slate-200">{selectedExpense.Disetujui_Oleh || 'Belum diproses'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Metode Pembayaran:</span>
                  <p className="text-slate-200">{selectedExpense.Metode_Pembayaran || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Nomor Bukti / Kwitansi:</span>
                  <p className="text-slate-200 font-mono">{selectedExpense.Nomor_Bukti || '-'}</p>
                </div>
                {selectedExpense.Keterangan && (
                  <div>
                    <span className="text-slate-400">Catatan:</span>
                    <p className="text-slate-200">{selectedExpense.Keterangan}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pengurus / Admin */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                <div className="text-slate-300 font-semibold">Tindakan:</div>
                <div className="flex flex-wrap gap-2">
                  {isPengurusOrAdmin && selectedExpense.Status === 'DIAJUKAN' && (
                    <>
                      <button
                        onClick={() =>
                          setApproveModal({
                            id: selectedExpense.ID_Pengeluaran,
                            status: 'DISETUJUI',
                            title: 'Setujui Pengeluaran',
                          })
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Setujui Pengeluaran
                      </button>
                      <button
                        onClick={() =>
                          setApproveModal({
                            id: selectedExpense.ID_Pengeluaran,
                            status: 'DITOLAK',
                            title: 'Tolak Pengeluaran',
                          })
                        }
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Tolak
                      </button>
                    </>
                  )}

                  {isBendaharaOrAdmin && selectedExpense.Status === 'DISETUJUI' && (
                    <button
                      onClick={() => setPayModal(selectedExpense)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Bayarkan Kas
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">{approveModal.title}</h3>
            <p className="text-xs text-slate-400">
              Anda akan memproses pengeluaran <span className="font-mono text-slate-200">{approveModal.id}</span> menjadi status{' '}
              <span className="font-bold text-amber-400">{approveModal.status}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catatan Persetujuan (Opsional)
              </label>
              <textarea
                rows={2}
                value={actionKeterangan}
                onChange={(e) => setActionKeterangan(e.target.value)}
                placeholder="Tambahkan catatan persetujuan atau alasan penolakan..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                disabled={actionSubmitting}
                onClick={() => setApproveModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
              >
                Batal
              </button>
              <button
                disabled={actionSubmitting}
                onClick={handleExecuteApproval}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
              >
                {actionSubmitting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                Konfirmasi Pembayaran Kas
              </h3>
              <button
                onClick={() => setPayModal(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
              <div className="text-emerald-300 font-semibold">
                Nominal: Rp {payModal.Nominal.toLocaleString('id-ID')}
              </div>
              <div className="text-slate-300">
                Keperluan: <span className="font-semibold">[{payModal.Kategori}] {payModal.Uraian}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Pembayaran ini akan memotong saldo kas dan otomatis mencatat mutasi KAS_KELUAR di Buku Kas.
              </p>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Tanggal Pembayaran *
                </label>
                <input
                  type="date"
                  required
                  value={payTanggal}
                  onChange={(e) => setPayTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Metode Pembayaran *
                </label>
                <select
                  required
                  value={payMetode}
                  onChange={(e) => setPayMetode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Tunai">Tunai (Kas Fisik)</option>
                  <option value="Transfer">Transfer Bank</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nomor Bukti / Kwitansi Pengeluaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: KW-OPS/2026/08/01"
                  value={payNomorBukti}
                  onChange={(e) => setPayNomorBukti(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Catatan Pembayaran
                </label>
                <textarea
                  rows={2}
                  value={payKeterangan}
                  onChange={(e) => setPayKeterangan(e.target.value)}
                  placeholder="Catatan bendahara..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={paySubmitting}
                  onClick={() => setPayModal(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  {paySubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Memproses Buku Kas...
                    </>
                  ) : (
                    'Konfirmasi Pembayaran Kas'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
