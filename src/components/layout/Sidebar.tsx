import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  HeartHandshake,
  BookOpen,
  Receipt,
  FileText,
  Shield,
  History,
  Settings,
  Users2,
  Building2,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

export type ActiveTab =
  | 'dashboard'
  | 'public-preview'
  | 'anggota'
  | 'anggota-tambah'
  | 'anggota-detail'
  | 'anggota-edit'
  | 'keluarga'
  | 'iuran'
  | 'kematian'
  | 'santunan'
  | 'buku-kas'
  | 'pengeluaran'
  | 'laporan'
  | 'users'
  | 'logs'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  badge?: string;
  isPhase2?: boolean;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const { user } = useAuth();
  const role = user?.Role || 'ANGGOTA';

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
    },
    {
      id: 'public-preview',
      label: 'Dashboard Publik (Warga)',
      icon: Globe,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
      badge: 'Publik',
    },
    {
      id: 'anggota',
      label: 'Data Anggota',
      icon: Users,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
    },
    {
      id: 'keluarga',
      label: 'Data Keluarga',
      icon: Users2,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
    },
    {
      id: 'iuran',
      label: 'Iuran Wajib',
      icon: CreditCard,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
    },
    {
      id: 'kematian',
      label: 'Laporan Kematian',
      icon: UserCheck,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
    },
    {
      id: 'santunan',
      label: 'Santunan Kematian',
      icon: HeartHandshake,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS', 'ANGGOTA'],
    },
    {
      id: 'buku-kas',
      label: 'Buku Kas (Ledger)',
      icon: BookOpen,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS'],
    },
    {
      id: 'pengeluaran',
      label: 'Pengeluaran',
      icon: Receipt,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS'],
    },
    {
      id: 'users',
      label: 'Manajemen Users',
      icon: Shield,
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'logs',
      label: 'Log Aktivitas',
      icon: History,
      allowedRoles: ['ADMIN', 'BENDAHARA', 'PENGURUS'],
    },
    {
      id: 'settings',
      label: 'Pengaturan Sistem',
      icon: Settings,
      allowedRoles: ['ADMIN'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.allowedRoles.includes(role));

  const handleSelect = (id: ActiveTab) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  const getIsActive = (itemId: ActiveTab) => {
    if (activeTab === itemId) return true;
    if (itemId === 'anggota' && ['anggota-tambah', 'anggota-detail', 'anggota-edit'].includes(activeTab)) {
      return true;
    }
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar-container"
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white">SIJAKA</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">Jamaah Tahlil Ar Rohman</p>
            </div>
          </div>
          
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 flex items-center justify-between">
            <span className="font-medium">RT 06 • RT 07 • RT 10</span>
            <span className="text-slate-400">Perum GPA Ngijo</span>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = getIsActive(item.id);

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* User Card in Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-xs uppercase">
              {user?.Username?.substring(0, 2) || 'US'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.Nama || 'Pengguna'}</p>
              <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>{user?.Role}</span>
                {user?.ID_Anggota && <span className="text-slate-500">({user.ID_Anggota})</span>}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
