import React, { useState } from 'react';
import { Building2, Lock, User, ArrowRight, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Silakan masukkan username dan password.');
      return;
    }

    setIsSubmitting(true);
    const ok = await login(username.trim(), password);
    setIsSubmitting(false);

    if (ok && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleQuickFill = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setErrorMessage('');
  };

  return (
    <div id="login-view-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-950/40">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            SIJAKA
          </h1>
          <p className="text-sm font-semibold text-emerald-400 mt-1">
            Sistem Informasi Jaminan Kematian
          </p>
          <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs text-slate-300">
            <span className="font-semibold text-white">Jamaah Tahlil Ar Rohman</span>
            <span>•</span>
            <span>RT 06 • RT 07 • RT 10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Perum GPA Ngijo</p>
        </div>

        {/* Login Box */}
        <div className="mt-8 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md shadow-emerald-950/50 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke SIJAKA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Preset Helper */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Pilihan Akun Demo (Klik untuk Isi Cepat)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                id="btn-fill-admin"
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-purple-300">Admin</p>
                <p className="text-[10px] text-slate-400">admin / admin123</p>
              </button>

              <button
                id="btn-fill-bendahara"
                type="button"
                onClick={() => handleQuickFill('bendahara', 'bendahara123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-blue-300">Bendahara</p>
                <p className="text-[10px] text-slate-400">bendahara / bendahara123</p>
              </button>

              <button
                id="btn-fill-pengurus"
                type="button"
                onClick={() => handleQuickFill('pengurus', 'pengurus123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-emerald-300">Pengurus</p>
                <p className="text-[10px] text-slate-400">pengurus / pengurus123</p>
              </button>

              <button
                id="btn-fill-anggota"
                type="button"
                onClick={() => handleQuickFill('anggota', 'anggota123')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-amber-300">Anggota</p>
                <p className="text-[10px] text-slate-400">anggota / anggota123</p>
              </button>
            </div>
            
            <div className="mt-2 text-center">
              <button
                id="btn-fill-viewer"
                type="button"
                onClick={() => handleQuickFill('viewer', 'viewer123')}
                className="w-full p-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/60 text-slate-400 text-[11px] transition-colors cursor-pointer"
              >
                Atau masuk sebagai <span className="text-slate-200 font-medium">Viewer (viewer / viewer123)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Keamanan Terenkripsi • Google Sheets API Backend Proxy</span>
        </div>
      </div>
    </div>
  );
}
