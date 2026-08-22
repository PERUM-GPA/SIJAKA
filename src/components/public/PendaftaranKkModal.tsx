import React, { useState } from 'react';
import {
  X,
  Building2,
  Users2,
  UserPlus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { RTEnum, FamilyRelation, HeirCandidate, PublicDaftarKKPayload } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface PendaftaranKkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FamilyMemberInput {
  id: string;
  NIK: string;
  Nama: string;
  Tempat_Lahir: string;
  Tanggal_Lahir: string;
  Hubungan: FamilyRelation;
  No_HP: string;
  Calon_Ahli_Waris: HeirCandidate;
}

export function PendaftaranKkModal({ isOpen, onClose, onSuccess }: PendaftaranKkModalProps) {
  // Step: 1 = Form, 2 = Success Confirmation
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ idAnggota: string; nama: string; totalJiwa: number } | null>(null);

  // Kepala Keluarga Form State
  const [noKK, setNoKK] = useState('');
  const [nikKK, setNikKK] = useState('');
  const [namaKK, setNamaKK] = useState('');
  const [tempatLahirKK, setTempatLahirKK] = useState('');
  const [tanggalLahirKK, setTanggalLahirKK] = useState('');
  const [alamatKK, setAlamatKK] = useState('');
  const [rtKK, setRtKK] = useState<RTEnum>('06');
  const [noHpKK, setNoHpKK] = useState('');

  // Family Members State
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberInput[]>([
    {
      id: 'fam-init-1',
      NIK: '',
      Nama: '',
      Tempat_Lahir: '',
      Tanggal_Lahir: '',
      Hubungan: 'Istri',
      No_HP: '',
      Calon_Ahli_Waris: 'Ya',
    },
  ]);

  if (!isOpen) return null;

  const handleAddFamilyRow = () => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: `fam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        NIK: '',
        Nama: '',
        Tempat_Lahir: '',
        Tanggal_Lahir: '',
        Hubungan: 'Anak',
        No_HP: '',
        Calon_Ahli_Waris: 'Tidak',
      },
    ]);
  };

  const handleRemoveFamilyRow = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateFamilyMember = (id: string, field: keyof FamilyMemberInput, value: any) => {
    setFamilyMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!noKK.trim() || !nikKK.trim() || !namaKK.trim() || !tempatLahirKK.trim() || !tanggalLahirKK || !alamatKK.trim() || !noHpKK.trim()) {
      setError('Mohon lengkapi semua kolom wajib Kepala Keluarga bertanda bintang (*).');
      return;
    }

    if (nikKK.trim().length !== 16) {
      setError('NIK Kepala Keluarga harus tepat 16 digit angka sesuai KTP.');
      return;
    }

    if (noKK.trim().length !== 16) {
      setError('Nomor Kartu Keluarga (No. KK) harus tepat 16 digit angka.');
      return;
    }

    // Filter valid family rows
    const validFamilies = familyMembers
      .filter((f) => f.Nama.trim().length > 0)
      .map((f) => ({
        NIK: f.NIK.trim() || undefined,
        Nama: f.Nama.trim(),
        Tempat_Lahir: f.Tempat_Lahir.trim() || undefined,
        Tanggal_Lahir: f.Tanggal_Lahir || undefined,
        Hubungan: f.Hubungan,
        No_HP: f.No_HP.trim() || undefined,
        Calon_Ahli_Waris: f.Calon_Ahli_Waris,
      }));

    const payload: PublicDaftarKKPayload = {
      kepalaKeluarga: {
        No_KK: noKK.trim(),
        NIK: nikKK.trim(),
        Nama: namaKK.trim(),
        Tempat_Lahir: tempatLahirKK.trim(),
        Tanggal_Lahir: tanggalLahirKK,
        Alamat: alamatKK.trim(),
        RT: rtKK,
        No_HP: noHpKK.trim(),
      },
      anggotaKeluarga: validFamilies,
    };

    try {
      setIsSubmitting(true);
      const res = await api.public.daftarKK(payload);
      if (res.success && res.data) {
        setSuccessData(res.data);
        setStep(2);
        if (onSuccess) onSuccess();
      } else {
        setError(res.message || 'Gagal mengirim pendaftaran.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setNoKK('');
    setNikKK('');
    setNamaKK('');
    setTempatLahirKK('');
    setTanggalLahirKK('');
    setAlamatKK('');
    setRtKK('06');
    setNoHpKK('');
    setFamilyMembers([]);
    setError(null);
    setSuccessData(null);
    onClose();
  };

  return (
    <div
      id="pendaftaran-kk-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="pendaftaran-kk-modal-container"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 sm:py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Pendaftaran Kartu Keluarga (KK) Baru
              </h2>
              <p className="text-xs text-emerald-400 font-medium">
                Pendaftaran Kepesertaan Kartu Keluarga Jamaah Tahlil Ar Rohman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: FORM */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Pendaftaran Belum Dapat Diproses</p>
                  <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                </div>
              </div>
            )}

            {/* Information Notice */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs space-y-1.5">
              <div className="flex items-center space-x-2 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Ketentuan Pendaftaran Kepesertaan KK</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                Satu Kartu Keluarga (KK) yang didaftarkan mencakup seluruh anggota keluarga (Kepala Keluarga, pasangan, anak, orang tua, dan tanggungan yang tercantum) dalam satu kesatuan pelayanan jamaah.
              </p>
            </div>

            {/* Section 1: Kepala Keluarga */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Data Kepala Keluarga (Peserta Utama)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* No KK */}
                <div>
                  <label htmlFor="reg-no-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Kartu Keluarga (No. KK) *
                  </label>
                  <input
                    id="reg-no-kk"
                    type="text"
                    maxLength={16}
                    value={noKK}
                    onChange={(e) => setNoKK(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 3507180102030001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">16 digit nomor KK (1 KK = 1 perlindungan)</p>
                </div>

                {/* NIK KK */}
                <div>
                  <label htmlFor="reg-nik-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                    NIK Kepala Keluarga *
                  </label>
                  <input
                    id="reg-nik-kk"
                    type="text"
                    maxLength={16}
                    value={nikKK}
                    onChange={(e) => setNikKK(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 3507181205750001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">16 digit NIK KTP Kepala Keluarga</p>
                </div>

                {/* Nama KK */}
                <div className="sm:col-span-2">
                  <label htmlFor="reg-nama-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Kepala Keluarga *
                  </label>
                  <input
                    id="reg-nama-kk"
                    type="text"
                    value={namaKK}
                    onChange={(e) => setNamaKK(e.target.value)}
                    placeholder="Nama lengkap sesuai KTP"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Tempat Lahir */}
                <div>
                  <label htmlFor="reg-tempat-lahir-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat Lahir *
                  </label>
                  <input
                    id="reg-tempat-lahir-kk"
                    type="text"
                    value={tempatLahirKK}
                    onChange={(e) => setTempatLahirKK(e.target.value)}
                    placeholder="Kota / Kabupaten Lahir"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label htmlFor="reg-tanggal-lahir-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Lahir *
                  </label>
                  <input
                    id="reg-tanggal-lahir-kk"
                    type="date"
                    value={tanggalLahirKK}
                    onChange={(e) => setTanggalLahirKK(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Alamat */}
                <div>
                  <label htmlFor="reg-alamat-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Rumah / Blok *
                  </label>
                  <input
                    id="reg-alamat-kk"
                    type="text"
                    value={alamatKK}
                    onChange={(e) => setAlamatKK(e.target.value)}
                    placeholder="Contoh: Blok B-12"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* RT & No HP */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="reg-rt-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                      RT *
                    </label>
                    <select
                      id="reg-rt-kk"
                      value={rtKK}
                      onChange={(e) => setRtKK(e.target.value as RTEnum)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="06">RT 06</option>
                      <option value="07">RT 07</option>
                      <option value="10">RT 10</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="reg-nohp-kk" className="block text-xs font-semibold text-slate-700 mb-1">
                      No. HP / WA *
                    </label>
                    <input
                      id="reg-nohp-kk"
                      type="tel"
                      value={noHpKK}
                      onChange={(e) => setNoHpKK(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Anggota Keluarga dalam KK */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Anggota Keluarga Dalam KK (Opsional / Tambahan)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Pasangan, anak, orang tua, atau tanggungan yang tercantum dalam Kartu Keluarga
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddFamilyRow}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Anggota</span>
                </button>
              </div>

              {familyMembers.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  Belum ada anggota keluarga tambahan. Klik "+ Tambah Anggota" untuk mendaftarkan pasangan/anak.
                </div>
              ) : (
                <div className="space-y-3">
                  {familyMembers.map((fam, index) => (
                    <div
                      key={fam.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Anggota #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFamilyRow(fam.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Nama */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nama Lengkap
                          </label>
                          <input
                            type="text"
                            value={fam.Nama}
                            onChange={(e) => handleUpdateFamilyMember(fam.id, 'Nama', e.target.value)}
                            placeholder="Contoh: Siti Aisyah"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Hubungan */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hubungan
                          </label>
                          <select
                            value={fam.Hubungan}
                            onChange={(e) => handleUpdateFamilyMember(fam.id, 'Hubungan', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="Istri">Istri</option>
                            <option value="Suami">Suami</option>
                            <option value="Anak">Anak</option>
                            <option value="Orang Tua">Orang Tua</option>
                            <option value="Tanggungan">Tanggungan</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>

                        {/* NIK */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            NIK (Opsional)
                          </label>
                          <input
                            type="text"
                            maxLength={16}
                            value={fam.NIK}
                            onChange={(e) =>
                              handleUpdateFamilyMember(fam.id, 'NIK', e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="16 digit NIK KTP"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Tanggal Lahir */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Tanggal Lahir
                          </label>
                          <input
                            type="date"
                            value={fam.Tanggal_Lahir}
                            onChange={(e) => handleUpdateFamilyMember(fam.id, 'Tanggal_Lahir', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Calon Ahli Waris */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Calon Ahli Waris Santunan?
                          </label>
                          <select
                            value={fam.Calon_Ahli_Waris}
                            onChange={(e) => handleUpdateFamilyMember(fam.id, 'Calon_Ahli_Waris', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              fam.Calon_Ahli_Waris === 'Ya'
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <option value="Ya">Ya (Penerima Santunan)</option>
                            <option value="Tidak">Bukan / Tidak</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Form Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-submit-pendaftaran-kk"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-900/20 flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Kirim Pendaftaran KK</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: SUCCESS CONFIRMATION */}
        {step === 2 && successData && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">
                Pendaftaran Kartu Keluarga Berhasil!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Kartu Keluarga atas nama <strong className="text-slate-900">{successData.nama}</strong> telah berhasil didaftarkan ke dalam sistem SIJAKA.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Peserta KK:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {successData.idAnggota}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Jiwa Terlindungi:</span>
                <span className="font-bold text-slate-900">{successData.totalJiwa} Jiwa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Registrasi:</span>
                <span className="font-bold text-emerald-700">1 Kartu Keluarga Aktif</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
