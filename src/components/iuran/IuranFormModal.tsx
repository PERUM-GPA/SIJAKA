import React, { useState, useEffect } from 'react';
import { X, CreditCard, Save, AlertCircle, AlertTriangle, CheckCircle2, Edit3, HelpCircle } from 'lucide-react';
import { Contribution, Member, MemberArrearsInfo, PaymentMethod } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatRupiah } from '../../lib/formatters.ts';

interface IuranFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  defaultMemberId?: string;
  defaultMonth?: number;
  defaultYear?: number;
  membersList?: Member[];
  editContribution?: (Contribution & { namaAnggota?: string; rtAnggota?: string }) | null;
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export function IuranFormModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMemberId,
  defaultMonth,
  defaultYear,
  membersList = [],
  editContribution,
}: IuranFormModalProps) {
  const isEditMode = Boolean(editContribution);
  const currentNow = new Date();
  const currentYear = currentNow.getFullYear();
  const currentMonth = currentNow.getMonth() + 1;

  const [idAnggota, setIdAnggota] = useState(defaultMemberId || '');
  const [periodeBulan, setPeriodeBulan] = useState<number>(defaultMonth || currentMonth);
  const [periodeTahun, setPeriodeTahun] = useState<number>(defaultYear || currentYear);
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split('T')[0]);
  const [nominal, setNominal] = useState<number>(5000);
  const [metode, setMetode] = useState<PaymentMethod>('Tunai');
  const [keterangan, setKeterangan] = useState('');

  const [arrearsInfo, setArrearsInfo] = useState<MemberArrearsInfo | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open or editContribution change
  useEffect(() => {
    if (isOpen) {
      if (editContribution) {
        setIdAnggota(editContribution.ID_Anggota);
        setPeriodeBulan(editContribution.Periode_Bulan);
        setPeriodeTahun(editContribution.Periode_Tahun);
        setTanggalBayar(editContribution.Tanggal_Bayar || new Date().toISOString().split('T')[0]);
        setNominal(editContribution.Nominal);
        setMetode(editContribution.Metode || 'Tunai');
        setKeterangan(editContribution.Keterangan || '');
      } else {
        setIdAnggota(defaultMemberId || '');
        setPeriodeBulan(defaultMonth || currentMonth);
        setPeriodeTahun(defaultYear || currentYear);
        setTanggalBayar(new Date().toISOString().split('T')[0]);
        setNominal(5000);
        setMetode('Tunai');
        setKeterangan('');
      }
      setError(null);
      setDuplicateWarning(null);
      setShowConfirmDialog(false);
    }
  }, [isOpen, editContribution, defaultMemberId, defaultMonth, defaultYear]);

  // Fetch Member Arrears whenever member changes (only in Create mode)
  useEffect(() => {
    if (!idAnggota || isEditMode) {
      if (!idAnggota) setArrearsInfo(null);
      return;
    }

    const fetchArrears = async () => {
      try {
        const res = await api.iuran.getMemberArrears(idAnggota);
        if (res.success && res.data) {
          setArrearsInfo(res.data);
          // If member has unpaid periods and creating new, default to oldest unpaid period
          if (!isEditMode && res.data.periodeBelumBayar && res.data.periodeBelumBayar.length > 0) {
            const oldest = res.data.periodeBelumBayar[0];
            const [y, m] = oldest.split('-').map(Number);
            if (y && m) {
              setPeriodeTahun(y);
              setPeriodeBulan(m);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching member arrears info:', err);
      }
    };

    fetchArrears();
  }, [idAnggota, isEditMode]);

  // Check duplicate payment for selected member + period
  useEffect(() => {
    if (!idAnggota || !periodeBulan || !periodeTahun) {
      setDuplicateWarning(null);
      return;
    }

    // In edit mode, if period is unchanged, it's not a duplicate
    if (
      isEditMode &&
      editContribution &&
      idAnggota === editContribution.ID_Anggota &&
      periodeBulan === editContribution.Periode_Bulan &&
      periodeTahun === editContribution.Periode_Tahun
    ) {
      setDuplicateWarning(null);
      return;
    }

    const checkDuplicate = async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await api.iuran.checkDuplicate(idAnggota, periodeBulan, periodeTahun);
        if (res.success && res.isDuplicate) {
          setDuplicateWarning(
            `PERINGATAN: Anggota ini SUDAH membayar iuran untuk periode ${
              MONTHS.find((m) => m.value === periodeBulan)?.label
            } ${periodeTahun}. Pembayaran ganda tidak diperkenankan.`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const timer = setTimeout(checkDuplicate, 250);
    return () => clearTimeout(timer);
  }, [idAnggota, periodeBulan, periodeTahun, isEditMode, editContribution]);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!idAnggota) {
      setError('Pilih anggota terlebih dahulu.');
      return;
    }

    if (duplicateWarning) {
      setError('Tidak dapat melanjutkan: Anggota telah melunasi periode ini.');
      return;
    }

    if (nominal <= 0 || isNaN(nominal)) {
      setError('Nominal iuran harus lebih besar dari 0.');
      return;
    }

    // In Edit mode, ask for explicit confirmation before saving
    if (isEditMode) {
      setShowConfirmDialog(true);
      return;
    }

    executeSubmit();
  };

  const executeSubmit = async () => {
    try {
      setIsSubmitting(true);
      setShowConfirmDialog(false);

      if (isEditMode && editContribution) {
        const res = await api.iuran.update(editContribution.ID_Iuran, {
          Periode_Bulan: Number(periodeBulan),
          Periode_Tahun: Number(periodeTahun),
          Tanggal_Bayar: tanggalBayar,
          Nominal: Number(nominal),
          Metode: metode,
          Keterangan: keterangan.trim(),
        });
        onSuccess(res.message || `Data transaksi iuran ${editContribution.ID_Iuran} berhasil diperbarui.`);
      } else {
        const res = await api.iuran.create({
          ID_Anggota: idAnggota,
          Periode_Bulan: Number(periodeBulan),
          Periode_Tahun: Number(periodeTahun),
          Tanggal_Bayar: tanggalBayar,
          Nominal: Number(nominal),
          Metode: metode,
          Keterangan: keterangan.trim(),
        });
        onSuccess(res.message || 'Pembayaran iuran berhasil dicatat.');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi iuran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMember = membersList.find((m) => m.ID_Anggota === idAnggota);

  return (
    <div
      id="iuran-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="iuran-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isEditMode
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isEditMode ? 'Koreksi Data Iuran' : 'Catat Pembayaran Iuran Wajib'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditMode
                  ? `Koreksi data transaksi ${editContribution?.ID_Iuran} & Buku Kas terkait`
                  : 'Pencatatan kas masuk jaminan kematian (03_IURAN)'}
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

        {/* Confirmation Modal for Edit */}
        {showConfirmDialog && (
          <div className="p-5 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-900">
                  Konfirmasi Koreksi Transaksi Iuran
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Perubahan periode, tanggal, atau nominal akan secara otomatis memperbarui transaksi
                  Buku Kas terkait di tempat tanpa membuat transaksi kas ganda. Saldo berjalan akan
                  dihitung ulang secara konsisten. Apakah Anda yakin ingin menyimpan koreksi ini?
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    Periksa Kembali
                  </button>
                  <button
                    type="button"
                    onClick={executeSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Ya, Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium">{duplicateWarning}</span>
            </div>
          )}

          {/* Edit Mode ID Info Card */}
          {isEditMode && editContribution && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">ID Transaksi Iuran:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {editContribution.ID_Iuran}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Petugas Terakhir:</span>
                <span className="font-semibold text-slate-700">{editContribution.Petugas}</span>
              </div>
            </div>
          )}

          {/* Anggota Selector / Read-Only in Edit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Anggota Wajib Iuran <span className="text-rose-500">*</span>
            </label>
            {isEditMode ? (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-semibold font-mono flex items-center justify-between">
                <span>
                  [{idAnggota}] {editContribution?.namaAnggota || currentMember?.Nama || 'Anggota'}
                </span>
                <span className="text-[10px] uppercase font-sans font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                  Tetap (Immutable)
                </span>
              </div>
            ) : defaultMemberId ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold font-mono">
                {defaultMemberId} - {membersList.find((m) => m.ID_Anggota === defaultMemberId)?.Nama || 'Anggota Terpilih'}
              </div>
            ) : (
              <select
                id="select-iuran-anggota"
                value={idAnggota}
                onChange={(e) => setIdAnggota(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Anggota Wajib Iuran --</option>
                {membersList
                  .filter((m) => m.Status === 'Aktif')
                  .map((m) => (
                    <option key={m.ID_Anggota} value={m.ID_Anggota}>
                      [{m.ID_Anggota}] {m.Nama} (RT {m.RT})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Arrears Quick Indicator if member has unpaid periods (only in create mode) */}
          {!isEditMode && arrearsInfo && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Status Kewajiban Iuran:</span>
                {arrearsInfo.totalBulanTunggakan > 0 ? (
                  <span className="text-rose-600 font-bold">
                    Menunggak {arrearsInfo.totalBulanTunggakan} Bulan ({formatRupiah(arrearsInfo.totalNominalTunggakan)})
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lunas s/d Bulan Ini</span>
                  </span>
                )}
              </div>

              {arrearsInfo.periodeBelumBayar.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">
                    Pilih periode yang belum dibayar:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {arrearsInfo.periodeBelumBayar.slice(0, 6).map((p) => {
                      const [y, m] = p.split('-').map(Number);
                      const isSelected = periodeTahun === y && periodeBulan === m;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPeriodeTahun(y);
                            setPeriodeBulan(m);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {MONTHS.find((item) => item.value === m)?.label} {y}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Periode Bulan & Tahun */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Periode Bulan <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-iuran-bulan"
                value={periodeBulan}
                onChange={(e) => setPeriodeBulan(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} (Bulan {m.value})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Periode Tahun <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-iuran-tahun"
                value={periodeTahun}
                onChange={(e) => setPeriodeTahun(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
              >
                {[2023, 2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tanggal Bayar */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pembayaran <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-iuran-tanggal-bayar"
                type="date"
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nominal Iuran (Rp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs">
                  Rp
                </span>
                <input
                  id="input-iuran-nominal"
                  type="number"
                  value={nominal}
                  onChange={(e) => setNominal(Number(e.target.value))}
                  required
                  min={1000}
                  step={500}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Tunai', 'Transfer', 'Kolektor'] as PaymentMethod[]).map((met) => (
                <label
                  key={met}
                  className={`p-2.5 rounded-xl border text-center font-medium text-xs cursor-pointer transition-colors ${
                    metode === met
                      ? isEditMode
                        ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodeBayar"
                    value={met}
                    checked={metode === met}
                    onChange={() => setMetode(met)}
                    className="sr-only"
                  />
                  <span>{met === 'Transfer' ? 'Transfer Bank' : met === 'Kolektor' ? 'Kolektor RT' : 'Tunai Langsung'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Transaksi (Opsional)
            </label>
            <input
              id="input-iuran-keterangan"
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Titip lewat ketua RT / transfer BCA"
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
              id="btn-submit-iuran"
              type="submit"
              disabled={isSubmitting || Boolean(duplicateWarning)}
              className={`inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 ${
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isEditMode ? <Edit3 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {isSubmitting
                  ? 'Memproses...'
                  : isEditMode
                  ? 'Simpan Perubahan'
                  : 'Simpan Pembayaran'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
