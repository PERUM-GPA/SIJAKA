import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit2,
  User,
  MapPin,
  Calendar,
  Phone,
  CreditCard,
  Building2,
  FileText,
  Clock,
  Users2,
  Receipt,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Heart,
} from 'lucide-react';
import { Member, Family, Contribution, MemberArrearsInfo } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge, RTBadge } from '../common/Badge.tsx';
import { formatDateIndo, formatRupiah } from '../../lib/formatters.ts';
import { KeluargaFormModal } from '../keluarga/KeluargaFormModal.tsx';
import { IuranFormModal } from '../iuran/IuranFormModal.tsx';
import { KwitansiModal } from '../iuran/KwitansiModal.tsx';

const MONTH_NAMES = [
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

interface AnggotaDetailViewProps {
  memberId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

export function AnggotaDetailView({
  memberId,
  onBack,
  onEdit,
}: AnggotaDetailViewProps) {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [arrearsInfo, setArrearsInfo] = useState<MemberArrearsInfo | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'profil' | 'keluarga' | 'iuran'>('profil');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isKeluargaModalOpen, setIsKeluargaModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [isIuranModalOpen, setIsIuranModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Contribution | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canEdit = ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user?.Role || '');

  const fetchAllMemberData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [memberRes, famRes, iuranRes, arrearsRes] = await Promise.all([
        api.anggota.get(memberId),
        api.keluarga.getByMember(memberId).catch(() => ({ success: true, data: [] as Family[] })),
        api.iuran.getByMember(memberId).catch(() => ({ success: true, data: [] as Contribution[] })),
        api.iuran.getMemberArrears(memberId).catch(() => ({ success: true, data: null })),
      ]);

      if (memberRes.success && memberRes.data) {
        setMember(memberRes.data);
      } else {
        setError('Data anggota tidak ditemukan.');
      }

      if (famRes.success && famRes.data) {
        setFamilies(famRes.data);
      }

      if (iuranRes.success && iuranRes.data) {
        setContributions(iuranRes.data);
      }

      if (arrearsRes.success && arrearsRes.data) {
        setArrearsInfo(arrearsRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail anggota.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMemberData();
  }, [memberId]);

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs sm:text-sm text-slate-500">Memuat data lengkap anggota...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4 border border-slate-200">
        <p className="text-sm text-rose-600 font-semibold">{error || 'Data tidak ditemukan.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  return (
    <div id="anggota-detail-root" className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-from-detail"
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Anggota</span>
        </button>

        {canEdit && (
          <button
            id="btn-edit-from-detail"
            type="button"
            onClick={() => onEdit(member.ID_Anggota)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            <span>Ubah Data Anggota</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span className="text-xs sm:text-sm font-medium">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline ml-4 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Profile Card Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xl flex items-center justify-center">
              {member.Nama.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {member.Nama}
                </h1>
                <StatusBadge status={member.Status} />
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">
                ID Anggota: <span className="text-emerald-400 font-bold">{member.ID_Anggota}</span>
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col sm:items-end gap-2 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Wilayah:</span>
              <RTBadge rt={member.RT} />
            </div>
            <p className="text-[11px] text-slate-400">Perum GPA Ngijo</p>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-3 gap-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('profil')}
            className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'profil'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil Anggota</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('keluarga')}
            className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'keluarga'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>Keluarga & Ahli Waris ({families.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('iuran')}
            className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 -mb-[1px] cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'iuran'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Riwayat Iuran & Tunggakan ({contributions.length})</span>
            {arrearsInfo && arrearsInfo.totalBulanTunggakan > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>

        {/* TAB 1: PROFIL ANGGOTA */}
        {activeSubTab === 'profil' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Section 1: Kependudukan */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>Data Kependudukan (01_ANGGOTA)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Nomor Induk Kependudukan (NIK)</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                    {member.NIK}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-1">Nomor Kartu Keluarga (No. KK)</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                    {member.No_KK}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-1">Tempat & Tanggal Lahir</span>
                  <span className="font-medium text-slate-900">
                    {member.Tempat_Lahir}, {formatDateIndo(member.Tanggal_Lahir)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Domisili & Kontak */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Domisili & Kontak</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Alamat Lengkap</span>
                  <span className="font-medium text-slate-900">{member.Alamat}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-1">Rukun Tetangga (RT)</span>
                  <span className="font-medium text-slate-900">RT {member.RT} Perum GPA Ngijo</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-xs mb-1">Nomor HP / WhatsApp</span>
                  <span className="font-mono font-semibold text-slate-900 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{member.No_HP || '-'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Status & Riwayat Keanggotaan */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-4 pb-2 border-b border-slate-100 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Riwayat & Keterangan</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-xs mb-1">Tanggal Terdaftar</span>
                  <span className="font-medium text-slate-900">
                    {formatDateIndo(member.Tanggal_Daftar)}
                  </span>
                </div>

                {member.Tanggal_Nonaktif && (
                  <div>
                    <span className="text-slate-500 block text-xs mb-1">Tanggal Nonaktif / Status</span>
                    <span className="font-medium text-rose-700">
                      {formatDateIndo(member.Tanggal_Nonaktif)}
                    </span>
                  </div>
                )}

                <div className="sm:col-span-2 md:col-span-3">
                  <span className="text-slate-500 block text-xs mb-1">Keterangan / Catatan</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                    {member.Keterangan || 'Tidak ada catatan khusus.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA KELUARGA & AHLI WARIS */}
        {activeSubTab === 'keluarga' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Daftar Anggota Keluarga & Ahli Waris
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tercatat {families.length} anggota keluarga dalam kartu keluarga anggota ini
                </p>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFamily(null);
                    setIsKeluargaModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Keluarga</span>
                </button>
              )}
            </div>

            {families.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Users2 className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Belum ada data anggota keluarga / ahli waris yang terdaftar.
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFamily(null);
                      setIsKeluargaModalOpen(true);
                    }}
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    + Daftarkan anggota keluarga sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Hubungan</th>
                      <th className="px-4 py-3">NIK & TTL</th>
                      <th className="px-4 py-3">Calon Ahli Waris</th>
                      <th className="px-4 py-3">Status</th>
                      {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {families.map((fam) => (
                      <tr key={fam.ID_Keluarga} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{fam.Nama}</span>
                          <span className="text-[11px] font-mono text-slate-400">{fam.ID_Keluarga}</span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {fam.Hubungan}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-mono text-xs block text-slate-700">{fam.NIK || '-'}</span>
                          <span className="text-[11px] text-slate-400">
                            {fam.Tanggal_Lahir ? formatDateIndo(fam.Tanggal_Lahir) : '-'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {fam.Calon_Ahli_Waris === 'Ya' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Ahli Waris Utama</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Bukan</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              fam.Status === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {fam.Status}
                          </span>
                        </td>

                        {canEdit && (
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFamily(fam);
                                setIsKeluargaModalOpen(true);
                              }}
                              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RIWAYAT IURAN & MONITORING TUNGGAKAN */}
        {activeSubTab === 'iuran' && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Arrears status overview */}
            {arrearsInfo && (
              <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-600">Status Pembayaran:</span>
                    {arrearsInfo.totalBulanTunggakan > 0 ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Menunggak {arrearsInfo.totalBulanTunggakan} Bulan</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tertib & Lunas</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Total kewajiban tercatat:{' '}
                    <span className="font-semibold text-slate-800 font-mono">
                      {arrearsInfo.totalBulanLunas} / {arrearsInfo.totalBulanWajib} Bulan Lunas
                    </span>
                    {arrearsInfo.totalBulanTunggakan > 0 && (
                      <span className="text-rose-700 font-bold ml-2">
                        (Tunggakan: {formatRupiah(arrearsInfo.totalNominalTunggakan)})
                      </span>
                    )}
                  </p>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsIuranModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Bayar Iuran</span>
                  </button>
                )}
              </div>
            )}

            {/* List of Transactions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Riwayat Transaksi Iuran Masuk (03_IURAN)
              </h3>

              {contributions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Belum ada riwayat pembayaran iuran yang tercatat untuk anggota ini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">ID & Tanggal</th>
                        <th className="px-4 py-3">Periode</th>
                        <th className="px-4 py-3">Nominal</th>
                        <th className="px-4 py-3">Metode</th>
                        <th className="px-4 py-3">Petugas</th>
                        <th className="px-4 py-3 text-right">Kuitansi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contributions.map((c) => (
                        <tr key={c.ID_Iuran} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <span className="font-mono font-semibold text-slate-900 block">{c.ID_Iuran}</span>
                            <span className="text-[11px] text-slate-500">{formatDateIndo(c.Tanggal_Bayar)}</span>
                          </td>

                          <td className="px-4 py-3 font-semibold text-emerald-800">
                            {MONTH_NAMES[c.Periode_Bulan]} {c.Periode_Tahun}
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {formatRupiah(c.Nominal)}
                          </td>

                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {c.Metode}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {c.Petugas}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(c)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Kuitansi</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <KeluargaFormModal
        isOpen={isKeluargaModalOpen}
        onClose={() => setIsKeluargaModalOpen(false)}
        onSuccess={(msg) => {
          setFeedback({ type: 'success', message: msg });
          fetchAllMemberData();
        }}
        editingFamily={editingFamily}
        defaultMemberId={member.ID_Anggota}
        membersList={[member]}
      />

      <IuranFormModal
        isOpen={isIuranModalOpen}
        onClose={() => setIsIuranModalOpen(false)}
        onSuccess={(msg) => {
          setFeedback({ type: 'success', message: msg });
          fetchAllMemberData();
        }}
        defaultMemberId={member.ID_Anggota}
        membersList={[member]}
      />

      <KwitansiModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        contribution={
          selectedReceipt
            ? {
                ...selectedReceipt,
                namaAnggota: member.Nama,
                rtAnggota: member.RT,
              }
            : null
        }
      />
    </div>
  );
}
