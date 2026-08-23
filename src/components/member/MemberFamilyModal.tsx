import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, X, AlertCircle, HeartHandshake } from 'lucide-react';
import { Family, FamilyRelation, HeirCandidate } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface MemberFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyData?: Family | null;
  onSaved: () => void;
}

export function MemberFamilyModal({
  isOpen,
  onClose,
  familyData,
  onSaved,
}: MemberFamilyModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const isEdit = Boolean(familyData);

  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [hubungan, setHubungan] = useState<FamilyRelation>('Anak');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [noHp, setNoHp] = useState('');
  const [calonAhliWaris, setCalonAhliWaris] = useState<HeirCandidate>('Tidak');
  const [keterangan, setKeterangan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (familyData) {
      setNama(familyData.Nama || '');
      setNik(familyData.NIK || '');
      setHubungan(familyData.Hubungan || 'Anak');
      setTempatLahir(familyData.Tempat_Lahir || '');
      setTanggalLahir(familyData.Tanggal_Lahir || '');
      setNoHp(familyData.No_HP || '');
      setCalonAhliWaris(familyData.Calon_Ahli_Waris || 'Tidak');
      setKeterangan(familyData.Keterangan || '');
    } else {
      setNama('');
      setNik('');
      setHubungan('Anak');
      setTempatLahir('');
      setTanggalLahir('');
      setNoHp('');
      setCalonAhliWaris('Tidak');
      setKeterangan('');
    }
    setErrorMessage('');
  }, [familyData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nama.trim()) {
      setErrorMessage('Nama anggota keluarga wajib diisi.');
      return;
    }

    if (nik.trim() && !/^\d{16}$/.test(nik.trim())) {
      setErrorMessage('NIK harus terdiri dari 16 digit angka (atau kosongkan jika belum memiliki KTP).');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEdit && familyData) {
        await api.member.updateFamily(familyData.ID_Keluarga, {
          Nama: nama.trim(),
          NIK: nik.trim(),
          Hubungan: hubungan,
          Tempat_Lahir: tempatLahir.trim(),
          Tanggal_Lahir: tanggalLahir,
          No_HP: noHp.trim(),
          Calon_Ahli_Waris: calonAhliWaris,
          Keterangan: keterangan.trim(),
        });
        toastSuccess(`Data ${nama.trim()} berhasil diperbarui.`, 'Sukses');
      } else {
        await api.member.addFamily({
          Nama: nama.trim(),
          NIK: nik.trim(),
          Hubungan: hubungan,
          Tempat_Lahir: tempatLahir.trim(),
          Tanggal_Lahir: tanggalLahir,
          No_HP: noHp.trim(),
          Calon_Ahli_Waris: calonAhliWaris,
          Keterangan: keterangan.trim() || 'Ditambahkan mandiri oleh anggota',
        });
        toastSuccess(`Anggota keluarga ${nama.trim()} berhasil ditambahkan ke KK Anda.`, 'Sukses');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan data keluarga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="member-family-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="member-family-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              {isEdit ? <Users className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Perbarui Data Anggota Keluarga' : 'Tambah Anggota Keluarga ke KK'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pendaftaran data keluarga jamaah untuk jaminan sosial & santunan
              </p>
            </div>
          </div>
          <button
            id="btn-close-member-family"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-family-nama"
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Siti Aminah"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Hubungan & NIK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hubungan Keluarga <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-family-hubungan"
                value={hubungan}
                onChange={(e) => setHubungan(e.target.value as FamilyRelation)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <option value="Suami">Suami</option>
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Orang Tua">Orang Tua</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIK (16 Digit - Opsional)
              </label>
              <input
                id="input-family-nik"
                type="text"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                placeholder="3507..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tempat Lahir
              </label>
              <input
                id="input-family-tempat-lahir"
                type="text"
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                placeholder="Contoh: Malang"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Lahir
              </label>
              <input
                id="input-family-tanggal-lahir"
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* No HP & Calon Ahli Waris */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No. HP / WhatsApp
              </label>
              <input
                id="input-family-nohp"
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="0812..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Calon Ahli Waris Santunan
              </label>
              <select
                id="select-family-ahli-waris"
                value={calonAhliWaris}
                onChange={(e) => setCalonAhliWaris(e.target.value as HeirCandidate)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya (Penerima Hak Santunan)</option>
              </select>
            </div>
          </div>

          {calonAhliWaris === 'Ya' && (
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs flex items-start space-x-2">
              <HeartHandshake className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>
                Anggota keluarga ini akan didaftarkan sebagai penerima sah santunan duka apabila terjadi musibah.
              </span>
            </div>
          )}

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Keterangan
            </label>
            <textarea
              id="textarea-family-keterangan"
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan khusus atau domisili saat ini"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
            <button
              id="btn-cancel-member-family"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-member-family"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Tambah ke KK'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
