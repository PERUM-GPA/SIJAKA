import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Coins,
  HeartHandshake,
  Receipt,
  Scale,
  RefreshCw,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import {
  FinancialSummaryReportData,
  CashbookReportData,
  IuranReportData,
  SantunanReportData,
  PengeluaranReportData,
  ReconciliationReportData,
  ReportFilterOptions,
  SafeUser,
} from '../../types/index.ts';
import { ReportFilter } from './ReportFilter.tsx';
import { ReportSummaryCards } from './ReportSummaryCards.tsx';
import { BukuKasReportView } from './BukuKasReportView.tsx';
import { IuranReportView } from './IuranReportView.tsx';
import { SantunanReportView } from './SantunanReportView.tsx';
import { PengeluaranReportView } from './PengeluaranReportView.tsx';
import { RekonsiliasiView } from './RekonsiliasiView.tsx';
import { PrintReportView } from './PrintReportView.tsx';
import { ExportReportModal } from './ExportReportModal.tsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LaporanMainViewProps {
  currentUser: SafeUser | null;
}

type TabType = 'summary' | 'cashbook' | 'iuran' | 'santunan' | 'pengeluaran' | 'reconciliation';

export const LaporanMainView: React.FC<LaporanMainViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [filter, setFilter] = useState<ReportFilterOptions>({
    period: 'this_month',
    rt: 'all',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Data states
  const [summaryData, setSummaryData] = useState<FinancialSummaryReportData | null>(null);
  const [cashbookData, setCashbookData] = useState<CashbookReportData | null>(null);
  const [iuranData, setIuranData] = useState<IuranReportData | null>(null);
  const [santunanData, setSantunanData] = useState<SantunanReportData | null>(null);
  const [pengeluaranData, setPengeluaranData] = useState<PengeluaranReportData | null>(null);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationReportData | null>(null);

  const isAdminOrBendahara = currentUser?.Role === 'ADMIN' || currentUser?.Role === 'BENDAHARA';

  // Load data based on active tab
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (activeTab === 'summary') {
        const res = await api.reports.getSummary(filter);
        if (res.success) setSummaryData(res.data);
      } else if (activeTab === 'cashbook') {
        const res = await api.reports.getCashbook(filter);
        if (res.success) setCashbookData(res.data);
      } else if (activeTab === 'iuran') {
        const res = await api.reports.getIuran(filter);
        if (res.success) setIuranData(res.data);
      } else if (activeTab === 'santunan') {
        const res = await api.reports.getSantunan(filter);
        if (res.success) setSantunanData(res.data);
      } else if (activeTab === 'pengeluaran') {
        const res = await api.reports.getPengeluaran(filter);
        if (res.success) setPengeluaranData(res.data);
      } else if (activeTab === 'reconciliation' && isAdminOrBendahara) {
        const res = await api.reports.getReconciliation();
        if (res.success) setReconciliationData(res.data);
      }
    } catch (err: any) {
      console.error('Error loading report data:', err);
      setErrorMessage(err.message || 'Gagal memuat data laporan.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filter, isAdminOrBendahara]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Direct download from server endpoint
      const query = new URLSearchParams();
      if (filter.period) query.set('period', filter.period);
      if (filter.startDate) query.set('startDate', filter.startDate);
      if (filter.endDate) query.set('endDate', filter.endDate);
      if (filter.rt) query.set('rt', filter.rt);

      const response = await fetch(`/api/reports/export/excel?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('sijaka_token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh berkas Excel dari server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIJAKA_Laporan_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error('Excel export error:', err);
      setErrorMessage(err.message || 'Gagal mengekspor laporan ke Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export PDF using jsPDF + autoTable
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      // Ensure we have current summary data for the PDF
      const [sumRes, cashRes, iuranRes, santRes, expRes, recRes] = await Promise.all([
        api.reports.getSummary(filter),
        api.reports.getCashbook(filter),
        api.reports.getIuran(filter),
        api.reports.getSantunan(filter),
        api.reports.getPengeluaran(filter),
        isAdminOrBendahara ? api.reports.getReconciliation() : Promise.resolve({ success: false, data: null }),
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const formatRp = (val?: number | null) => `Rp ${(val ?? 0).toLocaleString('id-ID')}`;

      // 1. Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('JAMAAH TAHLIL AR ROHMAN', 105, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('RT 06 • RT 07 • RT 10 • Perum GPA Ngijo, Karangploso, Malang', 105, 20, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text('SIJAKA — SISTEM INFORMASI JAMINAN KEMATIAN', 105, 25, { align: 'center' });
      doc.line(14, 28, 196, 28);

      // 2. Report Details
      doc.setFontSize(11);
      doc.text('LAPORAN KEUANGAN & REKAPITULASI KAS', 14, 35);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Periode: ${sumRes.data?.periodInfo.label || 'Semua'}`, 14, 40);
      doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 44);
      doc.text(`Petugas: ${currentUser?.Nama || 'Admin'} (${currentUser?.Role || 'PENGURUS'})`, 140, 44);

      let currentY = 50;

      // 3. Summary Table
      if (sumRes.success && sumRes.data) {
        autoTable(doc, {
          startY: currentY,
          head: [['Komponen Keuangan', 'Jumlah Transaksi', 'Total Nominal (IDR)']],
          body: [
            ['Total Kas Masuk (Penerimaan Iuran)', String(sumRes.data.jumlahTransaksi.iuran), formatRp(sumRes.data.totalKasMasukPeriode)],
            ['Total Kas Keluar (Santunan & Pengeluaran)', String(sumRes.data.jumlahTransaksi.santunan + sumRes.data.jumlahTransaksi.pengeluaran), formatRp(sumRes.data.totalKasKeluarPeriode)],
            ['Surplus / Defisit Arus Kas Periode', String(sumRes.data.jumlahTransaksi.total), formatRp(sumRes.data.surplusDefisitPeriode)],
            ['Saldo Kas Riil (06_BUKU_KAS)', 'Single Source of Truth', formatRp(sumRes.data.saldoKasSekarang)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105] },
          styles: { fontSize: 8 },
        });

        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // 4. Cashbook Snippet / Summary
      if (cashRes.success && cashRes.data) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Ringkasan Mutasi Buku Kas', 14, currentY);
        currentY += 3;

        const cashRows = cashRes.data.items.slice(0, 15).map((t) => [
          t.Tanggal,
          t.ID_Transaksi,
          t.Jenis_Transaksi === 'KAS_MASUK' ? 'MASUK' : 'KELUAR',
          t.Uraian,
          t.Kas_Masuk ? formatRp(t.Kas_Masuk) : '-',
          t.Kas_Keluar ? formatRp(t.Kas_Keluar) : '-',
          formatRp(t.Saldo),
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Tanggal', 'ID', 'Jenis', 'Uraian', 'Masuk', 'Keluar', 'Saldo']],
          body: cashRows,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 7 },
        });

        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }

      // 5. Signature Block
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Mengetahui,', 30, currentY);
      doc.text('Ketua Jamaah Tahlil', 30, currentY + 4);
      doc.text('( Bpk. Agus Wardjo )', 30, currentY + 22);

      doc.text('Diverifikasi Oleh,', 95, currentY);
      doc.text('Bendahara', 95, currentY + 4);
      doc.text("( Bpk. Imam Rifa'i )", 95, currentY + 22);

      doc.text(`Malang, ${new Date().toLocaleDateString('id-ID')}`, 155, currentY);
      doc.text('Petugas Operator', 155, currentY + 4);
      doc.text('( Bpk. Safari )', 155, currentY + 22);

      doc.save(`SIJAKA_Laporan_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setErrorMessage(err.message || 'Gagal mengekspor laporan ke PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isPrintMode) {
    return (
      <PrintReportView
        type={activeTab}
        currentUser={currentUser}
        summaryData={summaryData}
        cashbookData={cashbookData}
        iuranData={iuranData}
        santunanData={santunanData}
        pengeluaranData={pengeluaranData}
        reconciliationData={reconciliationData}
        onBack={() => setIsPrintMode(false)}
      />
    );
  }

  return (
    <div id="laporan-main-view" className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>Laporan & Rekonsiliasi Keuangan</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              PHASE 4
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Jamaah Tahlil Ar Rohman • RT 06, RT 07, RT 10 Perum GPA Ngijo
          </p>
        </div>

        {/* Global Refresh Button */}
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold underline ml-3">
            Tutup
          </button>
        </div>
      )}

      {/* Unified Filter Bar */}
      <ReportFilter
        filter={filter}
        onChange={setFilter}
        onApply={loadData}
        onReset={() => {
          setFilter({ period: 'this_month', rt: 'all' });
        }}
        onExportExcel={() => setIsExportModalOpen(true)}
        onExportPdf={() => setIsExportModalOpen(true)}
        onPrint={() => setIsPrintMode(true)}
        isLoading={isLoading}
        isExporting={isExporting}
      />

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        <button
          id="tab-report-summary"
          onClick={() => setActiveTab('summary')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'summary'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Ringkasan Eksekutif</span>
        </button>

        <button
          id="tab-report-cashbook"
          onClick={() => setActiveTab('cashbook')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'cashbook'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Laporan Buku Kas</span>
        </button>

        <button
          id="tab-report-iuran"
          onClick={() => setActiveTab('iuran')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'iuran'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Rekap Iuran</span>
        </button>

        <button
          id="tab-report-santunan"
          onClick={() => setActiveTab('santunan')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'santunan'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Rekap Santunan</span>
        </button>

        <button
          id="tab-report-pengeluaran"
          onClick={() => setActiveTab('pengeluaran')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'pengeluaran'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Rekap Pengeluaran</span>
        </button>

        {isAdminOrBendahara && (
          <button
            id="tab-report-reconciliation"
            onClick={() => setActiveTab('reconciliation')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'reconciliation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Rekonsiliasi Keuangan</span>
          </button>
        )}
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'summary' && summaryData && (
          <div className="space-y-6">
            <ReportSummaryCards data={summaryData} />

            {/* RT Distribution Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['06', '07', '10'] as const).map((rtKey) => {
                const rtInfo = summaryData.rtBreakdown[rtKey] || { masuk: 0, keluar: 0, kkCount: 0 };
                return (
                  <div key={rtKey} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                        RT {rtKey}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {rtInfo.kkCount} KK Aktif
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Penerimaan Masuk:</span>
                        <span className="font-semibold text-emerald-700">Rp {(rtInfo?.masuk || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Pengeluaran/Santunan:</span>
                        <span className="font-semibold text-red-700">Rp {(rtInfo?.keluar || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900">
                        <span>Surplus / Defisit RT:</span>
                        <span className={((rtInfo?.masuk || 0) - (rtInfo?.keluar || 0)) >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                          Rp {((rtInfo?.masuk || 0) - (rtInfo?.keluar || 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'cashbook' && cashbookData && (
          <BukuKasReportView data={cashbookData} isLoading={isLoading} />
        )}

        {activeTab === 'iuran' && iuranData && (
          <IuranReportView data={iuranData} isLoading={isLoading} />
        )}

        {activeTab === 'santunan' && santunanData && (
          <SantunanReportView data={santunanData} isLoading={isLoading} />
        )}

        {activeTab === 'pengeluaran' && pengeluaranData && (
          <PengeluaranReportView data={pengeluaranData} isLoading={isLoading} />
        )}

        {activeTab === 'reconciliation' && reconciliationData && isAdminOrBendahara && (
          <RekonsiliasiView
            data={reconciliationData}
            onRefresh={loadData}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filter={filter}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
      />
    </div>
  );
};
