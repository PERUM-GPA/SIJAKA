import React, { useState, useMemo } from 'react';
import { Search, Receipt, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { PengeluaranReportData } from '../../types/index.ts';

interface PengeluaranReportViewProps {
  data: PengeluaranReportData;
  isLoading?: boolean;
}

export const PengeluaranReportView: React.FC<PengeluaranReportViewProps> = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

  const categoryList = Object.keys(data.categoryBreakdown);

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (categoryFilter !== 'all' && item.Kategori !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.Status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = item.ID_Pengeluaran?.toLowerCase().includes(q);
        const matchUraian = item.Uraian?.toLowerCase().includes(q);
        const matchKat = item.Kategori?.toLowerCase().includes(q);
        const matchBukti = item.Nomor_Bukti?.toLowerCase().includes(q);
        const matchKet = item.Keterangan?.toLowerCase().includes(q);
        if (!matchId && !matchUraian && !matchKat && !matchBukti && !matchKet) {
          return false;
        }
      }
      return true;
    });
  }, [data.items, categoryFilter, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div id="pengeluaran-report-view" className="space-y-4">
      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Nominal Dibayarkan</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.summary.totalNominalDibayar)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">{data.summary.totalDibayarkan} pengeluaran lunas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pengeluaran Dibayar</p>
              <p className="text-lg font-bold text-emerald-700">{data.summary.totalDibayarkan} Item</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Tercatat di Buku Kas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Dalam Proses</p>
              <p className="text-lg font-bold text-blue-700">
                {data.summary.totalDiajukan + data.summary.totalDisetujui} Pengajuan
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            {data.summary.totalDiajukan} diajukan, {data.summary.totalDisetujui} siap bayar
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pengajuan Ditolak</p>
              <p className="text-lg font-bold text-red-700">{data.summary.totalDitolak} Item</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Tidak memenuhi ketentuan</p>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      {categoryList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Distribusi Pengeluaran Per Kategori (Dibayarkan)
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryList.map((cat) => {
              const info = data.categoryBreakdown[cat];
              const pct = data.summary.totalNominalDibayar > 0
                ? Math.round((info.nominal / data.summary.totalNominalDibayar) * 100)
                : 0;
              return (
                <div key={cat} className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900 truncate" title={cat}>{cat}</span>
                    <span className="text-[11px] font-bold text-emerald-700">{pct}%</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatRupiah(info.nominal)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{info.count} transaksi</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            id="input-search-pengeluaran"
            type="text"
            placeholder="Cari uraian pengeluaran, ID, kategori, no bukti..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">Semua Kategori</option>
            {categoryList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="DIBAYARKAN">DIBAYARKAN</option>
            <option value="DISETUJUI">DISETUJUI</option>
            <option value="DIAJUKAN">DIAJUKAN</option>
            <option value="DITOLAK">DITOLAK</option>
          </select>
        </div>
      </div>

      {/* Detailed Expense Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID Pengeluaran</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Uraian</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">No Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Memuat data rekap pengeluaran...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Tidak ada catatan pengeluaran pada filter ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.ID_Pengeluaran} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {item.ID_Pengeluaran}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                      {item.Tanggal_Pengeluaran}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-800 text-[11px]">
                        {item.Kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-medium text-gray-900 truncate" title={item.Uraian}>
                        {item.Uraian}
                      </p>
                      {item.Keterangan && (
                        <p className="text-[11px] text-gray-500 truncate">{item.Keterangan}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-700 whitespace-nowrap">
                      {formatRupiah(item.Nominal)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.Status === 'DIBAYARKAN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> DIBAYARKAN
                        </span>
                      ) : item.Status === 'DISETUJUI' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          <CheckCircle2 className="w-3 h-3" /> DISETUJUI
                        </span>
                      ) : item.Status === 'DITOLAK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" /> DITOLAK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> DIAJUKAN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-gray-600">
                      {item.Metode_Pembayaran}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {item.Nomor_Bukti || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">{filteredItems.length}</span> catatan pengeluaran
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium text-gray-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
