import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Sparkles } from 'lucide-react';
import { Family, FamilyRelation, Member } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface KeluargaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  editingFamily?: Family | null;
  defaultMemberId?: string;
  membersList?: Member[];
}

export function KeluargaFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingFamily,
  defaultMemberId,
  membersList = [],
}: KeluargaFormModalProps) {
  const [idAnggota, setIdAnggota] = useState(defaultMemberId || '');
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [hubungan, setHubungan] = useState<FamilyRelation>('Anak');
  const [noHp, setNoHp] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Tidak Aktif'>('Aktif');
  const [calonAhliWaris, setCalonAhliWaris] = useState<'Ya' | 'Tidak'>('Tidak');
  const [keterangan, setKeterangan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with editing family if present
  useEffect(() => {
    if (editingFamily) {
      setIdAnggota(editingFamily.ID_Anggota);
      setNik(editingFamily.NIK || '');
      setNama(editingFamily.Nama);
      setTempatLahir(editingFamily.Tempat_Lahir || '');
      setTanggalLahir(editingFamily.Tanggal_Lahir || '');
      setHubungan(editingFamily.Hubungan);
      setNoHp(editingFamily.No_HP || '');
      setStatus(editingFamily.Status);
      setCalonAhliWaris(editingFamily.Calon_Ahli_Waris);
      setKeterangan(editingFamily.Keterangan || '');
    } else {
      setIdAnggota(defaultMemberId || '');
      setNik('');
      setNama('');
      setTempatLahir('');
      setTanggalLahir('');
      setHubungan('Anak');
      setNoHp('');
      setStatus('Aktif');
      setCalonAhliWaris('Tidak');
      setKeterangan('');
    }
    setError(null);
  }, [editingFamily, defaultMemberId, isOpen]);

  if (!isOpen) return null;

  const isEditMode = Boolean(editingFamily);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!idAnggota.trim()) {
      setError('Pilih Anggota Utama terlebih dahulu.');
      return;
    }

    if (!nama.trim()) {
      setError('Nama anggota keluarga wajib diisi.');
      return;
    }

    if (!hubungan) {
      setError('Hubungan keluarga wajib dipilih.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditMode && editingFamily) {
        const res = await api.keluarga.update(editingFamily.ID_Keluarga, {
          NIK: nik.trim(),
          Nama: nama.trim(),
          Tempat_Lahir: tempatLahir.trim(),
          Tanggal_Lahir: tanggalLahir,
          Hubungan: hubungan,
          No_HP: noHp.trim(),
          Status: status,
          Calon_Ahli_Waris: calonAhliWaris,
          Keterangan: keterangan.trim(),
        });
        onSuccess(res.message || 'Data keluarga berhasil diperbarui.');
      } else {
        const res = await api.keluarga.create({
          ID_Anggota: idAnggota.trim(),
          NIK: nik.trim(),
          Nama: nama.trim(),
          Tempat_Lahir: tempatLahir.trim(),
          Tanggal_Lahir: tanggalLahir,
          Hubungan: hubungan,
          No_HP: noHp.trim(),
          Status: status,
          Calon_Ahli_Waris: calonAhliWaris,
          Keterangan: keterangan.trim(),
        });
        onSuccess(res.message || 'Anggota keluarga baru berhasil didaftarkan.');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data keluarga.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="keluarga-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="keluarga-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isEditMode ? 'Ubah Data Keluarga' : 'Tambah Anggota Keluarga'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditMode
                  ? `ID: ${editingFamily?.ID_Keluarga}`
                  : 'Pencatatan data keluarga & calon ahli waris'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Anggota Utama Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Anggota Utama (Kepala/Induk) <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-mono text-slate-700 font-semibold">
                {idAnggota} - {membersList.find((m) => m.ID_Anggota === idAnggota)?.Nama || 'Anggota'}
              </div>
            ) : defaultMemberId ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                {defaultMemberId} - {membersList.find((m) => m.ID_Anggota === defaultMemberId)?.Nama || 'Anggota Terpilih'}
              </div>
            ) : (
              <select
                id="select-anggota-utama"
                value={idAnggota}
                onChange={(e) => setIdAnggota(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Anggota Utama --</option>
                {membersList.map((m) => (
                  <option key={m.ID_Anggota} value={m.ID_Anggota}>
                    [{m.ID_Anggota}] {m.Nama} (RT {m.RT})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Keluarga <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-keluarga-nama"
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Siti Aisyah"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Hubungan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hubungan Keluarga <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-keluarga-hubungan"
                value={hubungan}
                onChange={(e) => setHubungan(e.target.value as FamilyRelation)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Istri">Istri</option>
                <option value="Suami">Suami</option>
                <option value="Anak">Anak</option>
                <option value="Orang Tua">Orang Tua</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NIK */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIK (Nomor Induk Kependudukan)
              </label>
              <input
                id="input-keluarga-nik"
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="16 digit NIK"
                maxLength={16}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* No HP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. HP / WhatsApp
              </label>
              <input
                id="input-keluarga-nohp"
                type="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="081234567890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tempat Lahir */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat Lahir
              </label>
              <input
                id="input-keluarga-tempat-lahir"
                type="text"
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                placeholder="Contoh: Malang"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Lahir
              </label>
              <input
                id="input-keluarga-tanggal-lahir"
                type="date"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Calon Ahli Waris */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <label className="block text-xs font-bold text-amber-900 mb-1.5 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Calon Ahli Waris Penerima Santunan</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="calonAhliWaris"
                    value="Ya"
                    checked={calonAhliWaris === 'Ya'}
                    onChange={() => setCalonAhliWaris('Ya')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Ya (Prioritas Ahli Waris)</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="calonAhliWaris"
                    value="Tidak"
                    checked={calonAhliWaris === 'Tidak'}
                    onChange={() => setCalonAhliWaris('Tidak')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Bukan / Tidak</span>
                </label>
              </div>
            </div>

            {/* Status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Status Keanggotaan Keluarga
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="statusKeluarga"
                    value="Aktif"
                    checked={status === 'Aktif'}
                    onChange={() => setStatus('Aktif')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Aktif</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="statusKeluarga"
                    value="Tidak Aktif"
                    checked={status === 'Tidak Aktif'}
                    onChange={() => setStatus('Tidak Aktif')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>Tidak Aktif</span>
                </label>
              </div>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan Tambahan (Opsional)
            </label>
            <textarea
              id="textarea-keluarga-keterangan"
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan khusus anggota keluarga..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-keluarga"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Daftarkan Keluarga'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
