import React from 'react';
import { Filter, RotateCcw, FileSpreadsheet, FileText, Printer, Calendar } from 'lucide-react';
import { ReportFilterOptions, ReportPeriodType, RTEnum } from '../../types/index.ts';

interface ReportFilterProps {
  filter: ReportFilterOptions;
  onChange: (newFilter: ReportFilterOptions) => void;
  onApply: () => void;
  onReset: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
  showRTFilter?: boolean;
  showCategoryFilter?: boolean;
  categoryOptions?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const ReportFilter: React.FC<ReportFilterProps> = ({
  filter,
  onChange,
  onApply,
  onReset,
  onExportExcel,
  onExportPdf,
  onPrint,
  isLoading = false,
  isExporting = false,
  showRTFilter = true,
  showCategoryFilter = false,
  categoryOptions = [],
  selectedCategory = 'all',
  onCategoryChange,
}) => {
  const periodButtons: Array<{ key: ReportPeriodType; label: string }> = [
    { key: 'this_month', label: 'Bulan Ini' },
    { key: 'last_month', label: 'Bulan Lalu' },
    { key: 'this_year', label: 'Tahun Ini' },
    { key: 'this_week', label: 'Minggu Ini' },
    { key: 'today', label: 'Hari Ini' },
    { key: 'all', label: 'Semua Waktu' },
    { key: 'custom', label: 'Kustom' },
  ];

  const handlePeriodChange = (period: ReportPeriodType) => {
    if (period === 'custom') {
      onChange({
        ...filter,
        period: 'custom',
        startDate: filter.startDate || new Date().toISOString().split('T')[0],
        endDate: filter.endDate || new Date().toISOString().split('T')[0],
      });
    } else {
      onChange({
        ...filter,
        period,
      });
    }
  };

  return (
    <div id="report-filter-container" className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Bar: Period Selection & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Quick Period Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1 hidden sm:inline">Periode:</span>
          {periodButtons.map((btn) => {
            const isActive = filter.period === btn.key;
            return (
              <button
                key={btn.key}
                id={`btn-period-${btn.key}`}
                type="button"
                onClick={() => handlePeriodChange(btn.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Export & Print Action Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
          <button
            id="btn-export-excel"
            type="button"
            onClick={onExportExcel}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            title="Download file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Mengekspor...' : 'Export Excel'}</span>
          </button>

          <button
            id="btn-export-pdf"
            type="button"
            onClick={onExportPdf}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
            title="Download file PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            id="btn-print-report"
            type="button"
            onClick={onPrint}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Cetak format print-friendly"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Secondary Controls: Date Range (if custom) & Dropdown Filters */}
      <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        {/* Custom Start Date */}
        {filter.period === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai</label>
            <div className="relative">
              <input
                id="input-report-start-date"
                type="date"
                value={filter.startDate || ''}
                onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        )}

        {/* Custom End Date */}
        {filter.period === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Akhir</label>
            <div className="relative">
              <input
                id="input-report-end-date"
                type="date"
                value={filter.endDate || ''}
                onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        )}

        {/* RT Filter */}
        {showRTFilter && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wilayah RT</label>
            <select
              id="select-report-rt"
              value={filter.rt || 'all'}
              onChange={(e) => onChange({ ...filter, rt: e.target.value as any })}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Semua RT (06, 07, 10)</option>
              <option value="06">RT 06</option>
              <option value="07">RT 07</option>
              <option value="10">RT 10</option>
            </select>
          </div>
        )}

        {/* Category Filter (if applicable) */}
        {showCategoryFilter && onCategoryChange && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kategori Pengeluaran</label>
            <select
              id="select-report-kategori"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Semua Kategori</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Apply & Reset Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-apply-report-filter"
            type="button"
            onClick={onApply}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Memuat...' : 'Terapkan'}</span>
          </button>

          <button
            id="btn-reset-report-filter"
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex items-center justify-center p-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Reset Filter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
