import React from 'react';
import { X, Printer, CheckCircle, Building2 } from 'lucide-react';
import { Contribution } from '../../types/index.ts';
import { formatDateIndo, formatRupiah } from '../../lib/formatters.ts';

interface KwitansiModalProps {
  isOpen: boolean;
  onClose: () => void;
  contribution: (Contribution & { namaAnggota?: string; rtAnggota?: string }) | null;
}

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

function angkaKeTeks(n: number): string {
  if (n === 5000) return 'Lima Ribu Rupiah';
  if (n === 10000) return 'Sepuluh Ribu Rupiah';
  if (n === 15000) return 'Lima Belas Ribu Rupiah';
  if (n === 20000) return 'Dua Puluh Ribu Rupiah';
  if (n === 25000) return 'Dua Puluh Lima Ribu Rupiah';
  if (n === 30000) return 'Tiga Puluh Ribu Rupiah';
  if (n === 60000) return 'Enam Puluh Ribu Rupiah';
  return `${n.toLocaleString('id-ID')} Rupiah`;
}

export function KwitansiModal({ isOpen, onClose, contribution }: KwitansiModalProps) {
  if (!isOpen || !contribution) return null;

  const handlePrint = () => {
    window.print();
  };

  const periodName = `${MONTH_NAMES[contribution.Periode_Bulan] || contribution.Periode_Bulan} ${contribution.Periode_Tahun}`;

  return (
    <div
      id="kwitansi-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="kwitansi-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 print:m-0 print:border-none print:shadow-none"
      >
        {/* Modal Action Bar (Hidden on print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Bukti Transaksi Resmi
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kuitansi</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kwitansi Body (Printable Area) */}
        <div id="printable-kwitansi" className="p-6 sm:p-8 space-y-5 bg-amber-50/20">
          {/* Header */}
          <div className="border-b-2 border-emerald-800/80 pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">SIJAKA</h2>
                <p className="text-[11px] font-semibold text-emerald-800">JAMAAH TAHLIL AR ROHMAN</p>
                <p className="text-[10px] text-slate-500">RT 06 • RT 07 • RT 10 Perum GPA Ngijo</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider mb-1">
                KUITANSI IURAN
              </span>
              <p className="text-[11px] font-mono text-slate-700 font-bold">No: {contribution.ID_Iuran}</p>
            </div>
          </div>

          {/* Receipt details */}
          <div className="space-y-3 text-xs sm:text-sm text-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-dashed border-slate-300 pb-2">
              <span className="w-36 text-slate-500 shrink-0 font-medium">Telah Diterima Dari</span>
              <span className="font-bold text-slate-900">
                : {contribution.namaAnggota || 'Anggota'} ({contribution.ID_Anggota})
                {contribution.rtAnggota ? ` - RT ${contribution.rtAnggota}` : ''}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-dashed border-slate-300 pb-2">
              <span className="w-36 text-slate-500 shrink-0 font-medium">Untuk Pembayaran</span>
              <span className="font-semibold text-emerald-800">
                : Iuran Jaminan Kematian Periode {periodName}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-dashed border-slate-300 pb-2">
              <span className="w-36 text-slate-500 shrink-0 font-medium">Metode & Tanggal</span>
              <span className="text-slate-900">
                : {contribution.Metode} • {formatDateIndo(contribution.Tanggal_Bayar)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-dashed border-slate-300 pb-2">
              <span className="w-36 text-slate-500 shrink-0 font-medium">Terbilang</span>
              <span className="italic font-medium text-slate-700 bg-amber-100/60 px-2 py-0.5 rounded">
                # {angkaKeTeks(contribution.Nominal)} #
              </span>
            </div>
          </div>

          {/* Amount and Signatures */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="p-3 bg-emerald-50 border-2 border-emerald-600/60 rounded-xl inline-block self-start">
              <p className="text-[10px] uppercase font-bold text-emerald-800">Jumlah Diterima</p>
              <p className="text-xl font-bold text-emerald-900 font-mono">
                {formatRupiah(contribution.Nominal)}
              </p>
              <div className="flex items-center space-x-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                <CheckCircle className="w-3 h-3" />
                <span>LUNAS</span>
              </div>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <p className="text-[11px] text-slate-500">
                Ngijo, {formatDateIndo(contribution.Tanggal_Bayar)}
              </p>
              <p className="text-[11px] font-semibold text-slate-700">Petugas Penerima,</p>
              <div className="h-10"></div>
              <p className="text-xs font-bold text-slate-900 underline">{contribution.Petugas}</p>
              <p className="text-[10px] text-slate-500">Pengurus Jamaah Tahlil Ar Rohman</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 text-center print:hidden">
          Bukti pembayaran ini sah dan diakui sebagai jaminan aktif kepesertaan santunan kematian SIJAKA.
        </div>
      </div>
    </div>
  );
}
