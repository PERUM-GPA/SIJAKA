import {
  Member,
  SafeUser,
  ActivityLog,
  Setting,
  AppSettings,
  DashboardMetrics,
  PublicDashboardMetrics,
  PublicDaftarKKPayload,
  Family,
  Contribution,
  MemberArrearsInfo,
} from '../types/index.ts';

const TOKEN_KEY = 'sijaka_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        removeStoredToken();
      }
      throw new Error(data.message || 'Gagal terhubung ke database. Silakan coba lagi.');
    }

    return data;
  } catch (error: any) {
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error('Gagal terhubung ke server SIJAKA. Silakan periksa koneksi Anda.');
    }
    throw error;
  }
}

// ==========================================
// AUTH API
// ==========================================
export const api = {
  auth: {
    login: (body: { username: string; password: string }) =>
      request<{ success: boolean; token: string; user: SafeUser; message: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    logout: () =>
      request<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      }),
    me: () =>
      request<{ success: boolean; user: SafeUser }>('/api/auth/me'),
  },

  dashboard: {
    getMetrics: () =>
      request<{ success: boolean; data: DashboardMetrics }>('/api/dashboard/metrics'),
  },

  anggota: {
    list: (params: { search?: string; rt?: string; status?: string; page?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.rt) query.set('rt', params.rt);
      if (params.status) query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: Member[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/anggota?${query.toString()}`);
    },
    get: (id: string) =>
      request<{ success: boolean; data: Member }>(`/api/anggota/${id}`),
    create: (data: Omit<Member, 'ID_Anggota'>) =>
      request<{ success: boolean; message: string; data: Member }>('/api/anggota', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Member>) =>
      request<{ success: boolean; message: string; data: Member }>(`/api/anggota/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/anggota/${id}`, {
        method: 'DELETE',
      }),
  },

  keluarga: {
    list: (params: {
      search?: string;
      idAnggota?: string;
      hubungan?: string;
      status?: string;
      calonAhliWaris?: string;
      rt?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.idAnggota) query.set('idAnggota', params.idAnggota);
      if (params.hubungan) query.set('hubungan', params.hubungan);
      if (params.status) query.set('status', params.status);
      if (params.calonAhliWaris) query.set('calonAhliWaris', params.calonAhliWaris);
      if (params.rt) query.set('rt', params.rt);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: (Family & { namaAnggota?: string; noKKAnggota?: string; rtAnggota?: string; statusAnggota?: string })[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/keluarga?${query.toString()}`);
    },
    get: (id: string) =>
      request<{
        success: boolean;
        data: {
          family: Family;
          member: { ID_Anggota: string; Nama: string; No_KK: string; RT: string; Status: string; Alamat: string } | null;
        };
      }>(`/api/keluarga/${id}`),
    create: (data: Omit<Family, 'ID_Keluarga'>) =>
      request<{ success: boolean; message: string; data: Family }>('/api/keluarga', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Family>) =>
      request<{ success: boolean; message: string; data: Family }>(`/api/keluarga/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; data: Family }>(`/api/keluarga/${id}`, {
        method: 'DELETE',
      }),
    getByMember: (memberId: string) =>
      request<{ success: boolean; data: Family[] }>(`/api/anggota/${memberId}/keluarga`),
  },

  iuran: {
    list: (params: {
      search?: string;
      idAnggota?: string;
      bulan?: number;
      tahun?: number;
      rt?: string;
      status?: string;
      metode?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.idAnggota) query.set('idAnggota', params.idAnggota);
      if (params.bulan) query.set('bulan', String(params.bulan));
      if (params.tahun) query.set('tahun', String(params.tahun));
      if (params.rt) query.set('rt', params.rt);
      if (params.status) query.set('status', params.status);
      if (params.metode) query.set('metode', params.metode);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: (Contribution & { namaAnggota?: string; rtAnggota?: string; statusAnggota?: string })[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/iuran?${query.toString()}`);
    },
    get: (id: string) =>
      request<{
        success: boolean;
        data: Contribution & { namaAnggota?: string; rtAnggota?: string };
      }>(`/api/iuran/${id}`),
    create: (data: {
      ID_Anggota: string;
      Periode_Bulan: number;
      Periode_Tahun: number;
      Tanggal_Bayar?: string;
      Nominal?: number;
      Metode?: string;
      Keterangan?: string;
    }) =>
      request<{ success: boolean; message: string; data: Contribution }>('/api/iuran', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    checkDuplicate: (idAnggota: string, bulan: number, tahun: number) =>
      request<{ success: boolean; isDuplicate: boolean; message: string }>(
        `/api/iuran/check-duplicate?idAnggota=${encodeURIComponent(idAnggota)}&bulan=${bulan}&tahun=${tahun}`
      ),
    getArrearsSummary: () =>
      request<{
        success: boolean;
        data: {
          membersArrears: MemberArrearsInfo[];
          summary: {
            totalAnggotaAktif: number;
            jumlahSudahBayarBulanIni: number;
            jumlahBelumBayarBulanIni: number;
            totalAnggotaMenunggak: number;
            totalNominalTunggakan: number;
            totalIuranTerkumpulBulanIni: number;
          };
        };
      }>('/api/iuran/tunggakan'),
    getByMember: (memberId: string) =>
      request<{ success: boolean; data: Contribution[] }>(`/api/anggota/${memberId}/iuran`),
    getMemberArrears: (memberId: string) =>
      request<{ success: boolean; data: MemberArrearsInfo }>(`/api/anggota/${memberId}/tunggakan`),
  },

  users: {
    list: () =>
      request<{ success: boolean; data: SafeUser[] }>('/api/users'),
    create: (data: { Nama: string; Username: string; Password: string; Role: string; Status: string; ID_Anggota?: string }) =>
      request<{ success: boolean; message: string; data: SafeUser }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  logs: {
    list: () =>
      request<{ success: boolean; data: ActivityLog[] }>('/api/logs'),
  },

  settings: {
    get: () =>
      request<{ success: boolean; data: Setting[]; parsed: AppSettings }>('/api/settings'),
    update: (key: string, value: string) =>
      request<{ success: boolean; message: string; data: Setting }>(`/api/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }),
  },

  public: {
    getDashboard: () =>
      request<{ success: boolean; data: PublicDashboardMetrics }>('/api/public/dashboard'),
    daftarKK: (payload: PublicDaftarKKPayload) =>
      request<{
        success: boolean;
        message: string;
        data?: { idAnggota: string; nama: string; totalJiwa: number };
      }>('/api/public/daftar-kk', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  status: {
    check: () =>
      request<{
        success: boolean;
        googleSheetsConfigured: boolean;
        sheetIdConfigured: boolean;
        emailConfigured: boolean;
        keyConfigured: boolean;
      }>('/api/status'),
  },
};
