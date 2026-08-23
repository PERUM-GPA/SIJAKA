import React, { useState } from 'react';
import { Menu, LogOut, ShieldCheck, Database, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { RoleBadge } from '../common/Badge.tsx';
import { ConfirmModal } from '../common/ConfirmModal.tsx';
import { ChangePasswordModal } from '../member/ChangePasswordModal.tsx';

interface TopbarProps {
  onToggleMobileMenu: () => void;
  sheetsConfigured?: boolean;
}

export function Topbar({ onToggleMobileMenu, sheetsConfigured = false }: TopbarProps) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  return (
    <>
      <header
        id="topbar-header"
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs"
      >
        {/* Left Side: Mobile toggle + Page Context */}
        <div className="flex items-center space-x-3">
          <button
            id="btn-toggle-mobile-sidebar"
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                SIJAKA
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400">•</span>
              <span className="hidden sm:inline-block text-xs font-medium text-slate-600">
                Jamaah Tahlil Ar Rohman
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Sistem Informasi Jaminan Kematian RT 06 • RT 07 • RT 10 Perum GPA Ngijo
            </p>
          </div>
        </div>

        {/* Right Side: Status Badge + User Info + Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Database Status Indicator */}
          <div
            id="db-status-badge"
            className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              sheetsConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title={
              sheetsConfigured
                ? 'Terhubung dengan Google Spreadsheet SIJAKA'
                : 'Server Data Store Aktif'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span className="text-[11px]">
              {sheetsConfigured ? 'Google Sheets Sync' : 'Database Ready'}
            </span>
          </div>

          {/* User Profile Chip */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[130px]">
                  {user.Nama}
                </p>
                <div className="flex items-center justify-end space-x-1 mt-0.5">
                  <RoleBadge role={user.Role} />
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user.Nama?.charAt(0) || 'U'}
              </div>
            </div>
          )}

          {/* Quick Change Password Button */}
          {user && (
            <button
              id="btn-topbar-change-password"
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Ubah Kata Sandi"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}

          {/* Logout Button */}
          <button
            id="btn-topbar-logout"
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Keluar dari Aplikasi"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        isForced={false}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari aplikasi SIJAKA?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
