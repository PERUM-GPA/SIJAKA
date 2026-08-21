import React from 'react';
import {
  Clock,
  ArrowLeft,
  Users2,
  CreditCard,
  UserCheck,
  HeartHandshake,
  BookOpen,
  Receipt,
  FileText,
} from 'lucide-react';
import { ActiveTab } from '../layout/Sidebar.tsx';

interface ModulePlaceholderViewProps {
  tab: ActiveTab;
  onBackToDashboard: () => void;
}

export function ModulePlaceholderView({ tab, onBackToDashboard }: ModulePlaceholderViewProps) {
  const getModuleInfo = () => {
    switch (tab) {
      case 'keluarga':
        return {
          code: '02_KELUARGA',
          title: 'Modul Data Anggota Keluarga & Tanggungan',
          desc: 'Manajemen data hubungan keluarga (Kepala Keluarga, Istri, Anak, Orang Tua) dan status tanggungan santunan.',
          icon: Users2,
          phase: 'Phase 2',
        };
      case 'iuran':
        return {
          code: '03_IURAN',
          title: 'Modul Iuran Wajib Bulanan',
          desc: 'Pencatatan pembayaran iuran warga Rp5.000/bulan, status lunas, metode bayar (Tunai/Transfer), dan verifikasi bendahara.',
          icon: CreditCard,
          phase: 'Phase 2',
        };
      case 'kematian':
        return {
          code: '04_LAPORAN_KEMATIAN',
          title: 'Modul Laporan Kematian',
          desc: 'Penerimaan dan verifikasi laporan warga/keluarga meninggal di RT 06, RT 07, RT 10 untuk proses klaim santunan.',
          icon: UserCheck,
          phase: 'Phase 2',
        };
      case 'santunan':
        return {
          code: '05_SANTUNAN',
          title: 'Modul Penyaluran Santunan Kematian',
          desc: 'Pencatatan dan berita acara penyerahan santunan Rp600.000 kepada ahli waris jamaah.',
          icon: HeartHandshake,
          phase: 'Phase 2',
        };
      case 'buku-kas':
        return {
          code: '06_BUKU_KAS',
          title: 'Modul Buku Kas Paguyuban',
          desc: 'Pencatatan mutasi kas masuk dan keluar secara berkesinambungan serta saldo real-time.',
          icon: BookOpen,
          phase: 'Phase 2',
        };
      case 'pengeluaran':
        return {
          code: '07_PENGELUARAN',
          title: 'Modul Pengeluaran Operasional',
          desc: 'Pencatatan biaya takziah, perlengkapan jenazah, konsumsi tahlil, dan bukti nota pertanggungjawaban.',
          icon: Receipt,
          phase: 'Phase 2',
        };
      case 'laporan':
        return {
          code: 'LAPORAN_KEUANGAN',
          title: 'Modul Laporan & Rekapitulasi',
          desc: 'Ekspor rekapitulasi iuran per RT, laporan kas bulanan/tahunan, dan transparansi dana jamaah.',
          icon: FileText,
          phase: 'Phase 2',
        };
      default:
        return {
          code: 'MODUL',
          title: 'Modul SIJAKA',
          desc: 'Modul ini dijadwalkan pada tahap berikutnya.',
          icon: Clock,
          phase: 'Phase 2',
        };
    }
  };

  const info = getModuleInfo();
  const Icon = info.icon;

  return (
    <div id="placeholder-view-root" className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 text-center shadow-xs space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <span className="font-mono">{info.code}</span>
            <span>•</span>
            <span className="text-emerald-700">{info.phase}</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900">{info.title}</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {info.desc}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-left space-y-2">
          <p className="font-semibold text-slate-700">Status Arsitektur:</p>
          <p>
            Interface TypeScript (<code>Family</code>, <code>Contribution</code>, <code>DeathReport</code>, dll.) dan service placeholder di backend sudah disiapkan dengan rapi.
          </p>
          <p>
            Saat ini sistem berfokus pada kestabilan <strong>PHASE 1 (Core SIJAKA: Anggota, Users, Logs, Settings, Auth, RBAC, dan Google Sheets Engine)</strong>.
          </p>
        </div>

        <div>
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
