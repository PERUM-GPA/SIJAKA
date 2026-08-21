import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  UserPlus,
  Edit3,
  AlertCircle,
  Building2,
  Calendar,
  Phone,
  FileText,
} from 'lucide-react';
import { Member, RTEnum, MemberStatus } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface AnggotaFormViewProps {
  memberId?: string; // If provided, mode is EDIT. If undefined, mode is ADD.
  onBack: () => void;
  onSuccess: () => void;
}

export function AnggotaFormView({
  memberId,
  onBack,
  onSuccess,
}: AnggotaFormViewProps) {
  const { success, error: toastError } = useToast();
  const isEdit = Boolean(memberId);

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [noKK, setNoKK] = useState('');
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [alamat, setAlamat] = useState('');
  const [rt, setRt] = useState<RTEnum>('06');
  const [noHP, setNoHP] = useState('');
  const [status, setStatus] = useState<MemberStatus>('Aktif');
  const [tanggalDaftar, setTanggalDaftar] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalNonaktif, setTanggalNonaktif] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Load existing member if in edit mode
  useEffect(() => {
    if (!memberId) return;

    const loadMember = async () => {
      try {
        setIsLoading(true);
        const res = await api.anggota.get(memberId);
        if (res.success && res.data) {
          const m = res.data;
          setNoKK(m.No_KK || '');
          setNik(m.NIK || '');
          setNama(m.Nama || '');
          setTempatLahir(m.Tempat_Lahir || '');
          setTanggalLahir(m.Tanggal_Lahir || '');
          setAlamat(m.Alamat || '');
          setRt(m.RT || '06');
          setNoHP(m.No_HP || '');
          setStatus(m.Status || 'Aktif');
          setTanggalDaftar(m.Tanggal_Daftar || '');
          setTanggalNonaktif(m.Tanggal_Nonaktif || '');
          setKeterangan(m.Keterangan || '');
        }
      } catch (err: any) {
        toastError(err.message || 'Gagal memuat data anggota.');
        onBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadMember();
  }, [memberId, onBack, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!noKK.trim() || !nik.trim() || !nama.trim() || !tempatLahir.trim() || !tanggalLahir || !alamat.trim() || !noHP.trim()) {
      setFormError('Mohon lengkapi semua kolom wajib bertanda bintang (*).');
      return;
    }

    if (nik.trim().length !== 16) {
      setFormError('NIK harus berupa 16 digit angka sesuai KTP.');
      return;
    }

    if (noKK.trim().length !== 16) {
      setFormError('Nomor Kartu Keluarga (KK) harus berupa 16 digit angka.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        No_KK: noKK.trim(),
        NIK: nik.trim(),
        Nama: nama.trim(),
        Tempat_Lahir: tempatLahir.trim(),
        Tanggal_Lahir: tanggalLahir,
        Alamat: alamat.trim(),
        RT: rt,
        No_HP: noHP.trim(),
        Status: status,
        Tanggal_Daftar: tanggalDaftar,
        Tanggal_Nonaktif: status !== 'Aktif' ? tanggalNonaktif || new Date().toISOString().split('T')[0] : undefined,
        Keterangan: keterangan.trim() || undefined,
      };

      if (isEdit && memberId) {
        const res = await api.anggota.update(memberId, payload);
        if (res.success) {
          success(res.message, 'Berhasil Disimpan');
          onSuccess();
        }
      } else {
        const res = await api.anggota.create(payload);
        if (res.success) {
          success(res.message, 'Anggota Ditambahkan');
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('Submit member error:', err);
      setFormError(err.message || 'Gagal menyimpan data anggota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs sm:text-sm text-slate-500">Memuat formulir anggota...</p>
      </div>
    );
  }

  return (
    <div id="anggota-form-root" className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-list"
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Anggota</span>
        </button>

        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {isEdit ? `Edit: ${memberId}` : 'Anggota Baru'}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            {isEdit ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Ubah Data Anggota' : 'Pendaftaran Anggota Jamaah Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEdit
                ? 'Perbarui informasi data anggota. Perubahan akan dicatat di 09_LOG_AKTIVITAS.'
                : 'ID Anggota otomatis digenerate berurutan (misal: A00001, A00002...).'}
            </p>
          </div>
        </div>

        {formError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Identitas Kependudukan */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
              1. Identitas Kependudukan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* NIK */}
              <div>
                <label htmlFor="input-nik" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Induk Kependudukan (NIK) *
                </label>
                <input
                  id="input-nik"
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 3507181205750001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1 font-mono">16 digit angka KTP (Harus Unik)</p>
              </div>

              {/* No KK */}
              <div>
                <label htmlFor="input-no-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Kartu Keluarga (No. KK) *
                </label>
                <input
                  id="input-no-kk"
                  type="text"
                  maxLength={16}
                  value={noKK}
                  onChange={(e) => setNoKK(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 3507180102030001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1 font-mono">16 digit nomor Kartu Keluarga</p>
              </div>

              {/* Nama Lengkap */}
              <div className="sm:col-span-2">
                <label htmlFor="input-nama" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  id="input-nama"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap sesuai KTP"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Tempat Lahir */}
              <div>
                <label htmlFor="input-tempat-lahir" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempat Lahir *
                </label>
                <input
                  id="input-tempat-lahir"
                  type="text"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                  placeholder="Kota/Kabupaten kelahiran"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label htmlFor="input-tanggal-lahir" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Lahir *
                </label>
                <input
                  id="input-tanggal-lahir"
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Domisili & Kontak */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
              2. Wilayah Domisili & Kontak
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Alamat */}
              <div className="sm:col-span-2">
                <label htmlFor="input-alamat" className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Rumah / Blok *
                </label>
                <input
                  id="input-alamat"
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Perum GPA Ngijo Blok B-12"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* RT */}
              <div>
                <label htmlFor="select-rt" className="block text-xs font-semibold text-slate-700 mb-1">
                  Rukun Tetangga (RT) *
                </label>
                <select
                  id="select-rt"
                  value={rt}
                  onChange={(e) => setRt(e.target.value as RTEnum)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                >
                  <option value="06">RT 06 (Perum GPA Ngijo)</option>
                  <option value="07">RT 07 (Perum GPA Ngijo)</option>
                  <option value="10">RT 10 (Perum GPA Ngijo)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Database keanggotaan terpusat global</p>
              </div>

              {/* No HP */}
              <div>
                <label htmlFor="input-no-hp" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor HP / WhatsApp *
                </label>
                <input
                  id="input-no-hp"
                  type="text"
                  value={noHP}
                  onChange={(e) => setNoHP(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Status Keanggotaan */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
              3. Status Keanggotaan & Catatan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label htmlFor="select-status" className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Anggota *
                </label>
                <select
                  id="select-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MemberStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                  <option value="Meninggal">Meninggal</option>
                </select>
              </div>

              {/* Tanggal Daftar */}
              <div>
                <label htmlFor="input-tanggal-daftar" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Terdaftar *
                </label>
                <input
                  id="input-tanggal-daftar"
                  type="date"
                  value={tanggalDaftar}
                  onChange={(e) => setTanggalDaftar(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Tanggal Nonaktif (If not Aktif) */}
              {status !== 'Aktif' && (
                <div className="sm:col-span-2">
                  <label htmlFor="input-tanggal-nonaktif" className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Status Berubah ({status})
                  </label>
                  <input
                    id="input-tanggal-nonaktif"
                    type="date"
                    value={tanggalNonaktif}
                    onChange={(e) => setTanggalNonaktif(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* Keterangan */}
              <div className="sm:col-span-2">
                <label htmlFor="textarea-keterangan" className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea
                  id="textarea-keterangan"
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan khusus, jabatan di jamaah, atau riwayat santunan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              id="btn-cancel-form"
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              id="btn-submit-member"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Anggota'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
