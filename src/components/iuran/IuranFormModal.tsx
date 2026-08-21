import React, { useState, useEffect } from 'react';
import { X, CreditCard, Save, AlertCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Member, MemberArrearsInfo, PaymentMethod } from '../../types/index.ts';
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
}: IuranFormModalProps) {
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
  const [error, setError] = useState<string | null>(null);

  // Sync defaults
  useEffect(() => {
    if (isOpen) {
      setIdAnggota(defaultMemberId || '');
      setPeriodeBulan(defaultMonth || currentMonth);
      setPeriodeTahun(defaultYear || currentYear);
      setTanggalBayar(new Date().toISOString().split('T')[0]);
      setNominal(5000);
      setMetode('Tunai');
      setKeterangan('');
      setError(null);
      setDuplicateWarning(null);
    }
  }, [isOpen, defaultMemberId, defaultMonth, defaultYear]);

  // Fetch Member Arrears whenever member changes
  useEffect(() => {
    if (!idAnggota) {
      setArrearsInfo(null);
      return;
    }

    const fetchArrears = async () => {
      try {
        const res = await api.iuran.getMemberArrears(idAnggota);
        if (res.success && res.data) {
          setArrearsInfo(res.data);
          // If member has unpaid periods, default to the oldest unpaid period!
          if (res.data.periodeBelumBayar && res.data.periodeBelumBayar.length > 0) {
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
  }, [idAnggota]);

  // Check duplicate payment for selected member + period
  useEffect(() => {
    if (!idAnggota || !periodeBulan || !periodeTahun) {
      setDuplicateWarning(null);
      return;
    }

    const checkDuplicate = async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await api.iuran.checkDuplicate(idAnggota, periodeBulan, periodeTahun);
        if (res.success && res.isDuplicate) {
          setDuplicateWarning(`PERINGATAN: Anggota ini SUDAH membayar iuran untuk periode ${MONTHS.find(m => m.value === periodeBulan)?.label} ${periodeTahun}. Pembayaran ganda tidak diperkenankan.`);
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
  }, [idAnggota, periodeBulan, periodeTahun]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsSubmitting(true);
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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat pembayaran iuran.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Catat Pembayaran Iuran Wajib
              </h2>
              <p className="text-xs text-slate-300">
                Pencatatan kas masuk jaminan kematian (03_IURAN)
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

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium">{duplicateWarning}</span>
            </div>
          )}

          {/* Anggota Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Anggota <span className="text-rose-500">*</span>
            </label>
            {defaultMemberId ? (
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

          {/* Arrears Quick Indicator if member has unpaid periods */}
          {arrearsInfo && (
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
                      const isSelected = periodeYearAndMonth(y, m);
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
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
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
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Simpan Pembayaran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  function periodeYearAndMonth(y: number, m: number) {
    return periodeTahun === y && periodeBulan === m;
  }
}
