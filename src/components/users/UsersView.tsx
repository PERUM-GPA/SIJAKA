import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Search,
  Lock,
  User,
  Key,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { SafeUser, UserRole, UserStatus, Member } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { RoleBadge, StatusBadge } from '../common/Badge.tsx';
import { formatDateTimeIndo } from '../../lib/formatters.ts';

export function UsersView() {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form fields
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ANGGOTA');
  const [status, setStatus] = useState<UserStatus>('Aktif');
  const [idAnggota, setIdAnggota] = useState('');

  const fetchUsersAndMembers = async () => {
    try {
      setIsLoading(true);
      const [usersRes, membersRes] = await Promise.all([
        api.users.list(),
        api.anggota.list({ limit: 500 }),
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data);
      }
      if (membersRes.success) {
        setMembers(membersRes.data);
      }
    } catch (err: any) {
      toastError(err.message || 'Gagal memuat daftar user.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndMembers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!nama.trim() || !username.trim() || !password.trim()) {
      setModalError('Semua kolom wajib diisi.');
      return;
    }

    if (role === 'ANGGOTA' && !idAnggota) {
      setModalError('User dengan role ANGGOTA wajib memilih data anggota terkait.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.users.create({
        Nama: nama.trim(),
        Username: username.trim(),
        Password: password,
        Role: role,
        Status: status,
        ID_Anggota: idAnggota || undefined,
      });

      if (res.success) {
        success(res.message, 'User Dibuat');
        setIsModalOpen(false);
        // Reset form
        setNama('');
        setUsername('');
        setPassword('');
        setRole('ANGGOTA');
        setIdAnggota('');
        fetchUsersAndMembers();
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal membuat user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="users-view-root" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Manajemen Pengguna Sistem
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              08_USERS (ADMIN ONLY)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola hak akses dan peran (RBAC): Admin, Bendahara, Pengurus, Anggota, Viewer
          </p>
        </div>

        <button
          id="btn-tambah-user"
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs sm:text-sm text-slate-500">Memuat data pengguna...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID User</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role Akses</th>
                  <th className="py-3 px-4">ID Anggota Terkait</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Terakhir Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.ID_User} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{u.ID_User}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.Nama}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">@{u.Username}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.Role} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {u.ID_Anggota ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {u.ID_Anggota}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.Status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {formatDateTimeIndo(u.Terakhir_Login)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tambah Akun Pengguna</h3>
                <p className="text-xs text-slate-500">Password akan dienkripsi secara aman (hashing).</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Bpk. Muhammad Ilham"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="Contoh: milham"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="BENDAHARA">BENDAHARA</option>
                    <option value="PENGURUS">PENGURUS</option>
                    <option value="ANGGOTA">ANGGOTA</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Akun *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              {/* Anggota ID Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautkan ke Data Anggota {role === 'ANGGOTA' ? '(Wajib untuk role ANGGOTA)' : '(Opsional)'}
                </label>
                <select
                  value={idAnggota}
                  onChange={(e) => setIdAnggota(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                  required={role === 'ANGGOTA'}
                >
                  <option value="">-- Pilih Anggota Terdaftar --</option>
                  {members.map((m) => (
                    <option key={m.ID_Anggota} value={m.ID_Anggota}>
                      {m.ID_Anggota} - {m.Nama} (RT {m.RT})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
