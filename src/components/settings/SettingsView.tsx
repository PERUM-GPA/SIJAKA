import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, Database, HelpCircle } from 'lucide-react';
import { Setting, AppSettings } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { formatRupiah } from '../../lib/formatters.ts';

export function SettingsView() {
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [parsed, setParsed] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.settings.get();
      if (res.success) {
        setSettings(res.data);
        setParsed(res.parsed);
        const map: Record<string, string> = {};
        res.data.forEach((s) => {
          map[s.Key] = s.Value;
        });
        setEditValues(map);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat pengaturan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSetting = async (key: string) => {
    const val = editValues[key];
    if (val === undefined) return;

    try {
      setSavingKey(key);
      const res = await api.settings.update(key, val);
      if (res.success) {
        success(`Pengaturan ${key} berhasil diperbarui.`, 'Tersimpan');
        fetchSettings();
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div id="settings-view-root" className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pengaturan Sistem SIJAKA
          </h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            10_SETTINGS
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Konfigurasi parameter operasional paguyuban Jamaah Tahlil Ar Rohman
        </p>
      </div>

      {/* Settings Grid Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs sm:text-sm text-slate-500">Memuat konfigurasi...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {settings.map((item) => (
              <div
                key={item.Key}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                      {item.Key}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {item.Tipe}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.Keterangan}</p>
                  {item.Key === 'IURAN_BULANAN' && (
                    <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                      Format: {formatRupiah(editValues[item.Key])} / bulan
                    </p>
                  )}
                  {item.Key === 'NOMINAL_SANTUNAN' && (
                    <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                      Format: {formatRupiah(editValues[item.Key])}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <input
                    type="text"
                    value={editValues[item.Key] || ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [item.Key]: e.target.value,
                      }))
                    }
                    className="w-48 sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />

                  <button
                    id={`btn-save-setting-${item.Key}`}
                    onClick={() => handleSaveSetting(item.Key)}
                    disabled={savingKey === item.Key}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingKey === item.Key ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
