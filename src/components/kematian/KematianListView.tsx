import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  HeartHandshake,
  Calendar,
  MapPin,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';
import { DeathReport, Member, Family } from '../../types/index.ts';

interface EnrichedDeathReport extends DeathReport {
  namaAnggota: string;
  noKK: string;
  nikAnggota: string;
  rtAnggota: string;
  alamatAnggota: string;
  statusSantunan: string;
  idSantunan?: string;
}

interface KematianListViewProps {
  onNavigateToSantunan?: () => void;
}

export function KematianListView({ onNavigateToSantunan }: KematianListViewProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reports, setReports] = useState<EnrichedDeathReport[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rtFilter, setRtFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState<{
    report: DeathReport;
    member?: Member;
    families?: Family[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action Modals
  const [actionModal, setActionModal] = useState<{
    id: string;
    type: 'verify' | 'approve';
    status: 'DIVERIFIKASI' | 'DISETUJUI' | 'DITOLAK';
    title: string;
  } | null>(null);
  const [actionKeterangan, setActionKeterangan] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Create Form State
  const [formIDAnggota, setFormIDAnggota] = useState('');
  const [formTanggalLapor, setFormTanggalLapor] = useState(new Date().toISOString().split('T')[0]);
  const [formPelapor, setFormPelapor] = useState(user?.Nama || '');
  const [formHubunganPelapor, setFormHubunganPelapor] = useState('Keluarga');
  const [formWaktuKematian, setFormWaktuKematian] = useState('');
  const [formTempatKematian, setFormTempatKematian] = useState('Rumah Duka');
  const [formPenyebabKematian, setFormPenyebabKematian] = useState('Sakit');
  const [formDokumenPendukung, setFormDokumenPendukung] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const canManage = ['ADMIN', 'PENGURUS'].includes(user?.Role || '');

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.kematian.list({
        search,
        status: statusFilter,
        rt: rtFilter,
        page,
        limit: 10,
      });

      if (res.success) {
        setReports(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat laporan kematian.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, rtFilter, page, showToast]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await api.anggota.list({ limit: 500, status: 'Aktif' });
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error('Failed to load members for select:', err);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleOpenDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await api.kematian.get(id);
      if (res.success) {
        setSelectedReportDetail({
          report: res.data,
          member: res.data.member,
          families: res.data.families,
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat detail laporan kematian.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIDAnggota || !formPelapor || !formWaktuKematian || !formTempatKematian) {
      showToast('Mohon lengkapi kolom yang bertanda bintang (*).', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await api.kematian.create({
        ID_Anggota: formIDAnggota,
        Tanggal_Lapor: formTanggalLapor,
        Pelapor: formPelapor,
        Hubungan_Pelapor: formHubunganPelapor,
        Waktu_Kematian: formWaktuKematian,
        Tempat_Kematian: formTempatKematian,
        Penyebab_Kematian: formPenyebabKematian,
        Dokumen_Pendukung: formDokumenPendukung,
        Keterangan: formKeterangan,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setShowCreateModal(false);
        // Reset form
        setFormIDAnggota('');
        setFormWaktuKematian('');
        setFormDokumenPendukung('');
        setFormKeterangan('');
        loadReports();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal membuat laporan kematian.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    try {
      setActionSubmitting(true);
      if (actionModal.type === 'verify') {
        const res = await api.kematian.verify(
          actionModal.id,
          actionModal.status as 'DIVERIFIKASI' | 'DITOLAK',
          actionKeterangan
        );
        if (res.success) {
          showToast(res.message, 'success');
        }
      } else {
        const res = await api.kematian.approve(
          actionModal.id,
          actionModal.status as 'DISETUJUI' | 'DITOLAK',
          actionKeterangan
        );
        if (res.success) {
          showToast(res.message, 'success');
        }
      }
      setActionModal(null);
      setActionKeterangan('');
      if (selectedReportDetail) {
        handleOpenDetail(selectedReportDetail.report.ID_Laporan);
      }
      loadReports();
    } catch (error: any) {
      showToast(error.message || 'Gagal memproses aksi.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DIAJUKAN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Diajukan
          </span>
        );
      case 'DIVERIFIKASI':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Diverifikasi
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Disetujui
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Santunan Selesai
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
            <UserCheck className="w-6 h-6 text-rose-400" />
            Laporan Kematian Jamaah
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pencatatan berita duka, verifikasi pengurus, dan proses awal pengajuan santunan kematian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadReports()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Buat Laporan Duka
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID laporan, nama almarhum, No KK, pelapor..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition"
            >
              <option value="ALL">Semua Status</option>
              <option value="DIAJUKAN">Diajukan</option>
              <option value="DIVERIFIKASI">Diverifikasi</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="SELESAI">Selesai</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={rtFilter}
              onChange={(e) => {
                setRtFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition"
            >
              <option value="ALL">Semua RT</option>
              <option value="06">RT 06</option>
              <option value="07">RT 07</option>
              <option value="10">RT 10</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">ID Laporan</th>
                <th className="px-4 py-3">Almarhum / Anggota</th>
                <th className="px-4 py-3">RT / KK</th>
                <th className="px-4 py-3">Waktu & Tempat</th>
                <th className="px-4 py-3">Pelapor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Memuat data laporan kematian...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Tidak ada data laporan kematian yang cocok.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.ID_Laporan} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-300">
                      {report.ID_Laporan}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{report.namaAnggota}</div>
                      <div className="text-xs text-slate-400">ID: {report.ID_Anggota}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 mr-2 font-mono">
                        RT {report.rtAnggota || '-'}
                      </span>
                      <span className="text-slate-400 font-mono">{report.noKK}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-slate-200">{report.Waktu_Kematian}</div>
                      <div className="text-slate-400 truncate max-w-[180px]">{report.Tempat_Kematian}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-slate-200">{report.Pelapor}</div>
                      <div className="text-slate-400">({report.Hubungan_Pelapor})</div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(report.Status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenDetail(report.ID_Laporan)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
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
              Total: <span className="font-semibold text-slate-200">{totalCount}</span> data laporan
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

      {/* Modal: Create Report */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-rose-500" />
                Formulir Laporan Kematian Jamaah
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Anggota / Kepala Keluarga yang Meninggal *
                </label>
                <select
                  required
                  value={formIDAnggota}
                  onChange={(e) => setFormIDAnggota(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Pilih Anggota --</option>
                  {members.map((m) => (
                    <option key={m.ID_Anggota} value={m.ID_Anggota}>
                      {m.Nama} (ID: {m.ID_Anggota} - RT {m.RT} - KK: {m.No_KK})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tanggal Lapor *
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggalLapor}
                    onChange={(e) => setFormTanggalLapor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Waktu / Tanggal Kematian *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 21 Agustus 2026, 04:30 WIB"
                    value={formWaktuKematian}
                    onChange={(e) => setFormWaktuKematian(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Pelapor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPelapor}
                    onChange={(e) => setFormPelapor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hubungan Pelapor *
                  </label>
                  <select
                    value={formHubunganPelapor}
                    onChange={(e) => setFormHubunganPelapor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Istri">Istri</option>
                    <option value="Suami">Suami</option>
                    <option value="Anak">Anak</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Mertua">Mertua</option>
                    <option value="Menantu">Menantu</option>
                    <option value="Pengurus RT">Pengurus RT</option>
                    <option value="Tetangga / Warga">Tetangga / Warga</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tempat Kematian *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTempatKematian}
                    onChange={(e) => setFormTempatKematian(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Penyebab Kematian
                  </label>
                  <input
                    type="text"
                    value={formPenyebabKematian}
                    onChange={(e) => setFormPenyebabKematian(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dokumen Pendukung / Surat Kematian (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Nomor Surat RS / Keterangan RT / Link Dokumen"
                  value={formDokumenPendukung}
                  onChange={(e) => setFormDokumenPendukung(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Laporan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Report */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-rose-400 font-bold">
                  {selectedReportDetail.report.ID_Laporan}
                </span>
                <h3 className="text-lg font-bold text-slate-100">
                  Detail Laporan Kematian
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Status Header */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Status Laporan:</div>
                  <div className="mt-1">{getStatusBadge(selectedReportDetail.report.Status)}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>Tanggal Lapor: <span className="text-slate-200 font-medium">{selectedReportDetail.report.Tanggal_Lapor}</span></div>
                  {selectedReportDetail.report.Tanggal_Verifikasi && (
                    <div>Diverifikasi oleh: <span className="text-slate-200">{selectedReportDetail.report.Petugas_Verifikasi}</span></div>
                  )}
                  {selectedReportDetail.report.Tanggal_Persetujuan && (
                    <div>Disetujui oleh: <span className="text-slate-200">{selectedReportDetail.report.Disetujui_Oleh}</span></div>
                  )}
                </div>
              </div>

              {/* Data Almarhum */}
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-400" />
                  Identitas Almarhum / Kepala Keluarga
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Nama Lengkap:</span>
                    <p className="text-slate-200 font-semibold">{selectedReportDetail.member?.Nama || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">ID Anggota:</span>
                    <p className="text-slate-200 font-mono">{selectedReportDetail.report.ID_Anggota}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Nomor KK:</span>
                    <p className="text-slate-200 font-mono">{selectedReportDetail.member?.No_KK || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Wilayah RT:</span>
                    <p className="text-slate-200">RT {selectedReportDetail.member?.RT || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Alamat:</span>
                    <p className="text-slate-200">{selectedReportDetail.member?.Alamat || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Detail Kejadian & Pelapor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Waktu & Lokasi Duka
                  </h4>
                  <div>
                    <span className="text-slate-400">Waktu Kematian:</span>
                    <p className="text-slate-200 font-medium">{selectedReportDetail.report.Waktu_Kematian}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Tempat Kematian:</span>
                    <p className="text-slate-200 font-medium">{selectedReportDetail.report.Tempat_Kematian}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Penyebab Kematian:</span>
                    <p className="text-slate-200">{selectedReportDetail.report.Penyebab_Kematian || '-'}</p>
                  </div>
                </div>

                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Data Pelapor & Dokumen
                  </h4>
                  <div>
                    <span className="text-slate-400">Nama Pelapor:</span>
                    <p className="text-slate-200 font-medium">{selectedReportDetail.report.Pelapor}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Hubungan Pelapor:</span>
                    <p className="text-slate-200">{selectedReportDetail.report.Hubungan_Pelapor}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Dokumen Pendukung:</span>
                    <p className="text-slate-200">{selectedReportDetail.report.Dokumen_Pendukung || 'Tidak dilampirkan'}</p>
                  </div>
                </div>
              </div>

              {/* Ahli Waris Keluarga */}
              {selectedReportDetail.families && selectedReportDetail.families.length > 0 && (
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-emerald-400" />
                    Anggota Keluarga Tercatat (Calon Penerima Santunan)
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedReportDetail.families.map((fam) => (
                      <div
                        key={fam.ID_Keluarga}
                        className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-100">{fam.Nama}</span>
                          <span className="text-slate-400 ml-2">({fam.Hubungan})</span>
                        </div>
                        {fam.Calon_Ahli_Waris === 'Ya' && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">
                            Ahli Waris Utama
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons for Pengurus / Admin */}
              {canManage && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Tindakan Pengurus:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedReportDetail.report.Status === 'DIAJUKAN' && (
                      <>
                        <button
                          onClick={() =>
                            setActionModal({
                              id: selectedReportDetail.report.ID_Laporan,
                              type: 'verify',
                              status: 'DIVERIFIKASI',
                              title: 'Verifikasi Laporan Kematian',
                            })
                          }
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Verifikasi Laporan
                        </button>
                        <button
                          onClick={() =>
                            setActionModal({
                              id: selectedReportDetail.report.ID_Laporan,
                              type: 'verify',
                              status: 'DITOLAK',
                              title: 'Tolak Laporan Kematian',
                            })
                          }
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Tolak Laporan
                        </button>
                      </>
                    )}

                    {selectedReportDetail.report.Status === 'DIVERIFIKASI' && (
                      <>
                        <button
                          onClick={() =>
                            setActionModal({
                              id: selectedReportDetail.report.ID_Laporan,
                              type: 'approve',
                              status: 'DISETUJUI',
                              title: 'Persetujuan Laporan Kematian',
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Setujui Laporan
                        </button>
                        <button
                          onClick={() =>
                            setActionModal({
                              id: selectedReportDetail.report.ID_Laporan,
                              type: 'approve',
                              status: 'DITOLAK',
                              title: 'Tolak Persetujuan Laporan',
                            })
                          }
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Tolak Laporan
                        </button>
                      </>
                    )}

                    {selectedReportDetail.report.Status === 'DISETUJUI' && onNavigateToSantunan && (
                      <button
                        onClick={() => {
                          setSelectedReportDetail(null);
                          onNavigateToSantunan();
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        Buka Modul Santunan Kematian
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Verification/Approval Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">{actionModal.title}</h3>
            <p className="text-xs text-slate-400">
              Anda akan memproses laporan <span className="font-mono text-slate-200">{actionModal.id}</span> menjadi status{' '}
              <span className="font-bold text-rose-400">{actionModal.status}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                rows={2}
                value={actionKeterangan}
                onChange={(e) => setActionKeterangan(e.target.value)}
                placeholder="Tambahkan catatan verifikasi atau alasan penolakan..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                disabled={actionSubmitting}
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
              >
                Batal
              </button>
              <button
                disabled={actionSubmitting}
                onClick={handleExecuteAction}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
              >
                {actionSubmitting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
