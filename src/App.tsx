/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Main Application Component
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { ActiveTab } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { AnggotaListView } from './components/anggota/AnggotaListView.tsx';
import { AnggotaFormView } from './components/anggota/AnggotaFormView.tsx';
import { AnggotaDetailView } from './components/anggota/AnggotaDetailView.tsx';
import { KeluargaListView } from './components/keluarga/KeluargaListView.tsx';
import { IuranListView } from './components/iuran/IuranListView.tsx';
import { UsersView } from './components/users/UsersView.tsx';
import { LogsView } from './components/logs/LogsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { ModulePlaceholderView } from './components/placeholders/ModulePlaceholderView.tsx';
import { api } from './lib/api.ts';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [sheetsConfigured, setSheetsConfigured] = useState(false);

  useEffect(() => {
    // Check Google Sheets connection status
    api.status.check().then((res) => {
      if (res && res.success) {
        setSheetsConfigured(res.googleSheetsConfigured);
      }
    }).catch(() => {
      setSheetsConfigured(false);
    });
  }, []);

  // When user logs in or out, reset selected tab if unauthorized
  useEffect(() => {
    if (user) {
      // Role guards
      if (user.Role === 'ANGGOTA' || user.Role === 'VIEWER') {
        if (['users', 'settings'].includes(activeTab)) {
          setActiveTab('dashboard');
        }
      }
    }
  }, [user, activeTab]);

  if (isLoading) {
    return (
      <div id="loading-screen" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Memuat Sistem SIJAKA...
        </p>
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!user) {
    return <LoginView onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  // Navigation handlers
  const handleAddMember = () => {
    setSelectedMemberId(null);
    setActiveTab('anggota-tambah');
  };

  const handleViewDetail = (id: string) => {
    setSelectedMemberId(id);
    setActiveTab('anggota-detail');
  };

  const handleEditMember = (id: string) => {
    setSelectedMemberId(id);
    setActiveTab('anggota-edit');
  };

  const handleBackToList = () => {
    setSelectedMemberId(null);
    setActiveTab('anggota');
  };

  // Render appropriate view based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;

      case 'anggota':
        return (
          <AnggotaListView
            onAddMember={handleAddMember}
            onViewDetail={handleViewDetail}
            onEditMember={handleEditMember}
          />
        );

      case 'anggota-tambah':
        return (
          <AnggotaFormView
            onBack={handleBackToList}
            onSuccess={handleBackToList}
          />
        );

      case 'anggota-edit':
        return (
          <AnggotaFormView
            memberId={selectedMemberId || undefined}
            onBack={handleBackToList}
            onSuccess={handleBackToList}
          />
        );

      case 'anggota-detail':
        return (
          <AnggotaDetailView
            memberId={selectedMemberId || ''}
            onBack={handleBackToList}
            onEdit={handleEditMember}
          />
        );

      case 'users':
        if (user.Role !== 'ADMIN') {
          return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
        }
        return <UsersView />;

      case 'logs':
        if (!['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user.Role)) {
          return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
        }
        return <LogsView />;

      case 'settings':
        if (user.Role !== 'ADMIN') {
          return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
        }
        return <SettingsView />;

      case 'keluarga':
        return <KeluargaListView />;

      case 'iuran':
        return <IuranListView />;

      // Placeholder modules for Phase 3+
      case 'kematian':
      case 'santunan':
      case 'buku-kas':
      case 'pengeluaran':
      case 'laporan':
        return (
          <ModulePlaceholderView
            tab={activeTab}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        );

      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sheetsConfigured={sheetsConfigured}
    >
      {renderContent()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
