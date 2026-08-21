import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { ActivityLog } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { formatDateTimeIndo } from '../../lib/formatters.ts';

export function LogsView() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.logs.list();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat log aktivitas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.Deskripsi.toLowerCase().includes(search.toLowerCase()) ||
      log.Nama_User.toLowerCase().includes(search.toLowerCase()) ||
      log.Record_ID.toLowerCase().includes(search.toLowerCase()) ||
      log.Modul.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.Aksi === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div id="logs-view-root" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Log Aktivitas Sistem
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              09_LOG_AKTIVITAS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekam jejak audit keamanan (LOGIN, LOGOUT, CREATE, UPDATE, DELETE)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi, nama user, atau record ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500 shrink-0">Aksi:</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Aksi</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs sm:text-sm text-slate-500">Memuat riwayat log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Tidak ada catatan aktivitas yang sesuai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID Log / Waktu</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Modul</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Deskripsi Aktivitas</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.ID_Log} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900">{log.ID_Log}</span>
                      <p className="text-[11px] text-slate-400">{formatDateTimeIndo(log.Timestamp)}</p>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.Aksi === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.Aksi === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : log.Aksi === 'DELETE'
                            ? 'bg-rose-100 text-rose-800'
                            : log.Aksi === 'LOGIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.Aksi}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-700 text-xs">
                      {log.Modul}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{log.Nama_User}</p>
                      <p className="text-[11px] font-mono text-slate-400">{log.ID_User}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      <p>{log.Deskripsi}</p>
                      {log.Record_ID && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          ID: {log.Record_ID}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {log.Status === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Berhasil</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-600 text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Gagal</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
