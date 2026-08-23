import React, { useState, useMemo } from 'react';
import { Search, Users, CheckCircle, Clock, Percent, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { IuranReportData } from '../../types/index.ts';

interface IuranReportViewProps {
  data: IuranReportData;
  isLoading?: boolean;
}

export const IuranReportView: React.FC<IuranReportViewProps> = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRT, setSelectedRT] = useState<'all' | '06' | '07' | '10'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Lunas' | 'Pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatRupiah = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

  const monthNames = [
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

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (selectedRT !== 'all' && item.rt !== selectedRT) return false;
      if (selectedStatus !== 'all' && item.Status !== selectedStatus) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNama = item.namaKepalaKeluarga?.toLowerCase().includes(q);
        const matchId = item.ID_Iuran?.toLowerCase().includes(q);
        const matchAnggota = item.ID_Anggota?.toLowerCase().includes(q);
        const matchKuitansi = item.Nomor_Kuitansi?.toLowerCase().includes(q);
        if (!matchNama && !matchId && !matchAnggota && !matchKuitansi) {
          return false;
        }
      }
      return true;
    });
  }, [data.items, selectedRT, selectedStatus, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  return (
    <div id="iuran-report-view" className="space-y-4">
      {/* Top 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Penerimaan Iuran</p>
              <p className="text-lg font-bold text-gray-900">{formatRupiah(data.summary.totalNominal)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">{data.summary.totalTransaksi} transaksi iuran lunas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">KK Sudah Membayar</p>
              <p className="text-lg font-bold text-emerald-700">{data.summary.kkSudahBayar} KK</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Dari total {data.summary.totalKK} KK aktif</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">KK Belum Membayar</p>
              <p className="text-lg font-bold text-amber-700">{data.summary.kkBelumBayar} KK</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">Perlu monitoring bendahara/RT</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Persentase Kepatuhan</p>
              <p className="text-lg font-bold text-blue-700">{data.summary.persentaseKepatuhan}%</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.summary.persentaseKepatuhan, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* RT Level Compliance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['06', '07', '10'] as const).map((rtKey) => {
          const rtData = data.rtSummary[rtKey] || { totalKK: 0, paidKK: 0, totalNominal: 0, rate: 0 };
          return (
            <div key={rtKey} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                  RT {rtKey}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {rtData.rate}% Lunas
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-gray-500">KK Lunas / Total:</span>
                <span className="font-semibold text-gray-800">
                  {rtData.paidKK} / {rtData.totalKK} KK
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(rtData.rate, 100)}%` }}
                />
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Terkumpul:</span>
                <span className="font-semibold text-gray-900">{formatRupiah(rtData.totalNominal)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            id="input-search-iuran"
            type="text"
            placeholder="Cari nama KK, ID Iuran, no kuitansi..."
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
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="Lunas">Lunas</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Detailed Contributions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID Iuran</th>
                <th className="py-3 px-4">Kepala Keluarga</th>
                <th className="py-3 px-4">RT</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Tgl Bayar</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">No Kuitansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Memuat data rekap iuran...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Tidak ada catatan iuran pada filter ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.ID_Iuran} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {item.ID_Iuran}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{item.namaKepalaKeluarga}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{item.ID_Anggota}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 text-[11px]">
                        RT {item.rt}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-800">
                      {monthNames[item.Periode_Bulan]} {item.Periode_Tahun}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                      {item.Tanggal_Bayar || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] text-gray-600">{item.Metode || 'Tunai'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                      {formatRupiah(item.Nominal)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.Status === 'Lunas' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> LUNAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {item.Nomor_Kuitansi || '-'}
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
            Menampilkan <span className="font-semibold text-gray-900">{filteredItems.length}</span> catatan iuran
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
