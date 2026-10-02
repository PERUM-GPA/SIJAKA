import React, { useState } from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import { Sidebar, ActiveTab } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';
import { AssistantSIJAKA } from '../assistant/AssistantSIJAKA.tsx';

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
  const [isAssistantFloatingOpen, setIsAssistantFloatingOpen] = useState(false);

  return (
    <div id="sijaka-app-layout" className="min-h-screen bg-slate-50 flex relative">
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

      {/* Floating Assistant SIJAKA (Only for authenticated users, hidden when already on asisten tab) */}
      {activeTab !== 'asisten' && (
        <div id="sijaka-floating-assistant" className="fixed bottom-5 right-5 z-40">
          {isAssistantFloatingOpen ? (
            <div
              id="floating-assistant-panel"
              className="w-[360px] sm:w-[410px] h-[540px] max-h-[calc(100vh-6rem)] rounded-2xl shadow-2xl border border-slate-300/80 overflow-hidden flex flex-col bg-white"
            >
              <AssistantSIJAKA
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setIsAssistantFloatingOpen(false);
                }}
                isFloating
                onClose={() => setIsAssistantFloatingOpen(false)}
              />
            </div>
          ) : (
            <button
              id="btn-open-assistant"
              type="button"
              onClick={() => setIsAssistantFloatingOpen(true)}
              className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white rounded-full shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 group border border-emerald-400/40 cursor-pointer"
              aria-label="Buka Asisten SIJAKA"
            >
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-emerald-300 group-hover:rotate-12 transition-transform shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-left pr-1">
                <div className="text-xs font-bold leading-tight tracking-wide flex items-center gap-1.5">
                  <span>Asisten SIJAKA</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-emerald-200/90 leading-tight">
                  Bantuan informasi & navigasi
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
