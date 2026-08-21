import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Member, RTEnum, MemberStatus } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { StatusBadge, RTBadge } from '../common/Badge.tsx';
import { ConfirmModal } from '../common/ConfirmModal.tsx';
import { formatDateIndo } from '../../lib/formatters.ts';

interface AnggotaListViewProps {
  onAddMember: () => void;
  onViewDetail: (id: string) => void;
  onEditMember: (id: string) => void;
}

export function AnggotaListView({
  onAddMember,
  onViewDetail,
  onEditMember,
}: AnggotaListViewProps) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRT, setFilterRT] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '');
  const canDelete = user?.Role === 'ADMIN';

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.anggota.list({
        search,
        rt: filterRT,
        status: filterStatus,
        page,
        limit,
      });

      if (res.success) {
        setMembers(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      console.error('Error fetching members:', err);
      toastError(err.message || 'Gagal memuat data anggota.');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterRT, filterStatus, page, limit, toastError]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const res = await api.anggota.delete(deleteTarget.ID_Anggota);
      if (res.success) {
        success(res.message, 'Berhasil Dihapus');
        setDeleteTarget(null);
        fetchMembers();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menghapus anggota.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="anggota-list-root" className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Data Anggota Jamaah
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              01_ANGGOTA
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Database keanggotaan terpusat Jamaah Tahlil Ar Rohman (RT 06 • RT 07 • RT 10)
          </p>
        </div>

        {canEdit && (
          <button
            id="btn-tambah-anggota"
            onClick={onAddMember}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-anggota"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan Nama, NIK, No. KK, atau Alamat..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* RT Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="select-filter-rt" className="text-xs font-semibold text-slate-500 shrink-0">
              RT:
            </label>
            <select
              id="select-filter-rt"
              value={filterRT}
              onChange={(e) => {
                setFilterRT(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua RT (06, 07, 10)</option>
              <option value="06">RT 06</option>
              <option value="07">RT 07</option>
              <option value="10">RT 10</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="select-filter-status" className="text-xs font-semibold text-slate-500 shrink-0">
              Status:
            </label>
            <select
              id="select-filter-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
              <option value="Meninggal">Meninggal</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            id="btn-refresh-anggota"
            type="button"
            onClick={() => fetchMembers()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Muat ulang tabel"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </form>

        {/* Quick Result Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Menampilkan <strong>{members.length}</strong> dari total <strong>{totalCount}</strong> anggota
          </span>
          {(search || filterRT !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterRT('ALL');
                setFilterStatus('ALL');
                setPage(1);
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs sm:text-sm text-slate-500">Memuat data anggota dari database...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Tidak ada data anggota ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || filterRT !== 'ALL' || filterStatus !== 'ALL'
                ? 'Tidak ada data yang cocok dengan kriteria pencarian Anda.'
                : 'Belum ada anggota terdaftar. Klik tombol Tambah Anggota untuk memulai.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID / NIK</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">RT</th>
                  <th className="py-3 px-4">Kontak / HP</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tgl Daftar</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr
                    key={member.ID_Anggota}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900">{member.ID_Anggota}</span>
                      <p className="text-[11px] font-mono text-slate-400">{member.NIK}</p>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{member.Nama}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {member.Alamat}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <RTBadge rt={member.RT} />
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {member.No_HP || '-'}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={member.Status} />
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDateIndo(member.Tanggal_Daftar)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          id={`btn-detail-${member.ID_Anggota}`}
                          onClick={() => onViewDetail(member.ID_Anggota)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            id={`btn-edit-${member.ID_Anggota}`}
                            onClick={() => onEditMember(member.ID_Anggota)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            id={`btn-delete-${member.ID_Anggota}`}
                            onClick={() => setDeleteTarget(member)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                            title="Hapus Anggota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </p>
            <div className="flex items-center space-x-2">
              <button
                id="btn-prev-page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <button
                id="btn-next-page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Data Anggota"
        message={`Apakah Anda yakin ingin menghapus data anggota ${deleteTarget?.Nama} (${deleteTarget?.ID_Anggota})? Tindakan ini akan dicatat ke 09_LOG_AKTIVITAS.`}
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
