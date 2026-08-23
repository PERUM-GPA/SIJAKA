import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  CreditCard,
  HeartHandshake,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  Phone,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Building2,
  Receipt,
  UserCheck,
  Info,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../lib/api.ts';
import { Member, Family, Contribution, MemberArrearsInfo } from '../../types/index.ts';
import { formatRupiah, formatDateIndo } from '../../lib/formatters.ts';
import { ChangePasswordModal } from './ChangePasswordModal.tsx';
import { MemberFamilyModal } from './MemberFamilyModal.tsx';
import { MemberEditProfileModal } from './MemberEditProfileModal.tsx';
import { KwitansiModal } from '../iuran/KwitansiModal.tsx';

interface MemberProfileData {
  member: Member;
  families: Family[];
  contributions: Contribution[];
  arrears: MemberArrearsInfo;
  policy: {
    namaLembaga: string;
    wilayah: string;
    iuranBulanan: number;
    patokanSantunan?: number;
    masaTungguHari: number;
  };
}

export function MemberDashboardView() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [data, setData] = useState<MemberProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'keluarga' | 'iuran' | 'santunan' | 'akun'>('keluarga');

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [selectedKwitansi, setSelectedKwitansi] = useState<Contribution | null>(null);

  // Delete family confirmation
  const [familyToDelete, setFamilyToDelete] = useState<Family | null>(null);
  const [isDeletingFamily, setIsDeletingFamily] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.member.getMyProfile();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat profil anggota.');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleDeleteFamily = async () => {
    if (!familyToDelete) return;
    try {
      setIsDeletingFamily(true);
      await api.member.deleteFamily(familyToDelete.ID_Keluarga);
      toastSuccess(`Data ${familyToDelete.Nama} berhasil dinonaktifkan dari KK.`, 'Sukses');
      setFamilyToDelete(null);
      fetchProfile();
    } catch (err: any) {
      toastError(err.message || 'Gagal menonaktifkan data keluarga.');
    } finally {
      setIsDeletingFamily(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div id="member-loading-state" className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Memuat data Kartu Keluarga...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div id="member-empty-state" className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Akun Belum Ditautkan</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Akun Anda belum memiliki tautan nomor Kartu Keluarga (KK). Silakan hubungi pengurus RT Anda.
        </p>
        <button
          type="button"
          onClick={fetchProfile}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const { member, families, contributions, arrears, policy } = data;
  const activeFamilies = families.filter((f) => f.Status === 'Aktif');
  const isUpToDate = arrears.totalNominalTunggakan === 0;

  return (
    <div id="member-dashboard-root" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Security Alert: Forced Change Password Banner */}
      {user?.MustChangePassword && (
        <div
          id="member-password-warning-banner"
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Pengamanan Akun: Harap Atur Password Baru
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Akun Anda masih menggunakan kata sandi awal/bawaan. Segera perbarui password untuk melindungi data keluarga Anda.
              </p>
            </div>
          </div>
          <button
            id="btn-banner-change-password"
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-950/20 flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Ganti Password Sekarang</span>
          </button>
        </div>
      )}

      {/* 2. Welcome & Member Identity Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        {/* Role-Based Sapaan */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Assalamu'alaikum, Selamat Datang di SIJAKA
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Semoga SIJAKA memudahkan Bapak/Ibu dalam mendapatkan informasi kepesertaan, keluarga, dan layanan jamaah.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                RT {member.RT}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                KK: {member.No_KK}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                ID: {member.ID_Anggota}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Keluarga {member.Nama}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{member.Alamat || 'Perum GPA Ngijo'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <button
              id="btn-edit-profile-top"
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Perbarui Kontak / Alamat</span>
            </button>
            <button
              id="btn-refresh-profile"
              type="button"
              onClick={fetchProfile}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. 4 Key Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Kepesertaan */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kepesertaan</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {member.Status}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Terdaftar sejak {formatDateIndo(member.Tanggal_Daftar)}
            </p>
          </div>
        </div>

        {/* Total Anggota Keluarga */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Keluarga di KK</span>
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {activeFamilies.length + 1} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Jiwa Terdaftar</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              1 Kepala KK + {activeFamilies.length} Anggota
            </p>
          </div>
        </div>

        {/* Status Iuran Bulan Ini */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Iuran Bulan Ini</span>
            <div
              className={`p-2 rounded-xl ${
                arrears.statusPembayaranBulanIni === 'SUDAH_BAYAR'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-1.5">
              {arrears.statusPembayaranBulanIni === 'SUDAH_BAYAR' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500" />
              )}
              <p
                className={`text-base font-bold ${
                  arrears.statusPembayaranBulanIni === 'SUDAH_BAYAR'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {arrears.statusPembayaranBulanIni === 'SUDAH_BAYAR' ? 'Lunas Terbayar' : 'Belum Terbayar'}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {formatRupiah(policy.iuranBulanan)} / bulan
            </p>
          </div>
        </div>

        {/* Status Tunggakan */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tunggakan Iuran</span>
            <div
              className={`p-2 rounded-xl ${
                isUpToDate
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-lg font-black ${
                isUpToDate
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatRupiah(arrears.totalNominalTunggakan)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {isUpToDate ? 'Kewajiban lunas' : `${arrears.jumlahBulanTunggakan} bulan tertunda`}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          id="tab-member-keluarga"
          type="button"
          onClick={() => setActiveTab('keluarga')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'keluarga'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Anggota Keluarga ({activeFamilies.length + 1})</span>
        </button>

        <button
          id="tab-member-iuran"
          type="button"
          onClick={() => setActiveTab('iuran')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'iuran'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Riwayat Iuran ({contributions.length})</span>
        </button>

        <button
          id="tab-member-santunan"
          type="button"
          onClick={() => setActiveTab('santunan')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'santunan'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Hak Santunan & Alur Layanan</span>
        </button>

        <button
          id="tab-member-akun"
          type="button"
          onClick={() => setActiveTab('akun')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'akun'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Keamanan & Akun</span>
        </button>
      </div>

      {/* 5. TAB 1: KELUARGA */}
      {activeTab === 'keluarga' && (
        <div id="section-member-keluarga" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Jiwa dalam Kartu Keluarga
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seluruh anggota keluarga yang terdaftar berhak atas jaminan sosial kematian SIJAKA
              </p>
            </div>
            <button
              id="btn-add-family-member"
              type="button"
              onClick={() => {
                setSelectedFamily(null);
                setIsFamilyModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Anggota Keluarga</span>
            </button>
          </div>

          {/* Master Head of Family Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/40 dark:border-emerald-500/30 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    KEPALA KELUARGA
                  </span>
                  <span className="text-xs text-slate-400 font-mono">NIK: {member.NIK}</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{member.Nama}</h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span>Tempat, Tgl Lahir: {member.Tempat_Lahir || '-'}, {formatDateIndo(member.Tanggal_Lahir)}</span>
                  <span>No. HP: {member.No_HP || '-'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Kontak</span>
                </button>
              </div>
            </div>
          </div>

          {/* Family List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeFamilies.map((fam) => {
              const isAhliWaris = fam.Calon_Ahli_Waris === 'Ya';

              return (
                <div
                  key={fam.ID_Keluarga}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {fam.Hubungan}
                      </span>
                      {isAhliWaris && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center space-x-1">
                          <HeartHandshake className="w-3 h-3" />
                          <span>Calon Ahli Waris</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{fam.Nama}</h4>

                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      <p>NIK: {fam.NIK || '-'}</p>
                      <p>
                        Lahir: {fam.Tempat_Lahir || '-'}, {formatDateIndo(fam.Tanggal_Lahir)}
                      </p>
                      {fam.No_HP && <p>No. HP: {fam.No_HP}</p>}
                      {fam.Keterangan && (
                        <p className="text-[11px] text-slate-400 italic mt-1">
                          Catatan: {fam.Keterangan}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFamily(fam);
                        setIsFamilyModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFamilyToDelete(fam)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Nonaktifkan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {activeFamilies.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Belum ada anggota keluarga tambahan terdaftar di KK Anda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFamily(null);
                  setIsFamilyModalOpen(true);
                }}
                className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                + Tambah Anggota Keluarga
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 2: RIWAYAT IURAN */}
      {activeTab === 'iuran' && (
        <div id="section-member-iuran" className="space-y-4">
          {/* Summary Arrears Banner if any */}
          {arrears.totalNominalTunggakan > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Terdapat Tunggakan Iuran</p>
                <p className="mt-0.5">
                  KK Anda memiliki {arrears.jumlahBulanTunggakan} bulan iuran yang belum tercatat (Total: {formatRupiah(arrears.totalNominalTunggakan)}). Silakan lakukan penyetoran iuran ke Bendahara RT masing-masing.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-3 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Iuran KK Anda Tertib & Lunas</p>
                <p className="mt-0.5">
                  Terima kasih atas kedisiplinan Anda dalam menjaga keberlanjutan dana sosial Jamaah Tahlil Ar Rohman.
                </p>
              </div>
            </div>
          )}

          {/* Contributions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Buku Riwayat Pembayaran Iuran
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total {contributions.length} Transaksi Tercatat
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">No. Kwitansi</th>
                    <th className="px-6 py-3">Periode</th>
                    <th className="px-6 py-3">Tanggal Bayar</th>
                    <th className="px-6 py-3">Nominal</th>
                    <th className="px-6 py-3">Metode</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {contributions.map((c) => (
                    <tr key={c.ID_Iuran} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {c.No_Kwitansi || c.ID_Iuran}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        Bulan {c.Periode_Bulan} / {c.Periode_Tahun}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                        {formatDateIndo(c.Tanggal_Bayar)}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(c.Jumlah)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {c.Metode_Bayar || 'Tunai'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedKwitansi(c)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Kwitansi</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {contributions.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Belum ada catatan transaksi iuran yang diinput oleh bendahara.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: HAK SANTUNAN & ALUR LAYANAN */}
      {activeTab === 'santunan' && (
        <div id="section-member-santunan" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Hak & Manfaat Santunan Duka</span>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                Layanan & Santunan Jamaah
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Diserahkan langsung kepada ahli waris sah yang terdaftar dalam KK saat musibah duka terjadi.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Masa Tunggu Manfaat</span>
              <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                {policy.masaTungguHari || 0} Hari (Langsung Aktif)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Perlindungan aktif penuh setelah pendaftaran anggota disetujui pengurus.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Wilayah Naungan</span>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {policy.wilayah || 'RT 06 • RT 07 • RT 10'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {policy.namaLembaga || 'Jamaah Tahlil Ar Rohman'}
              </p>
            </div>
          </div>

          {/* SOP Alur Pelaporan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <HeartHandshake className="w-5 h-5 text-emerald-500" />
              <span>Prosedur Pelaporan Kematian & Pencairan Santunan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white">Lapor ke Pengurus RT</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Keluarga/ahli waris menghubungi Pengurus RT 06, 07, atau 10 segera saat musibah terjadi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white">Verifikasi Lapangan</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Pengurus memverifikasi data almarhum di database SIJAKA dan memastikan syarat masa tunggu terpenuhi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white">Persetujuan Santunan</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Ketua/Admin SIJAKA menyetujui penerbitan santunan duka secara formal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white">Pencairan Dana Kas</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Bendahara mencairkan uang santunan tunai/transfer kepada ahli waris yang ditunjuk.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: KEAMANAN & AKUN */}
      {activeTab === 'akun' && (
        <div id="section-member-akun" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Informasi Akun & Kata Sandi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola keamanan akun login mandiri Anda di SIJAKA
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Username Login:</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{user?.Username}</p>
                <p className="text-[11px] text-slate-400">Dapat juga login menggunakan No. KK atau NIK</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Role Hak Akses:</span>
                <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">ANGGOTA (WARGA)</p>
                <p className="text-[11px] text-slate-400">Hak akses data privat Kartu Keluarga Anda sendiri</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kata Sandi Akun</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ubah kata sandi secara berkala untuk menjaga kerahasiaan data keluarga.
                </p>
              </div>
              <button
                id="btn-open-change-password-tab"
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ubah Kata Sandi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        isForced={Boolean(user?.MustChangePassword)}
      />

      {/* 2. Family Form Modal */}
      <MemberFamilyModal
        isOpen={isFamilyModalOpen}
        onClose={() => {
          setIsFamilyModalOpen(false);
          setSelectedFamily(null);
        }}
        familyData={selectedFamily}
        onSaved={fetchProfile}
      />

      {/* 3. Edit Profile Modal */}
      <MemberEditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        member={member}
        onSaved={fetchProfile}
      />

      {/* 4. Kwitansi Modal */}
      <KwitansiModal
        isOpen={Boolean(selectedKwitansi)}
        onClose={() => setSelectedKwitansi(null)}
        contribution={
          selectedKwitansi
            ? {
                ...selectedKwitansi,
                namaAnggota: member.Nama,
                rtAnggota: member.RT,
              }
            : null
        }
      />

      {/* 5. Delete Family Confirmation Modal */}
      {familyToDelete && (
        <div
          id="delete-family-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nonaktifkan Anggota?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menonaktifkan <strong>{familyToDelete.Nama}</strong> ({familyToDelete.Hubungan}) dari daftar keluarga KK Anda?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setFamilyToDelete(null)}
                disabled={isDeletingFamily}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteFamily}
                disabled={isDeletingFamily}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isDeletingFamily ? 'Memproses...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
