import React, { useState, useMemo } from 'react';
import { Search, ArrowDownLeft, ArrowUpRight, CheckCircle, XCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { CashbookReportData } from '../../types/index.ts';

interface BukuKasReportViewProps {
  data: CashbookReportData;
  isLoading?: boolean;
}

export const BukuKasReportView: React.FC<BukuKasReportViewProps> = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'VALID' | 'DIBATALKAN'>('all');
  const [jenisFilter, setJenisFilter] = useState<'all' | 'KAS_MASUK' | 'KAS_KELUAR'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

  const filteredItems = useMemo(() => {
    return data.items.filter((tx) => {
      if (statusFilter !== 'all' && tx.Status !== statusFilter) return false;
      if (jenisFilter !== 'all' && tx.Jenis_Transaksi !== jenisFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchId = tx.ID_Transaksi?.toLowerCase().includes(query);
        const matchUraian = tx.Uraian?.toLowerCase().includes(query);
        const matchNama = tx.namaAnggota?.toLowerCase().includes(query);
        const matchSumber = tx.Sumber_Transaksi?.toLowerCase().includes(query);
        const matchPetugas = tx.Petugas?.toLowerCase().includes(query);
        if (!matchId && !matchUraian && !matchNama && !matchSumber && !matchPetugas) {
          return false;
        }
      }
      return true;
    });
  }, [data.items, statusFilter, jenisFilter, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div id="buku-kas-report-view" className="space-y-4">
      {/* Header Summary Banner */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Kas Masuk</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatRupiah(data.summary.totalMasuk)}</p>
          <span className="text-[11px] text-gray-500">Dalam periode terpilih</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Total Kas Keluar</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatRupiah(data.summary.totalKeluar)}</p>
          <span className="text-[11px] text-gray-500">Dalam periode terpilih</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Arus Kas Bersih</p>
          <p className={`text-lg font-bold mt-0.5 ${data.summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {data.summary.netCashFlow >= 0 ? '+' : ''}{formatRupiah(data.summary.netCashFlow)}
          </p>
          <span className="text-[11px] text-gray-500">Surplus / Defisit Periode</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Saldo Kas Riil</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatRupiah(data.summary.saldoKasSaatIni)}</p>
          <span className="text-[11px] text-teal-600 font-medium">Single Source of Truth</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            id="input-search-cashbook"
            type="text"
            placeholder="Cari ID transaksi, uraian, nama anggota, petugas..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2" />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2">
          {/* Jenis Transaksi */}
          <select
            id="select-filter-jenis-kas"
            value={jenisFilter}
            onChange={(e) => {
              setJenisFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Jenis</option>
            <option value="KAS_MASUK">Kas Masuk</option>
            <option value="KAS_KELUAR">Kas Keluar</option>
          </select>

          {/* Status */}
          <select
            id="select-filter-status-kas"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="VALID">VALID</option>
            <option value="DIBATALKAN">DIBATALKAN</option>
          </select>
        </div>
      </div>

      {/* Cashbook Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">ID Transaksi</th>
                <th className="py-3 px-4">Jenis & Sumber</th>
                <th className="py-3 px-4">Uraian / Anggota</th>
                <th className="py-3 px-4 text-right">Kas Masuk</th>
                <th className="py-3 px-4 text-right">Kas Keluar</th>
                <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Memuat data buku kas...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Tidak ada transaksi buku kas pada filter ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((tx) => {
                  const isMasuk = tx.Jenis_Transaksi === 'KAS_MASUK';
                  const isDibatalkan = tx.Status === 'DIBATALKAN';

                  return (
                    <tr
                      key={tx.ID_Transaksi}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isDibatalkan ? 'bg-gray-50/50 opacity-60 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">{tx.Tanggal}</td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                        {tx.ID_Transaksi}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isMasuk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <ArrowDownLeft className="w-3 h-3" /> MASUK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              <ArrowUpRight className="w-3 h-3" /> KELUAR
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                            {tx.Sumber_Transaksi}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-medium text-gray-900 truncate" title={tx.Uraian}>
                          {tx.Uraian}
                        </p>
                        {tx.namaAnggota && (
                          <p className="text-[11px] text-gray-500 truncate">
                            {tx.namaAnggota} {tx.rtAnggota ? `(RT ${tx.rtAnggota})` : ''}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                        {tx.Kas_Masuk ? formatRupiah(tx.Kas_Masuk) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-red-700 whitespace-nowrap">
                        {tx.Kas_Keluar ? formatRupiah(tx.Kas_Keluar) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatRupiah(tx.Saldo)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.Status === 'VALID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3" /> VALID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                            <XCircle className="w-3 h-3" /> DIBATALKAN
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">{filteredItems.length}</span> transaksi
            {filteredItems.length !== data.items.length && ` (difilter dari ${data.items.length} total)`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium text-gray-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
