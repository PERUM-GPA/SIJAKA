import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Calendar,
  Filter,
  Ban,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Receipt,
  CreditCard,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';
import { CashTransaction, CashSummary } from '../../types/index.ts';

export function BukuKasView() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('ALL');
  const [sumberFilter, setSumberFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dariTanggal, setDariTanggal] = useState('');
  const [sampaiTanggal, setSampaiTanggal] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    id: string;
    uraian: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const isBendaharaOrAdmin = ['ADMIN', 'BENDAHARA'].includes(user?.Role || '');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        api.bukuKas.list({
          search,
          jenis: jenisFilter,
          sumber: sumberFilter,
          status: statusFilter,
          dariTanggal,
          sampaiTanggal,
          page,
          limit: 15,
        }),
        api.bukuKas.getSummary(),
      ]);

      if (listRes.success) {
        setTransactions(listRes.data);
        setTotalPages(listRes.pagination.totalPages);
        setTotalCount(listRes.pagination.total);
      }

      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat buku kas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, jenisFilter, sumberFilter, statusFilter, dariTanggal, sampaiTanggal, page, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModal || !cancelReason.trim()) {
      showToast('Alasan pembatalan transaksi wajib diisi.', 'error');
      return;
    }

    try {
      setCancelSubmitting(true);
      const res = await api.bukuKas.cancel(cancelModal.id, cancelReason);
      if (res.success) {
        showToast(res.message, 'success');
        setCancelModal(null);
        setCancelReason('');
        setSelectedTransaction(null);
        loadData();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal membatalkan transaksi.', 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const getSumberBadge = (sumber: string) => {
    switch (sumber) {
      case 'IURAN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CreditCard className="w-3 h-3 mr-1" />
            Iuran Wajib
          </span>
        );
      case 'SANTUNAN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <HeartHandshake className="w-3 h-3 mr-1" />
            Santunan Duka
          </span>
        );
      case 'PENGELUARAN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Receipt className="w-3 h-3 mr-1" />
            Pengeluaran
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
            {sumber}
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
            <BookOpen className="w-6 h-6 text-emerald-400" />
            Buku Kas (General Ledger Otomatis)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Buku kas terpadu yang mencatat setiap mutasi kas masuk (iuran) dan kas keluar (santunan & pengeluaran) secara otomatis dan real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sinkronkan Ledger
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saldo Kas Akhir</span>
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 mt-3 font-mono">
              Rp {summary.saldoKas.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400 inline" />
              Saldo otomatis terverifikasi ledger
            </p>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Kas Masuk (Pemasukan)</span>
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <ArrowDownRight className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-300 mt-3 font-mono">
              Rp {summary.totalPemasukan.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dari iuran warga & penerimaan sah
            </p>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Kas Keluar (Pengeluaran)</span>
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-300 mt-3 font-mono">
              Rp {summary.totalPengeluaran.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Santunan duka & biaya operasional
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID transaksi, uraian, ID sumber, no bukti, petugas..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2">
            <select
              value={jenisFilter}
              onChange={(e) => {
                setJenisFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="KAS_MASUK">Kas Masuk (In)</option>
              <option value="KAS_KELUAR">Kas Keluar (Out)</option>
            </select>

            <select
              value={sumberFilter}
              onChange={(e) => {
                setSumberFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">Semua Sumber</option>
              <option value="IURAN">Iuran Wajib</option>
              <option value="SANTUNAN">Santunan Duka</option>
              <option value="PENGELUARAN">Pengeluaran Operasional</option>
              <option value="LAINNYA">Lainnya</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">Semua Status</option>
              <option value="VALID">Valid</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Rentang Tanggal:
          </span>
          <input
            type="date"
            value={dariTanggal}
            onChange={(e) => {
              setDariTanggal(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <span>s/d</span>
          <input
            type="date"
            value={sampaiTanggal}
            onChange={(e) => {
              setSampaiTanggal(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          {(dariTanggal || sampaiTanggal) && (
            <button
              onClick={() => {
                setDariTanggal('');
                setSampaiTanggal('');
                setPage(1);
              }}
              className="text-xs text-rose-400 hover:underline ml-2"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Tanggal & ID</th>
                <th className="px-4 py-3">Sumber & Uraian</th>
                <th className="px-4 py-3 text-right">Kas Masuk (Rp)</th>
                <th className="px-4 py-3 text-right">Kas Keluar (Rp)</th>
                <th className="px-4 py-3 text-right">Saldo Kas (Rp)</th>
                <th className="px-4 py-3">Petugas</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Memuat transaksi buku kas...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-sans">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Tidak ada transaksi buku kas yang sesuai.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isCancelled = t.Status === 'DIBATALKAN';
                  return (
                    <tr
                      key={t.ID_Transaksi}
                      className={`hover:bg-slate-800/40 transition ${isCancelled ? 'opacity-50 line-through bg-rose-950/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-sans font-medium text-slate-200">{t.Tanggal}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{t.ID_Transaksi}</div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <div className="mb-1">{getSumberBadge(t.Sumber_Transaksi)}</div>
                        <div className="text-slate-200 font-medium line-clamp-1">{t.Uraian}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Ref: {t.ID_Sumber} {t.Nomor_Bukti ? `• ${t.Nomor_Bukti}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-400">
                        {t.Jenis_Transaksi === 'KAS_MASUK' && !isCancelled
                          ? `+ ${t.Nominal.toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-400">
                        {t.Jenis_Transaksi === 'KAS_KELUAR' && !isCancelled
                          ? `- ${t.Nominal.toLocaleString('id-ID')}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">
                        Rp {t.Saldo_Akhir.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-sans text-xs text-slate-400">
                        <div>{t.Petugas || '-'}</div>
                        {isCancelled && <div className="text-rose-400 text-[10px] font-bold">DIBATALKAN</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <button
                          onClick={() => setSelectedTransaction(t)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Total: <span className="font-semibold text-slate-200">{totalCount}</span> baris ledger
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

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {selectedTransaction.ID_Transaksi}
                </span>
                <h3 className="text-base font-bold text-slate-100">
                  Detail Transaksi Buku Kas
                </h3>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-1">
                <div className="text-slate-400">Jenis & Sumber Mutasi:</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      selectedTransaction.Jenis_Transaksi === 'KAS_MASUK'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {selectedTransaction.Jenis_Transaksi}
                  </span>
                  {getSumberBadge(selectedTransaction.Sumber_Transaksi)}
                </div>
              </div>

              <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <div>
                  <span className="text-slate-400">Uraian Transaksi:</span>
                  <p className="text-slate-100 font-semibold text-sm mt-0.5">{selectedTransaction.Uraian}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                  <div>
                    <span className="text-slate-400">Nominal:</span>
                    <p className="text-slate-100 font-mono font-bold text-sm">
                      Rp {selectedTransaction.Nominal.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Saldo Akhir:</span>
                    <p className="text-emerald-400 font-mono font-bold text-sm">
                      Rp {selectedTransaction.Saldo_Akhir.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                <div>
                  <span className="text-slate-400">ID Sumber / Berkas Asli:</span>
                  <p className="text-slate-200 font-mono">{selectedTransaction.ID_Sumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Nomor Bukti:</span>
                  <p className="text-slate-200 font-mono">{selectedTransaction.Nomor_Bukti || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Tanggal Pencatatan:</span>
                  <p className="text-slate-200">{selectedTransaction.Tanggal}</p>
                </div>
                <div>
                  <span className="text-slate-400">Petugas Pencatat:</span>
                  <p className="text-slate-200">{selectedTransaction.Petugas || '-'}</p>
                </div>
              </div>

              {selectedTransaction.Status === 'DIBATALKAN' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300">
                  <div className="font-semibold flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5" />
                    Transaksi Telah Dibatalkan
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Alasan: {selectedTransaction.Keterangan}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {isBendaharaOrAdmin && selectedTransaction.Status === 'VALID' ? (
                <button
                  onClick={() => {
                    setCancelModal({
                      id: selectedTransaction.ID_Transaksi,
                      uraian: selectedTransaction.Uraian,
                    });
                  }}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-600/40 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Batalkan Transaksi
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-500" />
              Konfirmasi Pembatalan Transaksi Buku Kas
            </h3>
            <p className="text-xs text-slate-400">
              Anda akan membatalkan transaksi <span className="font-mono text-slate-200">{cancelModal.id}</span> ({cancelModal.uraian}). Saldo buku kas akan dihitung ulang secara otomatis.
            </p>

            <form onSubmit={handleCancelTransaction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alasan Pembatalan *
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Misal: Kesalahan nominal / transaksi dobel / pembatalan resmi..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={cancelSubmitting}
                  onClick={() => setCancelModal(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  {cancelSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Konfirmasi Batalkan'
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
