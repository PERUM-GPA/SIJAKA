import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
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
  UserCheck,
  User,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';
import { Compensation, DeathReport, Member, Family } from '../../types/index.ts';

interface EnrichedSantunan extends Compensation {
  namaAnggota: string;
  noKK: string;
  rtAnggota: string;
  laporanTanggal: string;
  statusLaporan: string;
  isDisbursed: boolean;
}

export function SantunanListView() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [santunanList, setSantunanList] = useState<EnrichedSantunan[]>([]);
  const [deathReports, setDeathReports] = useState<DeathReport[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    santunan: Compensation;
    member?: Member;
    report?: DeathReport;
    families?: Family[];
  } | null>(null);

  // Action Modals
  const [actionModal, setActionModal] = useState<{
    id: string;
    type: 'verify' | 'approve';
    status: 'TERVERIFIKASI' | 'DISETUJUI' | 'DITOLAK';
    title: string;
  } | null>(null);
  const [actionKeterangan, setActionKeterangan] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Disbursement Modal
  const [disburseModal, setDisburseModal] = useState<{
    santunan: Compensation;
  } | null>(null);
  const [disburseTanggal, setDisburseTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [disburseMetode, setDisburseMetode] = useState('Tunai');
  const [disburseNomorBukti, setDisburseNomorBukti] = useState('');
  const [disburseBukti, setDisburseBukti] = useState('');
  const [disburseKeterangan, setDisburseKeterangan] = useState('');
  const [disburseSubmitting, setDisburseSubmitting] = useState(false);

  // Create Form State
  const [formIDLaporan, setFormIDLaporan] = useState('');
  const [formIDAnggota, setFormIDAnggota] = useState('');
  const [formIDAhliWaris, setFormIDAhliWaris] = useState('');
  const [formNamaPenerima, setFormNamaPenerima] = useState('');
  const [formHubunganPenerima, setFormHubunganPenerima] = useState('');
  const [formNominal, setFormNominal] = useState(600000);
  const [formTanggalPengajuan, setFormTanggalPengajuan] = useState(new Date().toISOString().split('T')[0]);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [availableHeirs, setAvailableHeirs] = useState<Family[]>([]);

  const isBendaharaOrAdmin = ['ADMIN', 'BENDAHARA'].includes(user?.Role || '');
  const isPengurusOrAdmin = ['ADMIN', 'PENGURUS'].includes(user?.Role || '');

  const loadSantunan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.santunan.list({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });

      if (res.success) {
        setSantunanList(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat daftar santunan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, showToast]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [reportsRes, membersRes, familiesRes] = await Promise.all([
        api.kematian.list({ status: 'DISETUJUI', limit: 200 }),
        api.anggota.list({ limit: 500 }),
        api.keluarga.list({ limit: 1000 }),
      ]);

      if (reportsRes.success) setDeathReports(reportsRes.data);
      if (membersRes.success) setMembers(membersRes.data);
      if (familiesRes.success) setFamilies(familiesRes.data);
    } catch (err) {
      console.error('Failed to load reference data for santunan:', err);
    }
  }, []);

  useEffect(() => {
    loadSantunan();
  }, [loadSantunan]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // When selecting death report in create form, auto-fill Anggota and find candidate heirs
  const handleSelectDeathReport = (laporanId: string) => {
    setFormIDLaporan(laporanId);
    const report = deathReports.find((r) => r.ID_Laporan === laporanId);
    if (report) {
      setFormIDAnggota(report.ID_Anggota);
      const memberHeirs = families.filter((f) => f.ID_Anggota === report.ID_Anggota && f.Status === 'Aktif');
      setAvailableHeirs(memberHeirs);

      // Auto-select primary heir if exists
      const primaryHeir = memberHeirs.find((h) => h.Calon_Ahli_Waris === 'Ya') || memberHeirs[0];
      if (primaryHeir) {
        setFormIDAhliWaris(primaryHeir.ID_Keluarga);
        setFormNamaPenerima(primaryHeir.Nama);
        setFormHubunganPenerima(primaryHeir.Hubungan);
      } else {
        setFormIDAhliWaris('WARIS_DEFAULT');
        setFormNamaPenerima(report.Pelapor);
        setFormHubunganPenerima(report.Hubungan_Pelapor);
      }
    } else {
      setFormIDAnggota('');
      setAvailableHeirs([]);
      setFormIDAhliWaris('');
      setFormNamaPenerima('');
      setFormHubunganPenerima('');
    }
  };

  const handleSelectHeir = (famId: string) => {
    setFormIDAhliWaris(famId);
    const heir = availableHeirs.find((h) => h.ID_Keluarga === famId);
    if (heir) {
      setFormNamaPenerima(heir.Nama);
      setFormHubunganPenerima(heir.Hubungan);
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await api.santunan.get(id);
      if (res.success) {
        setSelectedDetail({
          santunan: res.data,
          member: res.data.member,
          report: res.data.report,
          families: res.data.families,
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat detail santunan.', 'error');
    }
  };

  const handleCreateSantunan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIDLaporan || !formIDAnggota || !formIDAhliWaris || !formNamaPenerima || !formHubunganPenerima) {
      showToast('Mohon lengkapi seluruh isian data santunan.', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await api.santunan.create({
        ID_Laporan: formIDLaporan,
        ID_Anggota: formIDAnggota,
        ID_AhliWaris: formIDAhliWaris,
        Nama_Penerima: formNamaPenerima,
        Hubungan_Penerima: formHubunganPenerima,
        Nominal_Santunan: formNominal,
        Tanggal_Pengajuan: formTanggalPengajuan,
        Keterangan: formKeterangan,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setShowCreateModal(false);
        // Reset form
        setFormIDLaporan('');
        setFormIDAnggota('');
        setFormIDAhliWaris('');
        setFormNamaPenerima('');
        setFormHubunganPenerima('');
        setFormKeterangan('');
        loadSantunan();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal membuat pengajuan santunan.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    try {
      setActionSubmitting(true);
      if (actionModal.type === 'verify') {
        const res = await api.santunan.verify(
          actionModal.id,
          actionModal.status as 'TERVERIFIKASI' | 'DITOLAK',
          actionKeterangan
        );
        if (res.success) showToast(res.message, 'success');
      } else {
        const res = await api.santunan.approve(
          actionModal.id,
          actionModal.status as 'DISETUJUI' | 'DITOLAK',
          actionKeterangan
        );
        if (res.success) showToast(res.message, 'success');
      }
      setActionModal(null);
      setActionKeterangan('');
      if (selectedDetail) {
        handleOpenDetail(selectedDetail.santunan.ID_Santunan);
      }
      loadSantunan();
    } catch (error: any) {
      showToast(error.message || 'Gagal memproses aksi persetujuan santunan.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleExecuteDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModal) return;
    if (!disburseMetode) {
      showToast('Pilih metode pencairan santunan.', 'error');
      return;
    }

    try {
      setDisburseSubmitting(true);
      const res = await api.santunan.disburse(disburseModal.santunan.ID_Santunan, {
        Tanggal_Pencairan: disburseTanggal,
        Metode_Pencairan: disburseMetode,
        Nomor_Bukti: disburseNomorBukti,
        Bukti_Pencairan: disburseBukti,
        Keterangan: disburseKeterangan,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setDisburseModal(null);
        if (selectedDetail) {
          handleOpenDetail(selectedDetail.santunan.ID_Santunan);
        }
        loadSantunan();
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal memproses pencairan santunan.', 'error');
    } finally {
      setDisburseSubmitting(false);
    }
  };

  const getStatusBadge = (santunan: EnrichedSantunan | Compensation) => {
    if (santunan.Tanggal_Pencairan) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Banknote className="w-3 h-3 mr-1" />
          Sudah Cair
        </span>
      );
    }

    if (santunan.Status_Persetujuan === 'DISETUJUI') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Siap Cair (Disetujui)
        </span>
      );
    }

    if (santunan.Status_Verifikasi === 'TERVERIFIKASI') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Terverifikasi
        </span>
      );
    }

    if (santunan.Status_Persetujuan === 'DITOLAK' || santunan.Status_Verifikasi === 'DITOLAK') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          Ditolak
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3 mr-1" />
        Menunggu
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-purple-400" />
            Santunan Kematian Jamaah
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pengelolaan klaim duka, verifikasi ahli waris, persetujuan, dan pencairan kas otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSantunan()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPengurusOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Ajukan Santunan
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Total Pengajuan</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{totalCount}</div>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-amber-400 font-medium">Menunggu Verifikasi</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {santunanList.filter((s) => s.Status_Verifikasi === 'MENUNGGU').length}
          </div>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-blue-400 font-medium">Siap Dicairkan</div>
          <div className="text-2xl font-bold text-blue-300 mt-1">
            {santunanList.filter((s) => s.Status_Persetujuan === 'DISETUJUI' && !s.Tanggal_Pencairan).length}
          </div>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-emerald-400 font-medium">Telah Dicairkan</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {santunanList.filter((s) => s.Tanggal_Pencairan).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID santunan, nama penerima, nama anggota, No KK..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition"
          >
            <option value="ALL">Semua Status</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="TERVERIFIKASI">Terverifikasi</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="CAIR">Sudah Cair</option>
            <option value="BELUM_CAIR">Belum Cair</option>
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
                <th className="px-4 py-3">ID Santunan</th>
                <th className="px-4 py-3">Almarhum / Anggota</th>
                <th className="px-4 py-3">Penerima Santunan</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Tgl Pengajuan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                    Memuat data santunan...
                  </td>
                </tr>
              ) : santunanList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Tidak ada data santunan yang cocok.
                  </td>
                </tr>
              ) : (
                santunanList.map((item) => (
                  <tr key={item.ID_Santunan} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-purple-400">
                      {item.ID_Santunan}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{item.namaAnggota}</div>
                      <div className="text-xs text-slate-400">
                        RT {item.rtAnggota} • Lap: {item.ID_Laporan}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-slate-200">{item.Nama_Penerima}</div>
                      <div className="text-slate-400">({item.Hubungan_Penerima})</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-100">
                      Rp {Number(item.Nominal_Santunan || 600000).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {item.Tanggal_Pengajuan}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(item)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(item.ID_Santunan)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                        >
                          Detail
                        </button>
                        {isBendaharaOrAdmin &&
                          item.Status_Persetujuan === 'DISETUJUI' &&
                          !item.Tanggal_Pencairan && (
                            <button
                              onClick={() => setDisburseModal({ santunan: item })}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                            >
                              Cairkan
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
              Total: <span className="font-semibold text-slate-200">{totalCount}</span> data santunan
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

      {/* Modal: Create Santunan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-purple-400" />
                Formulir Pengajuan Santunan Kematian
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSantunan} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Berkas Laporan Kematian (Telah Disetujui Pengurus) *
                </label>
                <select
                  required
                  value={formIDLaporan}
                  onChange={(e) => handleSelectDeathReport(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Pilih Laporan Kematian --</option>
                  {deathReports.map((r) => {
                    const m = members.find((mem) => mem.ID_Anggota === r.ID_Anggota);
                    return (
                      <option key={r.ID_Laporan} value={r.ID_Laporan}>
                        {r.ID_Laporan} — {m?.Nama || r.ID_Anggota} (RT {m?.RT || '-'}) - Wafat: {r.Waktu_Kematian}
                      </option>
                    );
                  })}
                </select>
              </div>

              {availableHeirs.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Calon Ahli Waris / Penerima dari Kartu Keluarga
                  </label>
                  <select
                    value={formIDAhliWaris}
                    onChange={(e) => handleSelectHeir(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {availableHeirs.map((h) => (
                      <option key={h.ID_Keluarga} value={h.ID_Keluarga}>
                        {h.Nama} ({h.Hubungan}) {h.Calon_Ahli_Waris === 'Ya' ? '★ Ahli Waris Utama' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Penerima Santunan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNamaPenerima}
                    onChange={(e) => setFormNamaPenerima(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Hubungan dengan Almarhum *
                  </label>
                  <input
                    type="text"
                    required
                    value={formHubunganPenerima}
                    onChange={(e) => setFormHubunganPenerima(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nominal Santunan (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formNominal}
                    onChange={(e) => setFormNominal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Standar ketentuan: Rp 600.000 / kejadian</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tanggal Pengajuan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggalPengajuan}
                    onChange={(e) => setFormTanggalPengajuan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Catatan pengajuan santunan..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pengajuan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Santunan */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold">
                  {selectedDetail.santunan.ID_Santunan}
                </span>
                <h3 className="text-lg font-bold text-slate-100">
                  Detail Santunan Duka Jamaah
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Status Header */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Status Santunan:</div>
                  <div className="mt-1">{getStatusBadge(selectedDetail.santunan)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Nominal Santunan:</div>
                  <div className="text-base font-bold text-emerald-400">
                    Rp {Number(selectedDetail.santunan.Nominal_Santunan || 600000).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Data Almarhum & Penerima */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-rose-400" />
                    Data Almarhum / Anggota
                  </div>
                  <p className="text-slate-100 font-bold">{selectedDetail.member?.Nama || '-'}</p>
                  <p className="text-slate-400">No KK: <span className="text-slate-200">{selectedDetail.member?.No_KK || '-'}</span></p>
                  <p className="text-slate-400">Wilayah: <span className="text-slate-200">RT {selectedDetail.member?.RT || '-'}</span></p>
                  <p className="text-slate-400">ID Laporan: <span className="text-slate-200 font-mono">{selectedDetail.santunan.ID_Laporan}</span></p>
                </div>

                <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/60 space-y-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-purple-400" />
                    Penerima / Ahli Waris
                  </div>
                  <p className="text-slate-100 font-bold">{selectedDetail.santunan.Nama_Penerima}</p>
                  <p className="text-slate-400">Hubungan: <span className="text-slate-200">{selectedDetail.santunan.Hubungan_Penerima}</span></p>
                  <p className="text-slate-400">ID Ahli Waris: <span className="text-slate-200 font-mono">{selectedDetail.santunan.ID_AhliWaris}</span></p>
                  <p className="text-slate-400">Tgl Pengajuan: <span className="text-slate-200">{selectedDetail.santunan.Tanggal_Pengajuan}</span></p>
                </div>
              </div>

              {/* Detail Verifikasi & Pencairan */}
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-400" />
                  Riwayat Verifikasi & Pencairan
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400">Verifikasi:</span>
                    <p className="text-slate-200 font-medium">{selectedDetail.santunan.Status_Verifikasi}</p>
                    <p className="text-[11px] text-slate-500">{selectedDetail.santunan.Petugas_Verifikasi || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Persetujuan:</span>
                    <p className="text-slate-200 font-medium">{selectedDetail.santunan.Status_Persetujuan}</p>
                    <p className="text-[11px] text-slate-500">{selectedDetail.santunan.Disetujui_Oleh || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pencairan Kas:</span>
                    <p className="text-slate-200 font-medium">{selectedDetail.santunan.Tanggal_Pencairan || 'Belum Cair'}</p>
                    <p className="text-[11px] text-slate-500">{selectedDetail.santunan.Metode_Pencairan || '-'}</p>
                  </div>
                </div>
                {selectedDetail.santunan.Nomor_Bukti && (
                  <div className="pt-2 border-t border-slate-700/60 text-slate-400">
                    Nomor Bukti Transaksi: <span className="font-mono text-slate-200">{selectedDetail.santunan.Nomor_Bukti}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                <div className="text-xs font-semibold text-slate-300">Tindakan Persetujuan & Pencairan:</div>
                <div className="flex flex-wrap gap-2">
                  {isPengurusOrAdmin && selectedDetail.santunan.Status_Verifikasi === 'MENUNGGU' && (
                    <>
                      <button
                        onClick={() =>
                          setActionModal({
                            id: selectedDetail.santunan.ID_Santunan,
                            type: 'verify',
                            status: 'TERVERIFIKASI',
                            title: 'Verifikasi Santunan',
                          })
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Verifikasi Santunan
                      </button>
                      <button
                        onClick={() =>
                          setActionModal({
                            id: selectedDetail.santunan.ID_Santunan,
                            type: 'verify',
                            status: 'DITOLAK',
                            title: 'Tolak Verifikasi Santunan',
                          })
                        }
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Tolak Verifikasi
                      </button>
                    </>
                  )}

                  {isPengurusOrAdmin &&
                    selectedDetail.santunan.Status_Verifikasi === 'TERVERIFIKASI' &&
                    selectedDetail.santunan.Status_Persetujuan === 'MENUNGGU' && (
                      <>
                        <button
                          onClick={() =>
                            setActionModal({
                              id: selectedDetail.santunan.ID_Santunan,
                              type: 'approve',
                              status: 'DISETUJUI',
                              title: 'Setujui Santunan Kematian',
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Setujui Santunan
                        </button>
                        <button
                          onClick={() =>
                            setActionModal({
                              id: selectedDetail.santunan.ID_Santunan,
                              type: 'approve',
                              status: 'DITOLAK',
                              title: 'Tolak Santunan',
                            })
                          }
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
                        >
                          Tolak Santunan
                        </button>
                      </>
                    )}

                  {isBendaharaOrAdmin &&
                    selectedDetail.santunan.Status_Persetujuan === 'DISETUJUI' &&
                    !selectedDetail.santunan.Tanggal_Pencairan && (
                      <button
                        onClick={() => {
                          setDisburseModal({ santunan: selectedDetail.santunan });
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                      >
                        <Banknote className="w-4 h-4" />
                        Proses Pencairan Kas
                      </button>
                    )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Verification/Approval Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">{actionModal.title}</h3>
            <p className="text-xs text-slate-400">
              Anda akan memproses pengajuan santunan <span className="font-mono text-slate-200">{actionModal.id}</span> menjadi status{' '}
              <span className="font-bold text-purple-400">{actionModal.status}</span>.
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
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
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
              >
                {actionSubmitting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disbursement (Pencairan Kas) Modal */}
      {disburseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                Pencairan Kas Santunan Kematian
              </h3>
              <button
                onClick={() => setDisburseModal(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
              <div className="text-emerald-300 font-semibold">
                Nominal: Rp {Number(disburseModal.santunan.Nominal_Santunan || 600000).toLocaleString('id-ID')}
              </div>
              <div className="text-slate-300">
                Penerima: <span className="font-semibold">{disburseModal.santunan.Nama_Penerima}</span> ({disburseModal.santunan.Hubungan_Penerima})
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Pencairan ini akan otomatis memotong saldo Kas SIJAKA dan mencatat transaksi KAS_KELUAR di Buku Kas.
              </p>
            </div>

            <form onSubmit={handleExecuteDisbursement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Tanggal Pencairan Kas *
                </label>
                <input
                  type="date"
                  required
                  value={disburseTanggal}
                  onChange={(e) => setDisburseTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Metode Penyerahan / Pencairan *
                </label>
                <select
                  required
                  value={disburseMetode}
                  onChange={(e) => setDisburseMetode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Tunai">Tunai (Diserahkan Langsung ke Rumah Duka)</option>
                  <option value="Transfer">Transfer Bank / Rekening Ahli Waris</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nomor Bukti / Kwitansi / Ref Transfer
                </label>
                <input
                  type="text"
                  placeholder="Contoh: KW-DUKA/2026/08/001"
                  value={disburseNomorBukti}
                  onChange={(e) => setDisburseNomorBukti(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan Penyerahan
                </label>
                <textarea
                  rows={2}
                  value={disburseKeterangan}
                  onChange={(e) => setDisburseKeterangan(e.target.value)}
                  placeholder="Keterangan saksi atau penyerahan santunan..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={disburseSubmitting}
                  onClick={() => setDisburseModal(null)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={disburseSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  {disburseSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memproses Buku Kas...
                    </>
                  ) : (
                    'Konfirmasi Pencairan Kas'
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
