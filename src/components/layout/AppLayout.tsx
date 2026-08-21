import React, { useState } from 'react';
import { Sidebar, ActiveTab } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  sheetsConfigured?: boolean;
}

export function AppLayout({
  children,
  activeTab,
  setActiveTab,
  sheetsConfigured,
}: AppLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div id="sijaka-app-layout" className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Topbar
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
          sheetsConfigured={sheetsConfigured}
        />

        <main id="main-content-area" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
