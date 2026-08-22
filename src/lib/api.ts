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
  DeathReport,
  Compensation,
  CashTransaction,
  CashSummary,
  Expense,
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

  kematian: {
    list: (params: { search?: string; status?: string; rt?: string; page?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.status) query.set('status', params.status);
      if (params.rt) query.set('rt', params.rt);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: (DeathReport & {
          namaAnggota: string;
          noKK: string;
          nikAnggota: string;
          rtAnggota: string;
          alamatAnggota: string;
          statusSantunan: string;
          idSantunan?: string;
        })[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/kematian?${query.toString()}`);
    },
    get: (id: string) =>
      request<{
        success: boolean;
        data: DeathReport & {
          member?: Member;
          families?: Family[];
          santunan?: Compensation | null;
        };
      }>(`/api/kematian/${id}`),
    create: (data: {
      ID_Anggota: string;
      Tanggal_Lapor?: string;
      Pelapor: string;
      Hubungan_Pelapor: string;
      Waktu_Kematian: string;
      Tempat_Kematian: string;
      Penyebab_Kematian?: string;
      Dokumen_Pendukung?: string;
      Keterangan?: string;
    }) =>
      request<{ success: boolean; message: string; data: DeathReport }>('/api/kematian', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<DeathReport>) =>
      request<{ success: boolean; message: string; data: DeathReport }>(`/api/kematian/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    verify: (id: string, status: 'DIVERIFIKASI' | 'DITOLAK', keterangan?: string) =>
      request<{ success: boolean; message: string; data: DeathReport }>(`/api/kematian/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status, keterangan }),
      }),
    approve: (id: string, status: 'DISETUJUI' | 'DITOLAK', keterangan?: string) =>
      request<{ success: boolean; message: string; data: DeathReport }>(`/api/kematian/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status, keterangan }),
      }),
  },

  santunan: {
    list: (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.status) query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: (Compensation & {
          namaAnggota: string;
          noKK: string;
          rtAnggota: string;
          laporanTanggal: string;
          statusLaporan: string;
          isDisbursed: boolean;
        })[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/santunan?${query.toString()}`);
    },
    get: (id: string) =>
      request<{
        success: boolean;
        data: Compensation & {
          member?: Member;
          report?: DeathReport;
          families?: Family[];
        };
      }>(`/api/santunan/${id}`),
    create: (data: {
      ID_Laporan: string;
      ID_Anggota: string;
      ID_AhliWaris: string;
      Nama_Penerima: string;
      Hubungan_Penerima: string;
      Nominal_Santunan?: number;
      Tanggal_Pengajuan?: string;
      Keterangan?: string;
    }) =>
      request<{ success: boolean; message: string; data: Compensation }>('/api/santunan', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Compensation>) =>
      request<{ success: boolean; message: string; data: Compensation }>(`/api/santunan/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    verify: (id: string, status: 'TERVERIFIKASI' | 'DITOLAK', keterangan?: string) =>
      request<{ success: boolean; message: string; data: Compensation }>(`/api/santunan/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status, keterangan }),
      }),
    approve: (id: string, status: 'DISETUJUI' | 'DITOLAK', keterangan?: string) =>
      request<{ success: boolean; message: string; data: Compensation }>(`/api/santunan/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status, keterangan }),
      }),
    disburse: (
      id: string,
      data: {
        Tanggal_Pencairan?: string;
        Metode_Pencairan: string;
        Nomor_Bukti?: string;
        Bukti_Pencairan?: string;
        Keterangan?: string;
      }
    ) =>
      request<{
        success: boolean;
        message: string;
        data: { santunan: Compensation; cashTransactionId: string };
      }>(`/api/santunan/${id}/disburse`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  bukuKas: {
    list: (params: {
      search?: string;
      jenis?: string;
      sumber?: string;
      status?: string;
      dariTanggal?: string;
      sampaiTanggal?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.jenis) query.set('jenis', params.jenis);
      if (params.sumber) query.set('sumber', params.sumber);
      if (params.status) query.set('status', params.status);
      if (params.dariTanggal) query.set('dariTanggal', params.dariTanggal);
      if (params.sampaiTanggal) query.set('sampaiTanggal', params.sampaiTanggal);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: CashTransaction[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/buku-kas?${query.toString()}`);
    },
    getSummary: () =>
      request<{ success: boolean; data: CashSummary }>('/api/buku-kas/summary'),
    get: (id: string) =>
      request<{ success: boolean; data: CashTransaction }>(`/api/buku-kas/${id}`),
    cancel: (id: string, alasan: string) =>
      request<{ success: boolean; message: string; data: CashTransaction }>(`/api/buku-kas/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ alasan }),
      }),
  },

  pengeluaran: {
    list: (params: { search?: string; kategori?: string; status?: string; page?: number; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.kategori) query.set('kategori', params.kategori);
      if (params.status) query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      return request<{
        success: boolean;
        data: Expense[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/pengeluaran?${query.toString()}`);
    },
    get: (id: string) =>
      request<{ success: boolean; data: Expense }>(`/api/pengeluaran/${id}`),
    create: (data: {
      Tanggal_Pengeluaran?: string;
      Kategori: string;
      Uraian: string;
      Nominal: number;
      Metode_Pembayaran?: string;
      Nomor_Bukti?: string;
      Bukti_Pengeluaran?: string;
      Keterangan?: string;
    }) =>
      request<{ success: boolean; message: string; data: Expense }>('/api/pengeluaran', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Expense>) =>
      request<{ success: boolean; message: string; data: Expense }>(`/api/pengeluaran/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    approve: (id: string, status: 'DISETUJUI' | 'DITOLAK', keterangan?: string) =>
      request<{ success: boolean; message: string; data: Expense }>(`/api/pengeluaran/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status, keterangan }),
      }),
    pay: (
      id: string,
      data: {
        Tanggal_Pengeluaran?: string;
        Metode_Pembayaran?: string;
        Nomor_Bukti?: string;
        Bukti_Pengeluaran?: string;
        Keterangan?: string;
      }
    ) =>
      request<{
        success: boolean;
        message: string;
        data: { expense: Expense; cashTransactionId: string };
      }>(`/api/pengeluaran/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
