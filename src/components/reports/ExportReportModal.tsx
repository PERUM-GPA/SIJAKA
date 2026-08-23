import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, Download, Check, Layers } from 'lucide-react';
import { ReportFilterOptions } from '../../types/index.ts';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: ReportFilterOptions;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting?: boolean;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  filter,
  onExportExcel,
  onExportPdf,
  isExporting = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf'>('excel');

  if (!isOpen) return null;

  const handleExport = () => {
    if (selectedFormat === 'excel') {
      onExportExcel();
    } else {
      onExportPdf();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Export Laporan Keuangan</h3>
              <p className="text-xs text-gray-500">Unduh data resmi SIJAKA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selection Cards */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Pilih Format Berkas:
          </label>

          <div className="grid grid-cols-2 gap-3">
            {/* Excel Option */}
            <div
              onClick={() => setSelectedFormat('excel')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedFormat === 'excel'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                {selectedFormat === 'excel' && (
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-gray-900 mt-2">Excel (.xlsx)</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Multi-Sheet lengkap</p>
            </div>

            {/* PDF Option */}
            <div
              onClick={() => setSelectedFormat('pdf')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedFormat === 'pdf'
                  ? 'border-red-600 bg-red-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <FileText className="w-6 h-6 text-red-600" />
                {selectedFormat === 'pdf' && (
                  <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-gray-900 mt-2">Dokumen PDF</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Tata letak cetak resmi</p>
            </div>
          </div>
        </div>

        {/* Content Details Preview */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cakupan Laporan Terpilih:</span>
          </div>
          <ul className="text-[11px] text-gray-600 space-y-0.5 pl-5 list-disc">
            <li>Ringkasan & Neraca Arus Kas</li>
            <li>Buku Kas Lengkap (Single Source of Truth)</li>
            <li>Rekapitulasi Iuran & Kepatuhan RT</li>
            <li>Rekapitulasi Santunan Kematian</li>
            <li>Rekapitulasi Pengeluaran Operasional</li>
            <li>Lembar Rekonsiliasi & Uji Integritas</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Sedang Mengekspor...' : 'Unduh Berkas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
