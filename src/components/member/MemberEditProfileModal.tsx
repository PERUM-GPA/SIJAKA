import React, { useState, useEffect } from 'react';
import { UserCheck, Home, Phone, FileText, X, AlertCircle, Shield } from 'lucide-react';
import { Member } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface MemberEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  onSaved: () => void;
}

export function MemberEditProfileModal({
  isOpen,
  onClose,
  member,
  onSaved,
}: MemberEditProfileModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (member) {
      setNoHp(member.No_HP || '');
      setAlamat(member.Alamat || '');
      setKeterangan(member.Keterangan || '');
    }
    setErrorMessage('');
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!alamat.trim()) {
      setErrorMessage('Alamat domisili wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.member.updateProfile({
        No_HP: noHp.trim(),
        Alamat: alamat.trim(),
        Keterangan: keterangan.trim(),
      });

      toastSuccess('Data kontak & alamat KK berhasil diperbarui.', 'Sukses');
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui data profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="member-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
    >
      <div
        id="member-profile-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Perbarui Kontak & Alamat KK
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pembaruan mandiri data domisili dan nomor WhatsApp
              </p>
            </div>
          </div>
          <button
            id="btn-close-member-profile"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Master Locked Info Read-Only */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Nama Kepala Keluarga:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{member.Nama}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>No. Kartu Keluarga (KK):</span>
              <span className="font-mono text-slate-900 dark:text-white">{member.No_KK}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Wilayah Rukun Tetangga:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">RT {member.RT}</span>
            </div>
          </div>

          {/* No HP */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Handphone / WhatsApp
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="input-member-nohp"
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08123456789"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Alamat Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap / Blok Rumah di GPA Ngijo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 flex items-center pointer-events-none text-slate-400">
                <Home className="w-4 h-4" />
              </div>
              <textarea
                id="textarea-member-alamat"
                rows={2}
                required
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Perum GPA Blok C-12"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Keterangan Domisili
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="textarea-member-keterangan"
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan tambahan (misal: rumah dinas, status tinggal)"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2.5">
            <button
              id="btn-cancel-member-profile"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-member-profile"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-950/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
