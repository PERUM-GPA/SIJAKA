import React, { useState, useMemo } from 'react';
import { Search, HeartHandshake, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { SantunanReportData } from '../../types/index.ts';

interface SantunanReportViewProps {
  data: SantunanReportData;
  isLoading?: boolean;
}

export const SantunanReportView: React.FC<SantunanReportViewProps> = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRT, setSelectedRT] = useState<'all' | '06' | '07' | '10'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'DICAIRKAN' | 'DISETUJUI' | 'MENUNGGU' | 'DITOLAK'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (selectedRT !== 'all' && item.rt !== selectedRT) return false;

      if (statusFilter !== 'all') {
        if (statusFilter === 'DICAIRKAN' && !item.Tanggal_Pencairan) return false;
        if (statusFilter === 'DISETUJUI' && item.Status_Persetujuan !== 'DISETUJUI') return false;
        if (statusFilter === 'MENUNGGU' && item.Status_Persetujuan !== 'MENUNGGU') return false;
        if (statusFilter === 'DITOLAK' && item.Status_Persetujuan !== 'DITOLAK') return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = item.ID_Santunan?.toLowerCase().includes(q);
        const matchLaporan = item.ID_Laporan?.toLowerCase().includes(q);
        const matchNama = item.namaAnggota?.toLowerCase().includes(q);
        const matchPenerima = item.Nama_Penerima?.toLowerCase().includes(q);
        const matchBukti = item.Nomor_Bukti?.toLowerCase().includes(q);
        if (!matchId && !matchLaporan && !matchNama && !matchPenerima && !matchBukti) {
          return false;
        }
      }
      return true;
    });
  }, [data.items, selectedRT, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div id="santunan-report-view" className="space-y-4">
      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Santunan Dicairkan</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.summary.totalNominalDicairkan)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">{data.summary.totalDicairkan} kasus telah disalurkan</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pengajuan Disetujui</p>
              <p className="text-lg font-bold text-emerald-700">{data.summary.totalDisetujui} Pengajuan</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Dari {data.summary.totalPengajuan} total klaim diajukan</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Laporan Kematian</p>
              <p className="text-lg font-bold text-blue-700">{data.summary.totalLaporanKematian} Laporan</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Tercatat di sistem</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-center shrink-0">
              <span className="font-bold text-sm">IDR</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Standar Santunan / Jiwa</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.summary.standardNominal)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Sesuai AD/ART Jamaah</p>
        </div>
      </div>

      {/* RT Level Santunan Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['06', '07', '10'] as const).map((rtKey) => {
          const rtData = data.rtSummary[rtKey] || { count: 0, totalNominal: 0 };
          return (
            <div key={rtKey} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                  RT {rtKey}
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                  {rtData.count} Kasus
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-gray-500">Total Santunan Dicairkan:</span>
                <span className="font-bold text-gray-900">{formatRupiah(rtData.totalNominal)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            id="input-search-santunan"
            type="text"
            placeholder="Cari almarhum, ID santunan, penerima, no bukti..."
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
            value={selectedRT}
            onChange={(e) => {
              setSelectedRT(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">Semua RT</option>
            <option value="06">RT 06</option>
            <option value="07">RT 07</option>
            <option value="10">RT 10</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="DICAIRKAN">DICAIRKAN</option>
            <option value="DISETUJUI">DISETUJUI</option>
            <option value="MENUNGGU">MENUNGGU</option>
            <option value="DITOLAK">DITOLAK</option>
          </select>
        </div>
      </div>

      {/* Santunan Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID Santunan</th>
                <th className="py-3 px-4">Almarhum / Anggota</th>
                <th className="py-3 px-4">RT</th>
                <th className="py-3 px-4">Penerima & Hubungan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4">Tgl Pengajuan</th>
                <th className="py-3 px-4">Tgl Pencairan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">No Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Memuat data rekap santunan...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Tidak ada catatan santunan pada filter ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.ID_Santunan} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {item.ID_Santunan}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{item.namaAnggota || 'Anggota'}</p>
                      <p className="text-[11px] text-gray-400 font-mono">Lap: {item.ID_Laporan}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 text-[11px]">
                        RT {item.rt || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{item.Nama_Penerima}</p>
                      <span className="text-[11px] text-gray-500">{item.Hubungan_Penerima}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-rose-700 whitespace-nowrap">
                      {formatRupiah(item.Nominal_Santunan)}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                      {item.Tanggal_Pengajuan}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                      {item.Tanggal_Pencairan || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.Tanggal_Pencairan ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> DICAIRKAN
                        </span>
                      ) : item.Status_Persetujuan === 'DISETUJUI' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          <CheckCircle2 className="w-3 h-3" /> DISETUJUI
                        </span>
                      ) : item.Status_Persetujuan === 'DITOLAK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" /> DITOLAK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> MENUNGGU
                        </span>
                      )}
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
            Menampilkan <span className="font-semibold text-gray-900">{filteredItems.length}</span> santunan
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
