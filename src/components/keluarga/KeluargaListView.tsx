import React, { useState, useEffect } from 'react';
import {
  Users2,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Heart,
  UserCheck,
} from 'lucide-react';
import { Family, Member, RTEnum } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { RTBadge } from '../common/Badge.tsx';
import { KeluargaFormModal } from './KeluargaFormModal.tsx';
import { KeluargaDetailModal } from './KeluargaDetailModal.tsx';

export function KeluargaListView() {
  const { user } = useAuth();
  const role = user?.Role || 'VIEWER';
  const canManage = ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(role);

  // States
  const [families, setFamilies] = useState<(Family & { namaAnggota?: string; noKKAnggota?: string; rtAnggota?: string })[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rtFilter, setRtFilter] = useState<string>('ALL');
  const [hubunganFilter, setHubunganFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ahliWarisFilter, setAhliWarisFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Feedback
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch all members for dropdown
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

  // Fetch Families
  const fetchFamilies = async () => {
    try {
      setIsLoading(true);
      const res = await api.keluarga.list({
        search,
        rt: rtFilter !== 'ALL' ? rtFilter : undefined,
        hubungan: hubunganFilter !== 'ALL' ? hubunganFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        calonAhliWaris: ahliWarisFilter !== 'ALL' ? ahliWarisFilter : undefined,
        page,
        limit: 10,
      });

      if (res.success) {
        setFamilies(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal memuat data keluarga.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, [search, rtFilter, hubunganFilter, statusFilter, ahliWarisFilter, page]);

  const handleOpenCreate = () => {
    setEditingFamily(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (family: Family) => {
    setEditingFamily(family);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (id: string) => {
    setSelectedFamilyId(id);
    setIsDetailModalOpen(true);
  };

  const handleSoftDelete = async (family: Family) => {
    if (!window.confirm(`Yakin ingin menonaktifkan status keluarga ${family.Nama}? Data histori tetap tersimpan.`)) {
      return;
    }

    try {
      const res = await api.keluarga.delete(family.ID_Keluarga);
      setFeedback({ type: 'success', message: res.message || 'Status keluarga dinonaktifkan.' });
      fetchFamilies();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengubah status keluarga.' });
    }
  };

  // Metrics for overview
  const totalAktif = families.filter((f) => f.Status === 'Aktif').length;
  const totalAhliWaris = families.filter((f) => f.Calon_Ahli_Waris === 'Ya').length;

  return (
    <div id="keluarga-view-root" className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <Users2 className="w-6 h-6 text-emerald-600" />
            <span>Data Keluarga & Ahli Waris</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manajemen data tanggungan keluarga dan penetapan calon ahli waris santunan kematian (02_KELUARGA)
          </p>
        </div>

        {canManage && (
          <button
            id="btn-tambah-keluarga"
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Anggota Keluarga</span>
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

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Keluarga Terdaftar</p>
            <p className="text-xl font-bold text-slate-900">{totalCount} Jiwa</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Calon Ahli Waris Terdaftar</p>
            <p className="text-xl font-bold text-slate-900">{totalAhliWaris} Penerima</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Status Keluarga Aktif</p>
            <p className="text-xl font-bold text-slate-900">{totalAktif} Anggota</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-keluarga"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama keluarga, NIK, atau nama anggota..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>

          {/* RT Filter */}
          <div>
            <select
              id="select-filter-rt-keluarga"
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

          {/* Hubungan Filter */}
          <div>
            <select
              id="select-filter-hubungan-keluarga"
              value={hubunganFilter}
              onChange={(e) => {
                setHubunganFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            >
              <option value="ALL">Semua Hubungan</option>
              <option value="Istri">Istri</option>
              <option value="Suami">Suami</option>
              <option value="Anak">Anak</option>
              <option value="Orang Tua">Orang Tua</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Ahli Waris Filter */}
          <div>
            <select
              id="select-filter-ahliwaris"
              value={ahliWarisFilter}
              onChange={(e) => {
                setAhliWarisFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            >
              <option value="ALL">Semua Status Ahli Waris</option>
              <option value="Ya">Calon Ahli Waris (Ya)</option>
              <option value="Tidak">Bukan Ahli Waris (Tidak)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Nama Keluarga</th>
                <th className="px-4 py-3.5">Hubungan</th>
                <th className="px-4 py-3.5">Anggota Utama</th>
                <th className="px-4 py-3.5">RT</th>
                <th className="px-4 py-3.5">Calon Ahli Waris</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat data keluarga...
                  </td>
                </tr>
              ) : families.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data keluarga yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                families.map((family, idx) => (
                  <tr key={family.ID_Keluarga} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                      {(page - 1) * 10 + idx + 1}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{family.Nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {family.ID_Keluarga} {family.NIK ? `• NIK: ${family.NIK}` : ''}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {family.Hubungan}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900">{family.namaAnggota}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{family.ID_Anggota}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      {family.rtAnggota ? <RTBadge rt={family.rtAnggota as RTEnum} /> : '-'}
                    </td>

                    <td className="px-4 py-3.5">
                      {family.Calon_Ahli_Waris === 'Ya' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Ya (Ahli Waris)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Tidak</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          family.Status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {family.Status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(family.ID_Keluarga)}
                        title="Lihat Rincian"
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(family)}
                            title="Ubah Data"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {family.Status === 'Aktif' && (
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(family)}
                              title="Nonaktifkan"
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Menampilkan <span className="font-semibold">{families.length}</span> dari{' '}
            <span className="font-semibold">{totalCount}</span> total keluarga
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

      {/* Modals */}
      <KeluargaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={(msg) => {
          setFeedback({ type: 'success', message: msg });
          fetchFamilies();
        }}
        editingFamily={editingFamily}
        membersList={membersList}
      />

      <KeluargaDetailModal
        familyId={selectedFamilyId}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        canEdit={canManage}
        onEdit={(fam) => handleOpenEdit(fam)}
      />
    </div>
  );
}
