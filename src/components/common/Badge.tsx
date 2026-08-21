import React from 'react';
import { MemberStatus, UserRole, UserStatus } from '../../types/index.ts';

interface StatusBadgeProps {
  status: MemberStatus | UserStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'Aktif':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Tidak Aktif':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Meninggal':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()}`}
    >
      {status}
    </span>
  );
}

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const getRoleStyle = () => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'BENDAHARA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PENGURUS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ANGGOTA':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'VIEWER':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getRoleStyle()}`}
    >
      {role}
    </span>
  );
}

interface RTBadgeProps {
  rt: string;
}

export function RTBadge({ rt }: RTBadgeProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
      RT {rt}
    </span>
  );
}
