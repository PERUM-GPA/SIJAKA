import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, generateToken, requireAuth, requireRole, resolveMemberIdForUser } from './server/auth.ts';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from './lib/googleSheets/anggota.ts';
import {
  getUserByUsername,
  getUserByUsernameOrNoKK,
  changeUserPassword,
  getAllSafeUsers,
  createUser,
  verifyUserPassword,
  updateLastLogin,
  toSafeUser,
} from './lib/googleSheets/users.ts';
import {
  getAllFamilies,
  getFamilyById,
  getFamiliesByMemberId,
  createFamily,
  updateFamily,
  softDeleteFamily,
} from './lib/googleSheets/keluarga.ts';
import {
  getAllContributions,
  getContributionById,
  getContributionsByMemberId,
  createContribution,
  updateContribution,
  checkPaymentExists,
} from './lib/googleSheets/iuran.ts';
import {
  calculateMemberArrears,
  calculateAllMembersArrears,
} from './lib/services/arrears.ts';
import { getAllLogs, createActivityLog } from './lib/googleSheets/logs.ts';
import { getAllSettings, updateSetting, getParsedSettings } from './lib/googleSheets/settings.ts';
import {
  getAllDeathReports,
  getDeathReportById,
  getDeathReportsByMemberId,
  createDeathReport,
  updateDeathReport,
  verifyDeathReport,
  approveDeathReport,
} from './lib/googleSheets/kematian.ts';
import {
  getAllSantunan,
  getSantunanById,
  getSantunanByLaporanId,
  createSantunan,
  updateSantunan,
  verifySantunan,
  approveSantunan,
  disburseSantunan,
} from './lib/googleSheets/santunan.ts';
import {
  getAllCashTransactions,
  getCashTransactionById,
  getCashSummary,
  cancelCashTransaction,
} from './lib/googleSheets/bukuKas.ts';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  payExpense,
} from './lib/googleSheets/pengeluaran.ts';
import {
  getFinancialSummaryReport,
  getCashbookReport,
  getIuranReport,
  getSantunanReport,
  getPengeluaranReport,
  ReportFilterOptions,
} from './lib/googleSheets/reports.ts';
import { runFinancialReconciliation } from './lib/googleSheets/reconciliation.ts';
import * as XLSX from 'xlsx';
import { isGoogleSheetsConfigured } from './lib/googleSheets/client.ts';
import { Member, DashboardMetrics } from './src/types/index.ts';

export function createApp() {
  const app = express();

  // Normalize /api prefix if stripped by serverless rewrites
  app.use((req: Request, _res: Response, next: any) => {
    if (
      !req.url.startsWith('/api') &&
      (req.url.startsWith('/public') ||
        req.url.startsWith('/auth') ||
        req.url.startsWith('/members') ||
        req.url.startsWith('/families') ||
        req.url.startsWith('/contributions') ||
        req.url.startsWith('/arrears') ||
        req.url.startsWith('/death-reports') ||
        req.url.startsWith('/compensations') ||
        req.url.startsWith('/cash-transactions') ||
        req.url.startsWith('/expenses') ||
        req.url.startsWith('/users') ||
        req.url.startsWith('/settings') ||
        req.url.startsWith('/audit-logs') ||
        req.url.startsWith('/member/self-service') ||
        req.url.startsWith('/reports') ||
        req.url.startsWith('/health') ||
        req.url.startsWith('/status'))
    ) {
      req.url = '/api' + req.url;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use((err: any, _req: Request, res: Response, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, message: 'Format data JSON pada permintaan tidak valid.' });
    }
    next(err);
  });
  app.use(cookieParser());

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health & Status
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      googleSheetsConfigured: isGoogleSheetsConfigured(),
      sheetIdConfigured: Boolean(process.env.GOOGLE_SHEETS_ID),
      emailConfigured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      keyConfigured: Boolean(process.env.GOOGLE_PRIVATE_KEY),
    });
  });

  // ------------------------------------------
  // PUBLIC / UNPROTECTED ROUTES (NO AUTH NEEDED)
  // ------------------------------------------

  // Public Dashboard Aggregated Metrics (Safe, No Private PII)
  app.get('/api/public/dashboard', async (_req: Request, res: Response) => {
    try {
      const allMembers = await getAllMembers();
      const allFamilies = await getAllFamilies();
      const arrearsData = await calculateAllMembersArrears();
      const cashSummary = await getCashSummary();

      const totalKK = allMembers.length;
      const kkAktif = allMembers.filter((m) => m.Status === 'Aktif').length;
      const activeFamiliesCount = allFamilies.filter((f) => f.Status === 'Aktif').length;
      const keluargaTerlindungi = kkAktif + activeFamiliesCount;

      const rt06 = allMembers.filter((m) => m.RT === '06').length;
      const rt07 = allMembers.filter((m) => m.RT === '07').length;
      const rt10 = allMembers.filter((m) => m.RT === '10').length;

      const persentaseKepatuhan =
        arrearsData.summary.totalAnggotaAktif > 0
          ? Math.round(
              (arrearsData.summary.jumlahSudahBayarBulanIni / arrearsData.summary.totalAnggotaAktif) * 100
            )
          : 0;

      res.json({
        success: true,
        data: {
          totalKK,
          kkAktif,
          keluargaTerlindungi,
          pembayaranBulanIni: arrearsData.summary.jumlahSudahBayarBulanIni,
          belumBayarBulanIni: arrearsData.summary.jumlahBelumBayarBulanIni,
          persentaseKepatuhan,
          totalPemasukanBulanIni: cashSummary.pemasukanBulanIni,
          totalPengeluaranBulanIni: cashSummary.pengeluaranBulanIni,
          saldoKas: cashSummary.saldoKas,
          distribusiRT: {
            rt06,
            rt07,
            rt10,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching public dashboard:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat data dashboard publik.' });
    }
  });

  // Public KK & Family Registration Endpoint
  app.post('/api/public/daftar-kk', async (req: Request, res: Response) => {
    try {
      const { kepalaKeluarga, anggotaKeluarga } = req.body;

      if (!kepalaKeluarga) {
        res.status(400).json({ success: false, message: 'Data Kepala Keluarga wajib diisi.' });
        return;
      }

      const { No_KK, NIK, Nama, Tempat_Lahir, Tanggal_Lahir, Alamat, RT, No_HP } = kepalaKeluarga;

      if (!No_KK || !NIK || !Nama || !Tempat_Lahir || !Tanggal_Lahir || !Alamat || !RT || !No_HP) {
        res.status(400).json({
          success: false,
          message: 'Semua kolom data Kepala Keluarga wajib diisi lengkap.',
        });
        return;
      }

      if (NIK.trim().length !== 16) {
        res.status(400).json({ success: false, message: 'NIK Kepala Keluarga harus 16 digit angka.' });
        return;
      }

      if (No_KK.trim().length !== 16) {
        res.status(400).json({ success: false, message: 'Nomor KK harus 16 digit angka.' });
        return;
      }

      // Check duplicate NIK or No_KK
      const allMembers = await getAllMembers();
      if (allMembers.some((m) => m.NIK === NIK.trim())) {
        res.status(400).json({
          success: false,
          message: 'NIK Kepala Keluarga sudah terdaftar di SIJAKA. Silakan hubungi pengurus RT.',
        });
        return;
      }

      if (allMembers.some((m) => m.No_KK === No_KK.trim())) {
        res.status(400).json({
          success: false,
          message: 'Nomor Kartu Keluarga (KK) sudah terdaftar di SIJAKA. Satu KK dihitung 1 kepesertaan.',
        });
        return;
      }

      // Create primary member (Kepala Keluarga)
      const newMember = await createMember({
        No_KK: No_KK.trim(),
        NIK: NIK.trim(),
        Nama: Nama.trim(),
        Tempat_Lahir: Tempat_Lahir.trim(),
        Tanggal_Lahir,
        Alamat: Alamat.trim(),
        RT,
        No_HP: No_HP.trim(),
        Status: 'Aktif',
        Tanggal_Daftar: new Date().toISOString().split('T')[0],
        Keterangan: 'Pendaftaran Mandiri KK Warga (Publik)',
      });

      // Create Family members if provided
      let registeredFamilyCount = 0;
      if (Array.isArray(anggotaKeluarga) && anggotaKeluarga.length > 0) {
        for (const fam of anggotaKeluarga) {
          if (fam.Nama && fam.Nama.trim()) {
            await createFamily({
              ID_Anggota: newMember.ID_Anggota,
              NIK: fam.NIK ? fam.NIK.trim() : undefined,
              Nama: fam.Nama.trim(),
              Tempat_Lahir: fam.Tempat_Lahir ? fam.Tempat_Lahir.trim() : undefined,
              Tanggal_Lahir: fam.Tanggal_Lahir || undefined,
              Hubungan: fam.Hubungan || 'Anak',
              No_HP: fam.No_HP ? fam.No_HP.trim() : undefined,
              Status: 'Aktif',
              Calon_Ahli_Waris: fam.Calon_Ahli_Waris === 'Ya' ? 'Ya' : 'Tidak',
              Keterangan: 'Pendaftaran Bersama KK',
            });
            registeredFamilyCount++;
          }
        }
      }

      // Create Audit Log
      await createActivityLog({
        ID_User: 'PUBLIC_GUEST',
        Nama_User: 'Warga Mandiri',
        Aksi: 'CREATE',
        Modul: 'ANGGOTA',
        Record_ID: newMember.ID_Anggota,
        Deskripsi: `Pendaftaran Mandiri KK baru: ${newMember.Nama} (ID: ${newMember.ID_Anggota}) dengan ${registeredFamilyCount} anggota keluarga di RT ${newMember.RT}`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Pendaftaran KK berhasil dikirim! ID Peserta ${newMember.ID_Anggota} telah diterbitkan dengan total ${1 + registeredFamilyCount} jiwa terlindungi.`,
        data: {
          idAnggota: newMember.ID_Anggota,
          nama: newMember.Nama,
          totalJiwa: 1 + registeredFamilyCount,
        },
      });
    } catch (error: any) {
      console.error('Error public register KK:', error);
      res.status(500).json({ success: false, message: error.message || 'Gagal mendaftarkan KK.' });
    }
  });

  // ------------------------------------------
  // AUTH ROUTES & RATE LIMITING
  // ------------------------------------------
  const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOGIN_WINDOW_MS = 60 * 1000; // 1 minute

  function checkLoginRateLimit(key: string): { blocked: boolean; waitSeconds?: number } {
    const now = Date.now();
    const record = loginAttempts.get(key);
    if (!record || now - record.lastAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.set(key, { count: 1, lastAttempt: now });
      return { blocked: false };
    }
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      const waitSeconds = Math.ceil((LOGIN_WINDOW_MS - (now - record.lastAttempt)) / 1000);
      return { blocked: true, waitSeconds };
    }
    record.count += 1;
    record.lastAttempt = now;
    return { blocked: false };
  }

  function resetLoginRateLimit(key: string): void {
    loginAttempts.delete(key);
  }

  // Login (Supports Username or No_KK for Anggota)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `${clientIp}_${username || ''}`;

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
        return;
      }

      const rateCheck = checkLoginRateLimit(rateLimitKey);
      if (rateCheck.blocked) {
        res.status(429).json({
          success: false,
          message: `Terlalu banyak percobaan login gagal. Silakan tunggu ${rateCheck.waitSeconds} detik sebelum mencoba lagi.`,
        });
        return;
      }

      const user = await getUserByUsernameOrNoKK(username);
      if (!user) {
        res.status(401).json({ success: false, message: 'Username atau password salah.' });
        return;
      }

      if (user.Status !== 'Aktif') {
        res.status(403).json({ success: false, message: 'Akun Anda berstatus Nonaktif. Hubungi Admin.' });
        return;
      }

      const isValidPassword = await verifyUserPassword(user, password);
      if (!isValidPassword) {
        res.status(401).json({ success: false, message: 'Username atau password salah.' });
        return;
      }

      // Reset rate limit on successful authentication
      resetLoginRateLimit(rateLimitKey);

      // Update last login
      await updateLastLogin(user.ID_User);

      // Safe user without password
      const safeUser = toSafeUser(user);
      if (!safeUser.ID_Anggota) {
        safeUser.ID_Anggota = await resolveMemberIdForUser(safeUser);
      }
      const token = generateToken(safeUser);

      // Set cookie for browser
      res.cookie('sijaka_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Log Login Activity (NEVER log passwords)
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'LOGIN',
        Modul: 'AUTH',
        Record_ID: user.ID_User,
        Deskripsi: `User ${user.Username} (${user.Role}) berhasil login`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: 'Login berhasil.',
        token,
        user: safeUser,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Gagal terhubung ke database. Silakan coba lagi.' });
    }
  });

  // Change Password (All Authenticated Users)
  app.post('/api/auth/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { oldPassword, newPassword, confirmPassword } = req.body;

      if (!oldPassword || !newPassword || !confirmPassword) {
        res.status(400).json({ success: false, message: 'Semua kolom password wajib diisi.' });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ success: false, message: 'Konfirmasi password baru tidak cocok.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'Password baru minimal harus 6 karakter.' });
        return;
      }

      if (oldPassword === newPassword) {
        res.status(400).json({ success: false, message: 'Password baru tidak boleh sama dengan password lama.' });
        return;
      }

      await changeUserPassword(user.ID_User, oldPassword, newPassword);

      // Log password change activity (without credentials)
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CHANGE_PASSWORD',
        Modul: 'AUTH',
        Record_ID: user.ID_User,
        Deskripsi: `User ${user.Username} (${user.Role}) berhasil memperbarui kata sandi`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: 'Password Anda berhasil diperbarui. Silakan gunakan password baru pada sesi berikutnya.',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal mengubah password.' });
    }
  });

  // Logout
  app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user) {
        await createActivityLog({
          ID_User: req.user.ID_User,
          Nama_User: req.user.Nama,
          Aksi: 'LOGOUT',
          Modul: 'AUTH',
          Record_ID: req.user.ID_User,
          Deskripsi: `User ${req.user.Username} logout`,
          Status: 'SUCCESS',
        });
      }

      res.clearCookie('sijaka_token');
      res.json({ success: true, message: 'Logout berhasil.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Terjadi kesalahan saat logout.' });
    }
  });

  // Current User Session
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
    if (req.user && !req.user.ID_Anggota) {
      req.user.ID_Anggota = await resolveMemberIdForUser(req.user);
    }
    res.json({
      success: true,
      user: req.user,
    });
  });

  // ==========================================
  // MEMBER SELF-SERVICE ROUTES (PHASE 5)
  // Strict Anti-IDOR: Scoped exclusively to req.user.ID_Anggota
  // ==========================================

  // Get current member's full profile (KK, Families, Contributions, Arrears, Policy Info)
  app.get('/api/member/my-profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!user.ID_Anggota) {
        user.ID_Anggota = await resolveMemberIdForUser(user);
      }
      if (!user.ID_Anggota) {
        res.status(404).json({ success: false, message: 'Akun Anda belum ditautkan dengan data anggota KK.' });
        return;
      }

      const [member, families, contributions, arrears, settings] = await Promise.all([
        getMemberById(user.ID_Anggota),
        getFamiliesByMemberId(user.ID_Anggota),
        getContributionsByMemberId(user.ID_Anggota),
        calculateMemberArrears(user.ID_Anggota),
        getParsedSettings(),
      ]);

      if (!member) {
        res.status(404).json({ success: false, message: 'Data anggota KK tidak ditemukan.' });
        return;
      }

      // Sort contributions desc
      contributions.sort((a, b) => {
        if (b.Periode_Tahun !== a.Periode_Tahun) return b.Periode_Tahun - a.Periode_Tahun;
        return b.Periode_Bulan - a.Periode_Bulan;
      });

      const isInternalStaff = ['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user.Role);

      res.json({
        success: true,
        data: {
          member,
          families,
          contributions,
          arrears,
          policy: {
            namaLembaga: settings.NAMA_LEMBAGA,
            wilayah: settings.WILAYAH,
            iuranBulanan: settings.IURAN_BULANAN,
            // RBAC: ANGGOTA and PUBLIC do not receive nominal santunan.
            // ADMIN, BENDAHARA, PENGURUS receive it as patokan/acuan internal only.
            ...(isInternalStaff ? { patokanSantunan: settings.NOMINAL_SANTUNAN } : {}),
            masaTungguHari: settings.MASA_TUNGGU_HARI,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching member profile:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat profil data anggota.' });
    }
  });

  // Member Self-Service: Update KK Contact & Address
  app.put('/api/member/self-service/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!user.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Akun tidak terhubung dengan data anggota.' });
        return;
      }

      const { No_HP, Alamat, Keterangan } = req.body;
      const updates: Partial<Member> = {};

      if (No_HP !== undefined) updates.No_HP = String(No_HP).trim();
      if (Alamat !== undefined) updates.Alamat = String(Alamat).trim();
      if (Keterangan !== undefined) updates.Keterangan = String(Keterangan).trim();

      const updated = await updateMember(user.ID_Anggota, updates);

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE_PROFILE',
        Modul: 'ANGGOTA',
        Record_ID: user.ID_Anggota,
        Deskripsi: `Anggota ${user.Nama} (${user.ID_Anggota}) memperbarui kontak/alamat profil mandiri`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: 'Informasi kontak dan alamat KK berhasil diperbarui.',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating member self-service profile:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui profil KK.' });
    }
  });

  // Member Self-Service: Add Family Member to Own KK
  app.post('/api/member/self-service/keluarga', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!user.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Akun tidak terhubung dengan data anggota.' });
        return;
      }

      const { NIK, Nama, Tempat_Lahir, Tanggal_Lahir, Hubungan, No_HP, Calon_Ahli_Waris, Keterangan } = req.body;

      if (!Nama || !Hubungan) {
        res.status(400).json({ success: false, message: 'Nama anggota keluarga dan Hubungan wajib diisi.' });
        return;
      }

      const validRelations = ['Suami', 'Istri', 'Anak', 'Orang Tua', 'Lainnya'];
      if (!validRelations.includes(Hubungan)) {
        res.status(400).json({ success: false, message: `Hubungan tidak valid. Pilih dari: ${validRelations.join(', ')}` });
        return;
      }

      const newFamily = await createFamily({
        ID_Anggota: user.ID_Anggota,
        NIK: NIK || '',
        Nama,
        Tempat_Lahir: Tempat_Lahir || '',
        Tanggal_Lahir: Tanggal_Lahir || '',
        Hubungan,
        No_HP: No_HP || '',
        Status: 'Aktif',
        Calon_Ahli_Waris: Calon_Ahli_Waris || 'Tidak',
        Keterangan: Keterangan || 'Ditambahkan mandiri oleh anggota',
      });

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'SUBMIT_DATA_CHANGE',
        Modul: 'KELUARGA',
        Record_ID: newFamily.ID_Keluarga,
        Deskripsi: `Anggota ${user.Nama} menambahkan keluarga mandiri: ${newFamily.Nama} (${newFamily.Hubungan})`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Data keluarga ${newFamily.Nama} berhasil ditambahkan ke KK Anda.`,
        data: newFamily,
      });
    } catch (error: any) {
      console.error('Error in self-service add family:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal menambahkan data keluarga.' });
    }
  });

  // Member Self-Service: Update Family Member in Own KK
  app.put('/api/member/self-service/keluarga/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (!user.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Akun tidak terhubung dengan data anggota.' });
        return;
      }

      const family = await getFamilyById(id);
      if (!family) {
        res.status(404).json({ success: false, message: 'Data keluarga tidak ditemukan.' });
        return;
      }

      // Anti-IDOR: strictly enforce ownership
      if (family.ID_Anggota !== user.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk mengubah data ini.' });
        return;
      }

      const updates = req.body;
      const updated = await updateFamily(id, updates);

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'SUBMIT_DATA_CHANGE',
        Modul: 'KELUARGA',
        Record_ID: id,
        Deskripsi: `Anggota ${user.Nama} memperbarui data keluarga mandiri: ${updated.Nama}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data keluarga ${updated.Nama} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in self-service update family:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui data keluarga.' });
    }
  });

  // Member Self-Service: Soft Delete Family Member in Own KK
  app.delete('/api/member/self-service/keluarga/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (!user.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Akun tidak terhubung dengan data anggota.' });
        return;
      }

      const family = await getFamilyById(id);
      if (!family) {
        res.status(404).json({ success: false, message: 'Data keluarga tidak ditemukan.' });
        return;
      }

      // Anti-IDOR: strictly enforce ownership
      if (family.ID_Anggota !== user.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk menonaktifkan data ini.' });
        return;
      }

      const updated = await softDeleteFamily(id);

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'SUBMIT_DATA_CHANGE',
        Modul: 'KELUARGA',
        Record_ID: id,
        Deskripsi: `Anggota ${user.Nama} menonaktifkan data keluarga mandiri: ${updated.Nama}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data keluarga ${updated.Nama} berhasil dinonaktifkan.`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in self-service delete family:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal menonaktifkan data keluarga.' });
    }
  });

  // ------------------------------------------
  // DASHBOARD METRICS
  // ------------------------------------------
  app.get('/api/dashboard/metrics', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const allMembers = await getAllMembers();
      const allUsers = await getAllSafeUsers();

      // If user is ANGGOTA, filter to their context or provide personal stats
      const totalAnggota = allMembers.length;
      const anggotaAktif = allMembers.filter((m) => m.Status === 'Aktif').length;
      const anggotaMeninggal = allMembers.filter((m) => m.Status === 'Meninggal').length;
      const anggotaTidakAktif = allMembers.filter((m) => m.Status === 'Tidak Aktif').length;

      const rt06 = allMembers.filter((m) => m.RT === '06').length;
      const rt07 = allMembers.filter((m) => m.RT === '07').length;
      const rt10 = allMembers.filter((m) => m.RT === '10').length;

      const metrics: DashboardMetrics = {
        totalAnggota,
        anggotaAktif,
        anggotaMeninggal,
        anggotaTidakAktif,
        totalUser: allUsers.length,
        distribusiRT: {
          rt06,
          rt07,
          rt10,
        },
      };

      // RBAC Server-Side: Financial summary, Arrears, and internal policy settings
      // are ONLY included for ADMIN, BENDAHARA, and PENGURUS.
      // For ANGGOTA and VIEWER, these fields are NOT attached/sent in the API response.
      if (['ADMIN', 'BENDAHARA', 'PENGURUS'].includes(user.Role)) {
        const allFamilies = await getAllFamilies();
        const activeFamilies = allFamilies.filter((f) => f.Status === 'Aktif');
        const settings = await getParsedSettings();

        // Calculate heir candidates
        const membersWithHeirSet = new Set<string>();
        for (const f of activeFamilies) {
          if (f.Calon_Ahli_Waris === 'Ya') {
            membersWithHeirSet.add(f.ID_Anggota);
          }
        }

        // Calculate arrears summary
        const arrearsData = await calculateAllMembersArrears();
        const cashSummary = await getCashSummary();
        const deathReports = await getAllDeathReports();
        const santunanList = await getAllSantunan();

        metrics.totalKeluarga = activeFamilies.length;
        metrics.anggotaDenganAhliWaris = membersWithHeirSet.size;
        metrics.iuranBulanIni = arrearsData.summary.totalIuranTerkumpulBulanIni;
        metrics.jumlahSudahBayar = arrearsData.summary.jumlahSudahBayarBulanIni;
        metrics.jumlahBelumBayar = arrearsData.summary.jumlahBelumBayarBulanIni;
        metrics.totalTunggakanNominal = arrearsData.summary.totalNominalTunggakan;
        metrics.iuranBulanan = settings.IURAN_BULANAN;
        metrics.nominalSantunan = settings.NOMINAL_SANTUNAN;
        metrics.masaTungguHari = settings.MASA_TUNGGU_HARI;

        // Phase 3 Metrics
        metrics.saldoKas = cashSummary.saldoKas;
        metrics.totalKas = cashSummary.saldoKas;
        metrics.totalPemasukan = cashSummary.totalPemasukan;
        metrics.totalPengeluaran = cashSummary.totalPengeluaran;
        metrics.totalLaporanKematian = deathReports.length;
        metrics.laporanPending = deathReports.filter((r) => r.Status === 'DIAJUKAN' || r.Status === 'DIVERIFIKASI').length;
        metrics.santunanPending = santunanList.filter((s) => s.Status_Persetujuan === 'MENUNGGU' || (s.Status_Persetujuan === 'DISETUJUI' && !s.Tanggal_Pencairan)).length;
      }

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat data metrik dashboard.' });
    }
  });

  // ------------------------------------------
  // 01_ANGGOTA ROUTES
  // ------------------------------------------

  // Get Members list (with search, filter RT, filter status, pagination)
  app.get('/api/anggota', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let members = await getAllMembers();

      // RBAC: If role is ANGGOTA, only show own data
      if (user.Role === 'ANGGOTA' && user.ID_Anggota) {
        members = members.filter((m) => m.ID_Anggota === user.ID_Anggota);
      }

      // Query params
      const search = (req.query.search as string || '').toLowerCase().trim();
      const rt = (req.query.rt as string || '').trim();
      const status = (req.query.status as string || '').trim();
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);

      // Search filter (Nama, NIK, No_KK, Alamat)
      if (search) {
        members = members.filter(
          (m) =>
            m.Nama.toLowerCase().includes(search) ||
            m.NIK.toLowerCase().includes(search) ||
            m.No_KK.toLowerCase().includes(search) ||
            m.ID_Anggota.toLowerCase().includes(search) ||
            m.Alamat.toLowerCase().includes(search)
        );
      }

      // RT filter
      if (rt && rt !== 'ALL') {
        members = members.filter((m) => m.RT === rt);
      }

      // Status filter
      if (status && status !== 'ALL') {
        members = members.filter((m) => m.Status === status);
      }

      const total = members.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedMembers = members.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        data: paginatedMembers,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching members:', error);
      res.status(500).json({ success: false, message: 'Gagal terhubung ke database. Silakan coba lagi.' });
    }
  });

  // Get Member by ID
  app.get('/api/anggota/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // RBAC: If ANGGOTA, only allow viewing own ID
      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== id) {
        res.status(403).json({ success: false, message: 'Anda hanya berhak melihat data Anda sendiri.' });
        return;
      }

      const member = await getMemberById(id);
      if (!member) {
        res.status(404).json({ success: false, message: `Anggota dengan ID ${id} tidak ditemukan.` });
        return;
      }

      res.json({ success: true, data: member });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat data anggota.' });
    }
  });

  // Create Member (ADMIN, BENDAHARA, PENGURUS)
  app.post('/api/anggota', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { No_KK, NIK, Nama, Tempat_Lahir, Tanggal_Lahir, Alamat, RT, No_HP, Status, Tanggal_Daftar, Keterangan } = req.body;

      if (!No_KK || !NIK || !Nama || !Tempat_Lahir || !Tanggal_Lahir || !Alamat || !RT || !No_HP || !Status) {
        res.status(400).json({ success: false, message: 'Semua field wajib diisi lengkap.' });
        return;
      }

      if (!['06', '07', '10'].includes(RT)) {
        res.status(400).json({ success: false, message: 'RT harus 06, 07, atau 10.' });
        return;
      }

      if (!['Aktif', 'Tidak Aktif', 'Meninggal'].includes(Status)) {
        res.status(400).json({ success: false, message: 'Status tidak valid.' });
        return;
      }

      const newMember = await createMember({
        No_KK,
        NIK,
        Nama,
        Tempat_Lahir,
        Tanggal_Lahir,
        Alamat,
        RT,
        No_HP,
        Status,
        Tanggal_Daftar: Tanggal_Daftar || new Date().toISOString().split('T')[0],
        Keterangan,
      });

      // Log activity
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'ANGGOTA',
        Record_ID: newMember.ID_Anggota,
        Deskripsi: `Menambahkan anggota baru: ${newMember.Nama} (RT ${newMember.RT})`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Anggota ${newMember.Nama} (${newMember.ID_Anggota}) berhasil ditambahkan.`,
        data: newMember,
      });
    } catch (error: any) {
      console.error('Error creating member:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal menambahkan anggota.' });
    }
  });

  // Update Member (ADMIN, BENDAHARA, PENGURUS)
  app.put('/api/anggota/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updates = req.body;

      if (updates.RT && !['06', '07', '10'].includes(updates.RT)) {
        res.status(400).json({ success: false, message: 'RT harus 06, 07, atau 10.' });
        return;
      }

      if (updates.Status && !['Aktif', 'Tidak Aktif', 'Meninggal'].includes(updates.Status)) {
        res.status(400).json({ success: false, message: 'Status tidak valid.' });
        return;
      }

      const updated = await updateMember(id, updates);

      // Log activity
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'ANGGOTA',
        Record_ID: id,
        Deskripsi: `Memperbarui data anggota: ${updated.Nama} (${id})`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data anggota ${updated.Nama} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating member:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui anggota.' });
    }
  });

  // Delete Member (ADMIN only)
  app.delete('/api/anggota/:id', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const member = await getMemberById(id);
      if (!member) {
        res.status(404).json({ success: false, message: 'Anggota tidak ditemukan.' });
        return;
      }

      await deleteMember(id);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'DELETE',
        Modul: 'ANGGOTA',
        Record_ID: id,
        Deskripsi: `Menghapus data anggota: ${member.Nama} (${id})`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, message: `Anggota ${member.Nama} berhasil dihapus.` });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal menghapus data anggota.' });
    }
  });

  // ------------------------------------------
  // 02_KELUARGA ROUTES
  // ------------------------------------------

  // Get Families list (with RBAC, filters, search, and pagination)
  app.get('/api/keluarga', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let families = await getAllFamilies();
      const allMembers = await getAllMembers();
      const memberMap = new Map(allMembers.map((m) => [m.ID_Anggota, m]));

      // RBAC: If role is ANGGOTA, strictly only allow viewing their own family members
      if (user.Role === 'ANGGOTA') {
        if (!user.ID_Anggota) {
          res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } });
          return;
        }
        families = families.filter((f) => f.ID_Anggota === user.ID_Anggota);
      }

      // Query filters
      const search = (req.query.search as string || '').toLowerCase().trim();
      const idAnggota = (req.query.idAnggota as string || '').trim();
      const hubungan = (req.query.hubungan as string || '').trim();
      const status = (req.query.status as string || '').trim();
      const calonAhliWaris = (req.query.calonAhliWaris as string || '').trim();
      const rt = (req.query.rt as string || '').trim();
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);

      // Filter by ID_Anggota if provided
      if (idAnggota) {
        families = families.filter((f) => f.ID_Anggota === idAnggota);
      }

      // Filter by Hubungan
      if (hubungan && hubungan !== 'ALL') {
        families = families.filter((f) => f.Hubungan === hubungan);
      }

      // Filter by Status
      if (status && status !== 'ALL') {
        families = families.filter((f) => f.Status === status);
      }

      // Filter by Calon_Ahli_Waris
      if (calonAhliWaris && calonAhliWaris !== 'ALL') {
        families = families.filter((f) => f.Calon_Ahli_Waris === calonAhliWaris);
      }

      // Filter by RT of main member
      if (rt && rt !== 'ALL') {
        families = families.filter((f) => {
          const m = memberMap.get(f.ID_Anggota);
          return m && m.RT === rt;
        });
      }

      // Search filter (Nama, NIK, ID_Anggota, Nama Anggota Utama)
      if (search) {
        families = families.filter((f) => {
          const memberName = memberMap.get(f.ID_Anggota)?.Nama.toLowerCase() || '';
          return (
            f.Nama.toLowerCase().includes(search) ||
            (f.NIK && f.NIK.toLowerCase().includes(search)) ||
            f.ID_Anggota.toLowerCase().includes(search) ||
            f.ID_Keluarga.toLowerCase().includes(search) ||
            memberName.includes(search)
          );
        });
      }

      // Enrich with member information
      const enrichedFamilies = families.map((f) => {
        const m = memberMap.get(f.ID_Anggota);
        return {
          ...f,
          namaAnggota: m?.Nama || 'Tidak Diketahui',
          noKKAnggota: m?.No_KK || '',
          rtAnggota: m?.RT || '',
          statusAnggota: m?.Status || 'Aktif',
        };
      });

      const total = enrichedFamilies.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedFamilies = enrichedFamilies.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        data: paginatedFamilies,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching families:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat data keluarga.' });
    }
  });

  // Get Family by ID
  app.get('/api/keluarga/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const family = await getFamilyById(id);
      if (!family) {
        res.status(404).json({ success: false, message: `Data keluarga ${id} tidak ditemukan.` });
        return;
      }

      // RBAC: If ANGGOTA, cannot access other members' family records
      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== family.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk melihat data ini.' });
        return;
      }

      const member = await getMemberById(family.ID_Anggota);

      res.json({
        success: true,
        data: {
          family,
          member: member ? {
            ID_Anggota: member.ID_Anggota,
            Nama: member.Nama,
            No_KK: member.No_KK,
            RT: member.RT,
            Status: member.Status,
            Alamat: member.Alamat,
          } : null,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat data detail keluarga.' });
    }
  });

  // Create Family Member (ADMIN, BENDAHARA, PENGURUS)
  app.post('/api/keluarga', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { ID_Anggota, NIK, Nama, Tempat_Lahir, Tanggal_Lahir, Hubungan, No_HP, Status, Calon_Ahli_Waris, Keterangan } = req.body;

      if (!ID_Anggota || !Nama || !Hubungan) {
        res.status(400).json({ success: false, message: 'Anggota utama, Nama keluarga, dan Hubungan wajib diisi.' });
        return;
      }

      const validRelations = ['Suami', 'Istri', 'Anak', 'Orang Tua', 'Lainnya'];
      if (!validRelations.includes(Hubungan)) {
        res.status(400).json({ success: false, message: `Hubungan tidak valid. Pilih dari: ${validRelations.join(', ')}` });
        return;
      }

      const member = await getMemberById(ID_Anggota);
      if (!member) {
        res.status(400).json({ success: false, message: 'Anggota utama tidak ditemukan.' });
        return;
      }

      const newFamily = await createFamily({
        ID_Anggota,
        NIK,
        Nama,
        Tempat_Lahir,
        Tanggal_Lahir,
        Hubungan,
        No_HP,
        Status: Status || 'Aktif',
        Calon_Ahli_Waris: Calon_Ahli_Waris || 'Tidak',
        Keterangan,
      });

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'KELUARGA',
        Record_ID: newFamily.ID_Keluarga,
        Deskripsi: `Menambahkan keluarga: ${newFamily.Nama} (${newFamily.Hubungan}) untuk anggota ${member.Nama} (${member.ID_Anggota})`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Data keluarga ${newFamily.Nama} berhasil ditambahkan.`,
        data: newFamily,
      });
    } catch (error: any) {
      console.error('Error creating family:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal menambahkan data keluarga.' });
    }
  });

  // Update Family Member (ADMIN, BENDAHARA, PENGURUS)
  app.put('/api/keluarga/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updates = req.body;

      if (updates.Hubungan) {
        const validRelations = ['Suami', 'Istri', 'Anak', 'Orang Tua', 'Lainnya'];
        if (!validRelations.includes(updates.Hubungan)) {
          res.status(400).json({ success: false, message: 'Hubungan keluarga tidak valid.' });
          return;
        }
      }

      if (updates.Status && !['Aktif', 'Tidak Aktif'].includes(updates.Status)) {
        res.status(400).json({ success: false, message: 'Status keluarga harus Aktif atau Tidak Aktif.' });
        return;
      }

      if (updates.Calon_Ahli_Waris && !['Ya', 'Tidak'].includes(updates.Calon_Ahli_Waris)) {
        res.status(400).json({ success: false, message: 'Calon Ahli Waris harus Ya atau Tidak.' });
        return;
      }

      const updated = await updateFamily(id, updates);

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'KELUARGA',
        Record_ID: id,
        Deskripsi: `Memperbarui data keluarga: ${updated.Nama} (${id})`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data keluarga ${updated.Nama} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating family:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui data keluarga.' });
    }
  });

  // Soft Delete Family Member (Status = Tidak Aktif)
  app.delete('/api/keluarga/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const family = await getFamilyById(id);
      if (!family) {
        res.status(404).json({ success: false, message: 'Data keluarga tidak ditemukan.' });
        return;
      }

      const updated = await softDeleteFamily(id);

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'KELUARGA',
        Record_ID: id,
        Deskripsi: `Menonaktifkan data keluarga: ${updated.Nama} (${id})`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data keluarga ${updated.Nama} dinonaktifkan (histori tetap tersimpan).`,
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Gagal menonaktifkan data keluarga.' });
    }
  });

  // Get Families of a Member
  app.get('/api/anggota/:id/keluarga', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // RBAC: If ANGGOTA, only allow own ID
      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== id) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses melihat data keluarga ini.' });
        return;
      }

      const families = await getFamiliesByMemberId(id);
      res.json({ success: true, data: families });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat data keluarga anggota.' });
    }
  });

  // ------------------------------------------
  // 03_IURAN ROUTES
  // ------------------------------------------

  // Get Contributions list (with RBAC, filters, search, pagination)
  app.get('/api/iuran', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let contributions = await getAllContributions();
      const allMembers = await getAllMembers();
      const memberMap = new Map(allMembers.map((m) => [m.ID_Anggota, m]));

      // RBAC: If role is ANGGOTA, strictly only allow viewing their own contributions
      if (user.Role === 'ANGGOTA') {
        if (!user.ID_Anggota) {
          res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } });
          return;
        }
        contributions = contributions.filter((c) => c.ID_Anggota === user.ID_Anggota);
      }

      // Query params
      const search = (req.query.search as string || '').toLowerCase().trim();
      const idAnggota = (req.query.idAnggota as string || '').trim();
      const bulan = parseInt(req.query.bulan as string || '0', 10);
      const tahun = parseInt(req.query.tahun as string || '0', 10);
      const rt = (req.query.rt as string || '').trim();
      const status = (req.query.status as string || '').trim();
      const metode = (req.query.metode as string || '').trim();
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);

      // Filter by ID_Anggota
      if (idAnggota) {
        contributions = contributions.filter((c) => c.ID_Anggota === idAnggota);
      }

      // Filter by Bulan
      if (bulan > 0) {
        contributions = contributions.filter((c) => c.Periode_Bulan === bulan);
      }

      // Filter by Tahun
      if (tahun > 0) {
        contributions = contributions.filter((c) => c.Periode_Tahun === tahun);
      }

      // Filter by Status
      if (status && status !== 'ALL') {
        contributions = contributions.filter((c) => c.Status === status);
      }

      // Filter by Metode
      if (metode && metode !== 'ALL') {
        contributions = contributions.filter((c) => c.Metode === metode);
      }

      // Filter by RT of member
      if (rt && rt !== 'ALL') {
        contributions = contributions.filter((c) => {
          const m = memberMap.get(c.ID_Anggota);
          return m && m.RT === rt;
        });
      }

      // Search filter (Nama Anggota, ID_Anggota, ID_Iuran, Petugas)
      if (search) {
        contributions = contributions.filter((c) => {
          const memberName = memberMap.get(c.ID_Anggota)?.Nama.toLowerCase() || '';
          return (
            c.ID_Iuran.toLowerCase().includes(search) ||
            c.ID_Anggota.toLowerCase().includes(search) ||
            c.Petugas.toLowerCase().includes(search) ||
            memberName.includes(search)
          );
        });
      }

      // Enrich with Member information
      const enriched = contributions.map((c) => {
        const m = memberMap.get(c.ID_Anggota);
        return {
          ...c,
          namaAnggota: m?.Nama || 'Tidak Diketahui',
          rtAnggota: m?.RT || '',
          statusAnggota: m?.Status || 'Aktif',
        };
      });

      const total = enriched.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginated = enriched.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error fetching contributions:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat data iuran.' });
    }
  });

  // Check duplicate payment before submitting
  app.get('/api/iuran/check-duplicate', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const idAnggota = req.query.idAnggota as string;
      const bulan = parseInt(req.query.bulan as string, 10);
      const tahun = parseInt(req.query.tahun as string, 10);

      if (!idAnggota || isNaN(bulan) || isNaN(tahun)) {
        res.status(400).json({ success: false, message: 'Parameter idAnggota, bulan, dan tahun wajib diisi.' });
        return;
      }

      const isDuplicate = await checkPaymentExists(idAnggota, bulan, tahun);
      res.json({
        success: true,
        isDuplicate,
        message: isDuplicate
          ? 'Anggota ini sudah melakukan pembayaran iuran untuk periode tersebut.'
          : 'Periode iuran tersedia untuk pembayaran.',
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memeriksa status pembayaran.' });
    }
  });

  // Get Arrears Summary across all members (ADMIN, BENDAHARA, PENGURUS)
  app.get('/api/iuran/tunggakan', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (_req: AuthRequest, res: Response) => {
    try {
      const data = await calculateAllMembersArrears();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error calculating arrears:', error);
      res.status(500).json({ success: false, message: 'Gagal menghitung data tunggakan iuran.' });
    }
  });

  // Get Contribution by ID
  app.get('/api/iuran/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const contribution = await getContributionById(id);
      if (!contribution) {
        res.status(404).json({ success: false, message: `Transaksi iuran ${id} tidak ditemukan.` });
        return;
      }

      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== contribution.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk transaksi ini.' });
        return;
      }

      const member = await getMemberById(contribution.ID_Anggota);

      res.json({
        success: true,
        data: {
          ...contribution,
          namaAnggota: member?.Nama || 'Tidak Diketahui',
          rtAnggota: member?.RT || '',
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail transaksi iuran.' });
    }
  });

  // Create Contribution Payment (ADMIN, BENDAHARA, PENGURUS)
  app.post('/api/iuran', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { ID_Anggota, Periode_Bulan, Periode_Tahun, Tanggal_Bayar, Nominal, Metode, Keterangan } = req.body;

      if (!ID_Anggota || !Periode_Bulan || !Periode_Tahun) {
        res.status(400).json({ success: false, message: 'Anggota, Periode Bulan, dan Periode Tahun wajib diisi.' });
        return;
      }

      const member = await getMemberById(ID_Anggota);
      if (!member) {
        res.status(400).json({ success: false, message: 'Anggota tidak ditemukan.' });
        return;
      }

      // Record contribution with server-side duplicate prevention
      const newContribution = await createContribution({
        ID_Anggota,
        Periode_Bulan: Number(Periode_Bulan),
        Periode_Tahun: Number(Periode_Tahun),
        Tanggal_Bayar: Tanggal_Bayar || new Date().toISOString().split('T')[0],
        Nominal: Nominal ? Number(Nominal) : undefined,
        Metode: Metode || 'Tunai',
        Petugas: user.Nama,
        Keterangan,
      });

      // Audit Log
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'IURAN',
        Record_ID: newContribution.ID_Iuran,
        Deskripsi: `Pencatatan iuran: ${member.Nama} (${member.ID_Anggota}) Periode ${newContribution.Periode_Bulan}/${newContribution.Periode_Tahun} Rp${newContribution.Nominal.toLocaleString('id-ID')} (${newContribution.Metode})`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Pembayaran iuran ${member.Nama} periode ${newContribution.Periode_Bulan}/${newContribution.Periode_Tahun} berhasil dicatat.`,
        data: newContribution,
      });
    } catch (error: any) {
      console.error('Error creating contribution:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal mencatat pembayaran iuran.' });
    }
  });

  // Update Contribution Payment (ADMIN, BENDAHARA, PENGURUS)
  app.put('/api/iuran/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { Periode_Bulan, Periode_Tahun, Tanggal_Bayar, Nominal, Metode, Keterangan } = req.body;

      const existing = await getContributionById(id);
      if (!existing) {
        res.status(404).json({ success: false, message: `Transaksi iuran ${id} tidak ditemukan.` });
        return;
      }

      const member = await getMemberById(existing.ID_Anggota);

      const updated = await updateContribution(id, {
        Periode_Bulan: Periode_Bulan !== undefined ? Number(Periode_Bulan) : undefined,
        Periode_Tahun: Periode_Tahun !== undefined ? Number(Periode_Tahun) : undefined,
        Tanggal_Bayar,
        Nominal: Nominal !== undefined ? Number(Nominal) : undefined,
        Metode,
        Petugas: user.Nama,
        Keterangan,
      });

      // Audit Log 09_LOG_AKTIVITAS with action UPDATE and Record_ID = id
      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'IURAN',
        Record_ID: id,
        Deskripsi: `Koreksi iuran: ${member?.Nama || existing.ID_Anggota} Periode ${updated.Periode_Bulan}/${updated.Periode_Tahun} Rp${updated.Nominal.toLocaleString('id-ID')} (${updated.Metode}) oleh ${user.Nama}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data transaksi iuran ${id} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating contribution:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui data iuran.' });
    }
  });

  // Get Member Contributions history
  app.get('/api/anggota/:id/iuran', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== id) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses melihat riwayat iuran ini.' });
        return;
      }

      const contributions = await getContributionsByMemberId(id);
      res.json({ success: true, data: contributions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat riwayat iuran anggota.' });
    }
  });

  // Get Member Arrears Calculation
  app.get('/api/anggota/:id/tunggakan', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== id) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses melihat informasi tunggakan ini.' });
        return;
      }

      const arrears = await calculateMemberArrears(id);
      res.json({ success: true, data: arrears });
    } catch (error: any) {
      console.error('Error calculating member arrears:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal menghitung tunggakan anggota.' });
    }
  });

  // ------------------------------------------
  // 04_LAPORAN_KEMATIAN ROUTES
  // ------------------------------------------
  app.get('/api/kematian', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let reports = await getAllDeathReports();
      const allMembers = await getAllMembers();
      const allSantunan = await getAllSantunan();

      const memberMap = new Map(allMembers.map((m) => [m.ID_Anggota, m]));
      const santunanMap = new Map(allSantunan.map((s) => [s.ID_Laporan, s]));

      // RBAC filter
      if (user.Role === 'ANGGOTA' && user.ID_Anggota) {
        reports = reports.filter((r) => r.ID_Anggota === user.ID_Anggota);
      }

      // Query Filters
      const search = (req.query.search as string || '').toLowerCase().trim();
      const statusFilter = req.query.status as string;
      const rtFilter = req.query.rt as string;

      let enriched = reports.map((r) => {
        const m = memberMap.get(r.ID_Anggota);
        const s = santunanMap.get(r.ID_Laporan);
        return {
          ...r,
          namaAnggota: m?.Nama || 'Tidak Diketahui',
          noKK: m?.No_KK || '',
          nikAnggota: m?.NIK || '',
          rtAnggota: m?.RT || '',
          alamatAnggota: m?.Alamat || '',
          statusSantunan: s ? (s.Tanggal_Pencairan ? 'DICATAT_CAIR' : s.Status_Persetujuan) : 'BELUM_PENGAJUAN',
          idSantunan: s?.ID_Santunan,
        };
      });

      if (search) {
        enriched = enriched.filter(
          (r) =>
            r.ID_Laporan.toLowerCase().includes(search) ||
            r.namaAnggota.toLowerCase().includes(search) ||
            r.Pelapor.toLowerCase().includes(search) ||
            r.noKK.includes(search) ||
            r.nikAnggota.includes(search)
        );
      }

      if (statusFilter && statusFilter !== 'ALL') {
        enriched = enriched.filter((r) => r.Status === statusFilter);
      }

      if (rtFilter && rtFilter !== 'ALL') {
        enriched = enriched.filter((r) => r.rtAnggota === rtFilter);
      }

      // Sort by Tanggal_Lapor desc
      enriched.sort((a, b) => b.Tanggal_Lapor.localeCompare(a.Tanggal_Lapor));

      // Pagination
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const total = enriched.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = enriched.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paginated,
        pagination: { total, page, limit, totalPages },
      });
    } catch (error) {
      console.error('Error fetching death reports:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat daftar laporan kematian.' });
    }
  });

  app.get('/api/kematian/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const report = await getDeathReportById(id);

      if (!report) {
        res.status(404).json({ success: false, message: `Laporan kematian ${id} tidak ditemukan.` });
        return;
      }

      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== report.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses melihat laporan ini.' });
        return;
      }

      const member = await getMemberById(report.ID_Anggota);
      const families = await getFamiliesByMemberId(report.ID_Anggota);
      const santunan = await getSantunanByLaporanId(report.ID_Laporan);

      res.json({
        success: true,
        data: {
          ...report,
          member,
          families,
          santunan,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail laporan kematian.' });
    }
  });

  app.post('/api/kematian', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const {
        ID_Anggota,
        Tanggal_Lapor,
        Pelapor,
        Hubungan_Pelapor,
        Waktu_Kematian,
        Tempat_Kematian,
        Penyebab_Kematian,
        Dokumen_Pendukung,
        Keterangan,
      } = req.body;

      if (!ID_Anggota || !Pelapor || !Hubungan_Pelapor || !Waktu_Kematian || !Tempat_Kematian) {
        res.status(400).json({
          success: false,
          message: 'Kolom Anggota, Pelapor, Hubungan Pelapor, Waktu Kematian, dan Tempat Kematian wajib diisi.',
        });
        return;
      }

      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== ID_Anggota) {
        res.status(403).json({
          success: false,
          message: 'Anda hanya dapat mengajukan laporan kematian untuk Kartu Keluarga Anda sendiri.',
        });
        return;
      }

      const newReport = await createDeathReport({
        ID_Anggota,
        Tanggal_Lapor,
        Pelapor,
        Hubungan_Pelapor,
        Waktu_Kematian,
        Tempat_Kematian,
        Penyebab_Kematian,
        Dokumen_Pendukung,
        Keterangan,
      });

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'LAPORAN_KEMATIAN',
        Record_ID: newReport.ID_Laporan,
        Deskripsi: `Membuat laporan kematian baru untuk anggota ${ID_Anggota} (Pelapor: ${Pelapor})`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Laporan kematian ${newReport.ID_Laporan} berhasil dibuat.`,
        data: newReport,
      });
    } catch (error: any) {
      console.error('Error creating death report:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal membuat laporan kematian.' });
    }
  });

  app.put('/api/kematian/:id', requireAuth, requireRole(['ADMIN', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const updates = req.body;

      const updated = await updateDeathReport(id, updates);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'LAPORAN_KEMATIAN',
        Record_ID: id,
        Deskripsi: `Memperbarui data laporan kematian ${id}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Laporan kematian ${id} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui laporan kematian.' });
    }
  });

  app.post('/api/kematian/:id/verify', requireAuth, requireRole(['ADMIN', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, keterangan } = req.body;

      if (!status || !['DIVERIFIKASI', 'DITOLAK'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status verifikasi harus DIVERIFIKASI atau DITOLAK.' });
        return;
      }

      const verified = await verifyDeathReport(id, user.Nama, status, keterangan);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VERIFY',
        Modul: 'LAPORAN_KEMATIAN',
        Record_ID: id,
        Deskripsi: `Verifikasi laporan kematian ${id} -> ${status}${keterangan ? ` (${keterangan})` : ''}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Laporan kematian ${id} berhasil diverifikasi dengan status ${status}.`,
        data: verified,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memverifikasi laporan kematian.' });
    }
  });

  app.post('/api/kematian/:id/approve', requireAuth, requireRole(['ADMIN', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, keterangan } = req.body;

      if (!status || !['DISETUJUI', 'DITOLAK'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status persetujuan harus DISETUJUI atau DITOLAK.' });
        return;
      }

      const approved = await approveDeathReport(id, user.Nama, status, keterangan);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'APPROVE',
        Modul: 'LAPORAN_KEMATIAN',
        Record_ID: id,
        Deskripsi: `Persetujuan laporan kematian ${id} -> ${status}${keterangan ? ` (${keterangan})` : ''}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Laporan kematian ${id} berhasil diproses persetujuan dengan status ${status}.`,
        data: approved,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memproses persetujuan laporan kematian.' });
    }
  });

  // ------------------------------------------
  // 05_SANTUNAN ROUTES
  // ------------------------------------------
  app.get('/api/santunan', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let items = await getAllSantunan();
      const allMembers = await getAllMembers();
      const allReports = await getAllDeathReports();

      const memberMap = new Map(allMembers.map((m) => [m.ID_Anggota, m]));
      const reportMap = new Map(allReports.map((r) => [r.ID_Laporan, r]));

      if (user.Role === 'ANGGOTA' && user.ID_Anggota) {
        items = items.filter((s) => s.ID_Anggota === user.ID_Anggota);
      }

      const search = (req.query.search as string || '').toLowerCase().trim();
      const statusFilter = req.query.status as string;

      let enriched = items.map((s) => {
        const m = memberMap.get(s.ID_Anggota);
        const r = reportMap.get(s.ID_Laporan);
        return {
          ...s,
          namaAnggota: m?.Nama || 'Tidak Diketahui',
          noKK: m?.No_KK || '',
          rtAnggota: m?.RT || '',
          laporanTanggal: r?.Tanggal_Lapor || '',
          statusLaporan: r?.Status || '',
          isDisbursed: Boolean(s.Tanggal_Pencairan),
        };
      });

      if (search) {
        enriched = enriched.filter(
          (s) =>
            s.ID_Santunan.toLowerCase().includes(search) ||
            s.Nama_Penerima.toLowerCase().includes(search) ||
            s.namaAnggota.toLowerCase().includes(search) ||
            s.noKK.includes(search)
        );
      }

      if (statusFilter && statusFilter !== 'ALL') {
        if (statusFilter === 'CAIR') {
          enriched = enriched.filter((s) => Boolean(s.Tanggal_Pencairan));
        } else if (statusFilter === 'BELUM_CAIR') {
          enriched = enriched.filter((s) => !s.Tanggal_Pencairan);
        } else {
          enriched = enriched.filter(
            (s) => s.Status_Persetujuan === statusFilter || s.Status_Verifikasi === statusFilter
          );
        }
      }

      // Sort by Tanggal_Pengajuan desc
      enriched.sort((a, b) => b.Tanggal_Pengajuan.localeCompare(a.Tanggal_Pengajuan));

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const total = enriched.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = enriched.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paginated,
        pagination: { total, page, limit, totalPages },
      });
    } catch (error) {
      console.error('Error fetching santunan:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat data santunan.' });
    }
  });

  app.get('/api/santunan/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const santunan = await getSantunanById(id);

      if (!santunan) {
        res.status(404).json({ success: false, message: `Data santunan ${id} tidak ditemukan.` });
        return;
      }

      if (user.Role === 'ANGGOTA' && user.ID_Anggota !== santunan.ID_Anggota) {
        res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses melihat santunan ini.' });
        return;
      }

      const member = await getMemberById(santunan.ID_Anggota);
      const report = await getDeathReportById(santunan.ID_Laporan);
      const families = await getFamiliesByMemberId(santunan.ID_Anggota);

      res.json({
        success: true,
        data: {
          ...santunan,
          member,
          report,
          families,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail santunan.' });
    }
  });

  app.post('/api/santunan', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const {
        ID_Laporan,
        ID_Anggota,
        ID_AhliWaris,
        Nama_Penerima,
        Hubungan_Penerima,
        Nominal_Santunan,
        Tanggal_Pengajuan,
        Keterangan,
      } = req.body;

      if (!ID_Laporan || !ID_Anggota || !ID_AhliWaris || !Nama_Penerima || !Hubungan_Penerima) {
        res.status(400).json({
          success: false,
          message: 'Kolom Laporan Kematian, Anggota, Ahli Waris, dan Penerima wajib diisi lengkap.',
        });
        return;
      }

      const settings = await getParsedSettings();
      const nominal = Nominal_Santunan || settings.NOMINAL_SANTUNAN || 600000;

      const newSantunan = await createSantunan({
        ID_Laporan,
        ID_Anggota,
        ID_AhliWaris,
        Nama_Penerima,
        Hubungan_Penerima,
        Nominal_Santunan: nominal,
        Tanggal_Pengajuan,
        Keterangan,
      });

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'SANTUNAN',
        Record_ID: newSantunan.ID_Santunan,
        Deskripsi: `Membuat pengajuan santunan duka ${newSantunan.ID_Santunan} untuk ${Nama_Penerima}`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Pengajuan santunan ${newSantunan.ID_Santunan} berhasil dibuat.`,
        data: newSantunan,
      });
    } catch (error: any) {
      console.error('Error creating santunan:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal membuat pengajuan santunan.' });
    }
  });

  app.put('/api/santunan/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const updates = req.body;

      const updated = await updateSantunan(id, updates);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'SANTUNAN',
        Record_ID: id,
        Deskripsi: `Memperbarui pengajuan santunan ${id}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Data santunan ${id} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui santunan.' });
    }
  });

  app.post('/api/santunan/:id/verify', requireAuth, requireRole(['ADMIN', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, keterangan } = req.body;

      if (!status || !['TERVERIFIKASI', 'DITOLAK'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status verifikasi harus TERVERIFIKASI atau DITOLAK.' });
        return;
      }

      const verified = await verifySantunan(id, user.Nama, status, keterangan);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VERIFY',
        Modul: 'SANTUNAN',
        Record_ID: id,
        Deskripsi: `Verifikasi santunan ${id} -> ${status}${keterangan ? ` (${keterangan})` : ''}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Santunan ${id} berhasil diverifikasi dengan status ${status}.`,
        data: verified,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memverifikasi santunan.' });
    }
  });

  app.post('/api/santunan/:id/approve', requireAuth, requireRole(['ADMIN', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, keterangan } = req.body;

      if (!status || !['DISETUJUI', 'DITOLAK'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status persetujuan harus DISETUJUI atau DITOLAK.' });
        return;
      }

      const approved = await approveSantunan(id, user.Nama, status, keterangan);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'APPROVE',
        Modul: 'SANTUNAN',
        Record_ID: id,
        Deskripsi: `Persetujuan santunan ${id} -> ${status}${keterangan ? ` (${keterangan})` : ''}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Santunan ${id} berhasil diproses persetujuan dengan status ${status}.`,
        data: approved,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memproses persetujuan santunan.' });
    }
  });

  app.post('/api/santunan/:id/disburse', requireAuth, requireRole(['ADMIN', 'BENDAHARA']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { Tanggal_Pencairan, Metode_Pencairan, Nomor_Bukti, Bukti_Pencairan, Keterangan } = req.body;

      if (!Metode_Pencairan) {
        res.status(400).json({ success: false, message: 'Metode pencairan wajib dipilih (Tunai atau Transfer).' });
        return;
      }

      const result = await disburseSantunan(
        id,
        {
          Tanggal_Pencairan,
          Metode_Pencairan,
          Nomor_Bukti,
          Bukti_Pencairan,
          Keterangan,
        },
        user.ID_User,
        user.Nama
      );

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'DISBURSE',
        Modul: 'SANTUNAN',
        Record_ID: id,
        Deskripsi: `Pencairan santunan duka ${id} sebesar Rp ${(result.santunan.Nominal_Santunan || 0).toLocaleString('id-ID')} kepada ${result.santunan.Nama_Penerima} (Buku Kas: ${result.cashTransactionId})`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Pencairan santunan ${id} berhasil diproses dan otomatis tercatat di Buku Kas (${result.cashTransactionId}).`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error disbursing santunan:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memproses pencairan santunan.' });
    }
  });

  // ------------------------------------------
  // 06_BUKU_KAS ROUTES (Automated Ledger)
  // ------------------------------------------
  app.get('/api/buku-kas/summary', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (_req: AuthRequest, res: Response) => {
    try {
      const summary = await getCashSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error fetching cash summary:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat ringkasan buku kas.' });
    }
  });

  app.get('/api/buku-kas', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      let transactions = await getAllCashTransactions();

      const search = (req.query.search as string || '').toLowerCase().trim();
      const jenisFilter = req.query.jenis as string;
      const sumberFilter = req.query.sumber as string;
      const statusFilter = req.query.status as string;
      const dariTanggal = req.query.dariTanggal as string;
      const sampaiTanggal = req.query.sampaiTanggal as string;

      if (search) {
        transactions = transactions.filter(
          (t) =>
            t.ID_Transaksi.toLowerCase().includes(search) ||
            t.Uraian.toLowerCase().includes(search) ||
            t.ID_Sumber.toLowerCase().includes(search) ||
            (t.Nomor_Bukti && t.Nomor_Bukti.toLowerCase().includes(search)) ||
            (t.Petugas && t.Petugas.toLowerCase().includes(search))
        );
      }

      if (jenisFilter && jenisFilter !== 'ALL') {
        transactions = transactions.filter((t) => t.Jenis_Transaksi === jenisFilter);
      }

      if (sumberFilter && sumberFilter !== 'ALL') {
        transactions = transactions.filter((t) => t.Sumber_Transaksi === sumberFilter);
      }

      if (statusFilter && statusFilter !== 'ALL') {
        transactions = transactions.filter((t) => t.Status === statusFilter);
      }

      if (dariTanggal) {
        transactions = transactions.filter((t) => t.Tanggal >= dariTanggal);
      }

      if (sampaiTanggal) {
        transactions = transactions.filter((t) => t.Tanggal <= sampaiTanggal);
      }

      // Sort by Tanggal desc, ID_Transaksi desc
      transactions.sort((a, b) => {
        const cmp = b.Tanggal.localeCompare(a.Tanggal);
        return cmp !== 0 ? cmp : b.ID_Transaksi.localeCompare(a.ID_Transaksi);
      });

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 15;
      const total = transactions.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = transactions.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paginated,
        pagination: { total, page, limit, totalPages },
      });
    } catch (error) {
      console.error('Error fetching cash transactions:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat transaksi buku kas.' });
    }
  });

  app.get('/api/buku-kas/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const transaction = await getCashTransactionById(id);

      if (!transaction) {
        res.status(404).json({ success: false, message: `Transaksi ${id} tidak ditemukan.` });
        return;
      }

      res.json({ success: true, data: transaction });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail transaksi buku kas.' });
    }
  });

  app.post('/api/buku-kas/:id/cancel', requireAuth, requireRole(['ADMIN', 'BENDAHARA']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { alasan } = req.body;

      if (!alasan || !alasan.trim()) {
        res.status(400).json({ success: false, message: 'Alasan pembatalan transaksi wajib diisi.' });
        return;
      }

      const cancelled = await cancelCashTransaction(id, alasan.trim(), user.Nama);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CANCEL',
        Modul: 'BUKU_KAS',
        Record_ID: id,
        Deskripsi: `Membatalkan transaksi buku kas ${id}: ${alasan}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Transaksi ${id} berhasil dibatalkan dan saldo buku kas telah disesuaikan ulang.`,
        data: cancelled,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal membatalkan transaksi.' });
    }
  });

  // ------------------------------------------
  // 07_PENGELUARAN ROUTES
  // ------------------------------------------
  app.get('/api/pengeluaran', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      let expenses = await getAllExpenses();

      const search = (req.query.search as string || '').toLowerCase().trim();
      const kategoriFilter = req.query.kategori as string;
      const statusFilter = req.query.status as string;

      if (search) {
        expenses = expenses.filter(
          (e) =>
            e.ID_Pengeluaran.toLowerCase().includes(search) ||
            e.Uraian.toLowerCase().includes(search) ||
            (e.Nomor_Bukti && e.Nomor_Bukti.toLowerCase().includes(search)) ||
            (e.Diajukan_Oleh && e.Diajukan_Oleh.toLowerCase().includes(search))
        );
      }

      if (kategoriFilter && kategoriFilter !== 'ALL') {
        expenses = expenses.filter((e) => e.Kategori === kategoriFilter);
      }

      if (statusFilter && statusFilter !== 'ALL') {
        expenses = expenses.filter((e) => e.Status === statusFilter);
      }

      // Sort by Tanggal_Pengeluaran desc
      expenses.sort((a, b) => b.Tanggal_Pengeluaran.localeCompare(a.Tanggal_Pengeluaran));

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const total = expenses.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginated = expenses.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paginated,
        pagination: { total, page, limit, totalPages },
      });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ success: false, message: 'Gagal memuat data pengeluaran.' });
    }
  });

  app.get('/api/pengeluaran/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const expense = await getExpenseById(id);

      if (!expense) {
        res.status(404).json({ success: false, message: `Pengeluaran ${id} tidak ditemukan.` });
        return;
      }

      res.json({ success: true, data: expense });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail pengeluaran.' });
    }
  });

  app.post('/api/pengeluaran', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const {
        Tanggal_Pengeluaran,
        Kategori,
        Uraian,
        Nominal,
        Metode_Pembayaran,
        Nomor_Bukti,
        Bukti_Pengeluaran,
        Keterangan,
      } = req.body;

      if (!Kategori || !Uraian || !Nominal) {
        res.status(400).json({ success: false, message: 'Kategori, Uraian, dan Nominal pengeluaran wajib diisi.' });
        return;
      }

      const num = Number(Nominal);
      if (isNaN(num) || num <= 0) {
        res.status(400).json({ success: false, message: 'Nominal harus lebih besar dari 0.' });
        return;
      }

      const newExpense = await createExpense(
        {
          Tanggal_Pengeluaran,
          Kategori,
          Uraian,
          Nominal: num,
          Metode_Pembayaran,
          Nomor_Bukti,
          Bukti_Pengeluaran,
          Keterangan,
        },
        user.Nama
      );

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'PENGELUARAN',
        Record_ID: newExpense.ID_Pengeluaran,
        Deskripsi: `Mengajukan pengeluaran [${Kategori}] sebesar Rp ${num.toLocaleString('id-ID')}: ${Uraian}`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `Pengajuan pengeluaran ${newExpense.ID_Pengeluaran} berhasil dibuat.`,
        data: newExpense,
      });
    } catch (error: any) {
      console.error('Error creating expense:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal mengajukan pengeluaran.' });
    }
  });

  app.put('/api/pengeluaran/:id', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const updates = req.body;

      const updated = await updateExpense(id, updates);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'PENGELUARAN',
        Record_ID: id,
        Deskripsi: `Memperbarui pengajuan pengeluaran ${id}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Pengeluaran ${id} berhasil diperbarui.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui pengeluaran.' });
    }
  });

  app.post('/api/pengeluaran/:id/approve', requireAuth, requireRole(['ADMIN', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, keterangan } = req.body;

      if (!status || !['DISETUJUI', 'DITOLAK'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status persetujuan harus DISETUJUI atau DITOLAK.' });
        return;
      }

      const approved = await approveExpense(id, user.Nama, status, keterangan);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'APPROVE',
        Modul: 'PENGELUARAN',
        Record_ID: id,
        Deskripsi: `Persetujuan pengeluaran ${id} -> ${status}${keterangan ? ` (${keterangan})` : ''}`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Pengeluaran ${id} berhasil diproses persetujuan dengan status ${status}.`,
        data: approved,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memproses persetujuan pengeluaran.' });
    }
  });

  app.post('/api/pengeluaran/:id/pay', requireAuth, requireRole(['ADMIN', 'BENDAHARA']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { Tanggal_Pengeluaran, Metode_Pembayaran, Nomor_Bukti, Bukti_Pengeluaran, Keterangan } = req.body;

      const result = await payExpense(
        id,
        {
          Tanggal_Pengeluaran,
          Metode_Pembayaran,
          Nomor_Bukti,
          Bukti_Pengeluaran,
          Keterangan,
        },
        user.ID_User,
        user.Nama
      );

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'DISBURSE',
        Modul: 'PENGELUARAN',
        Record_ID: id,
        Deskripsi: `Pembayaran pengeluaran ${id} [${result.expense.Kategori}] sebesar Rp ${result.expense.Nominal.toLocaleString('id-ID')} (Buku Kas: ${result.cashTransactionId})`,
        Status: 'SUCCESS',
      });

      res.json({
        success: true,
        message: `Pengeluaran ${id} berhasil dibayarkan dan otomatis tercatat di Buku Kas (${result.cashTransactionId}).`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error paying expense:', error);
      res.status(400).json({ success: false, message: error.message || 'Gagal memproses pembayaran pengeluaran.' });
    }
  });

  // ------------------------------------------
  // 08_USERS ROUTES (ADMIN only for list & create)
  // ------------------------------------------
  app.get('/api/users', requireAuth, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response) => {
    try {
      const users = await getAllSafeUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat data user.' });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { Nama, Username, Password, Role, Status, ID_Anggota } = req.body;

      if (!Nama || !Username || !Password || !Role || !Status) {
        res.status(400).json({ success: false, message: 'Semua field user wajib diisi.' });
        return;
      }

      const newUser = await createUser({
        Nama,
        Username,
        Password,
        Role,
        Status,
        ID_Anggota,
      });

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'CREATE',
        Modul: 'USERS',
        Record_ID: newUser.ID_User,
        Deskripsi: `Membuat user baru: ${newUser.Username} (${newUser.Role})`,
        Status: 'SUCCESS',
      });

      res.status(201).json({
        success: true,
        message: `User ${newUser.Username} berhasil dibuat.`,
        data: newUser,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal membuat user.' });
    }
  });

  // ------------------------------------------
  // 09_LOG_AKTIVITAS ROUTES
  // ------------------------------------------
  app.get('/api/logs', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (_req: AuthRequest, res: Response) => {
    try {
      const logs = await getAllLogs();
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat log aktivitas.' });
    }
  });

  // ------------------------------------------
  // 10_SETTINGS ROUTES
  // ------------------------------------------
  app.get('/api/settings', requireAuth, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response) => {
    try {
      const settings = await getAllSettings();
      const parsed = await getParsedSettings();
      res.json({ success: true, data: settings, parsed });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memuat pengaturan.' });
    }
  });

  app.put('/api/settings/:key', requireAuth, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        res.status(400).json({ success: false, message: 'Nilai setting tidak boleh kosong.' });
        return;
      }

      const updated = await updateSetting(key, String(value));

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'UPDATE',
        Modul: 'SETTINGS',
        Record_ID: key,
        Deskripsi: `Memperbarui setting ${key} menjadi ${value}`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, message: `Setting ${key} berhasil diperbarui.`, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui setting.' });
    }
  });

  // ==========================================
  // PHASE 4: REPORTS & RECONCILIATION ROUTES
  // ==========================================

  // 1. Summary Report
  app.get('/api/reports/summary', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const filter: ReportFilterOptions = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        rt: req.query.rt as any,
        jenisTransaksi: req.query.jenisTransaksi as any,
      };

      const report = await getFinancialSummaryReport(filter);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VIEW_REPORT' as any,
        Modul: 'LAPORAN_KEUANGAN',
        Record_ID: 'SUMMARY',
        Deskripsi: `Melihat Ringkasan Laporan Keuangan (${report.periodInfo.label}, RT: ${filter.rt || 'Semua'})`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memuat ringkasan laporan keuangan.' });
    }
  });

  // 2. Cashbook Report
  app.get('/api/reports/cashbook', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const filter: ReportFilterOptions = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        rt: req.query.rt as any,
        jenisTransaksi: req.query.jenisTransaksi as any,
        status: req.query.status as string,
      };

      const report = await getCashbookReport(filter);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VIEW_REPORT' as any,
        Modul: 'BUKU_KAS',
        Record_ID: 'CASHBOOK_REPORT',
        Deskripsi: `Melihat Laporan Buku Kas (${report.periodInfo.label}, Total: ${report.summary.totalRecords} transaksi)`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memuat laporan buku kas.' });
    }
  });

  // 3. Iuran Report
  app.get('/api/reports/iuran', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const filter: ReportFilterOptions = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        rt: req.query.rt as any,
        status: req.query.status as string,
      };

      const report = await getIuranReport(filter);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VIEW_REPORT' as any,
        Modul: 'IURAN',
        Record_ID: 'IURAN_REPORT',
        Deskripsi: `Melihat Rekap Iuran (${report.periodInfo.label}, Kepatuhan: ${report.summary.persentaseKepatuhan}%)`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memuat rekap iuran.' });
    }
  });

  // 4. Santunan Report
  app.get('/api/reports/santunan', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const filter: ReportFilterOptions = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        rt: req.query.rt as any,
        status: req.query.status as string,
      };

      const report = await getSantunanReport(filter);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VIEW_REPORT' as any,
        Modul: 'SANTUNAN',
        Record_ID: 'SANTUNAN_REPORT',
        Deskripsi: `Melihat Rekap Santunan (${report.periodInfo.label}, Dicairkan: Rp ${(report.summary?.totalNominalDicairkan || 0).toLocaleString('id-ID')})`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memuat rekap santunan.' });
    }
  });

  // 5. Pengeluaran Report
  app.get('/api/reports/pengeluaran', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const filter: ReportFilterOptions = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        kategori: req.query.kategori as string,
        status: req.query.status as string,
      };

      const report = await getPengeluaranReport(filter);

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'VIEW_REPORT' as any,
        Modul: 'PENGELUARAN',
        Record_ID: 'PENGELUARAN_REPORT',
        Deskripsi: `Melihat Rekap Pengeluaran (${report.periodInfo.label}, Dibayarkan: Rp ${(report.summary?.totalNominalDibayar || 0).toLocaleString('id-ID')})`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Gagal memuat rekap pengeluaran.' });
    }
  });

  // 6. Reconciliation Engine
  app.get('/api/reports/reconciliation', requireAuth, requireRole(['ADMIN', 'BENDAHARA']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const report = await runFinancialReconciliation();

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'RUN_RECONCILIATION' as any,
        Modul: 'REKONSILIASI',
        Record_ID: 'RECONCILIATION_RUN',
        Deskripsi: `Menjalankan Rekonsiliasi Kas: Status ${report.reconciliationStatus} (Saldo: Rp ${(report.ledger?.saldoBukuKas || 0).toLocaleString('id-ID')}, Selisih: Rp ${(report.ledger?.selisih || 0).toLocaleString('id-ID')})`,
        Status: 'SUCCESS',
      });

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Gagal menjalankan rekonsiliasi kas.' });
    }
  });

  // 7. Export Excel Server Endpoint
  app.get('/api/reports/export/excel', requireAuth, requireRole(['ADMIN', 'BENDAHARA', 'PENGURUS']), async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const filter: ReportFilterOptions = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        rt: req.query.rt as any,
      };

      const [summaryReport, cashbookReport, iuranReport, santunanReport, pengeluaranReport, reconciliationReport] = await Promise.all([
        getFinancialSummaryReport(filter),
        getCashbookReport(filter),
        getIuranReport(filter),
        getSantunanReport(filter),
        getPengeluaranReport(filter),
        runFinancialReconciliation(),
      ]);

      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan
      const ringkasanData = [
        ['SIJAKA - Sistem Informasi Jaminan Kematian'],
        ['Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo'],
        ['LAPORAN REKAPITULASI KEUANGAN'],
        ['Periode:', summaryReport.periodInfo.label],
        ['Waktu Export:', new Date().toLocaleString('id-ID')],
        ['Petugas Export:', `${user.Nama} (${user.Role})`],
        [''],
        ['RINGKASAN UTAMA', 'NOMINAL (IDR)'],
        ['Total Kas Masuk (Periode)', summaryReport.totalKasMasukPeriode],
        ['Total Kas Keluar (Periode)', summaryReport.totalKasKeluarPeriode],
        ['Surplus / Defisit (Periode)', summaryReport.surplusDefisitPeriode],
        ['Saldo Kas Buku Kas (Aktif)', summaryReport.saldoKasSekarang],
        [''],
        ['RINCIAN PER MODUL', 'NOMINAL (IDR)', 'JUMLAH TRANSAKSI'],
        ['Total Iuran Terkumpul', summaryReport.totalIuranPeriode, summaryReport.jumlahTransaksi.iuran],
        ['Total Santunan Dicairkan', summaryReport.totalSantunanPeriode, summaryReport.jumlahTransaksi.santunan],
        ['Total Pengeluaran Operasional', summaryReport.totalPengeluaranPeriode, summaryReport.jumlahTransaksi.pengeluaran],
        [''],
        ['KEPATUHAN IURAN', 'NILAI'],
        ['Total KK Aktif', summaryReport.anggotaMetrics.kkAktif],
        ['KK Sudah Membayar', iuranReport.summary.kkSudahBayar],
        ['KK Belum Membayar', iuranReport.summary.kkBelumBayar],
        ['Persentase Kepatuhan (%)', `${iuranReport.summary.persentaseKepatuhan}%`],
      ];
      const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
      XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');

      // Sheet 2: Buku Kas
      const cashRows = [
        ['Tanggal', 'ID Transaksi', 'Jenis', 'Sumber', 'ID Sumber', 'Nama Anggota', 'RT', 'Uraian', 'Kas Masuk', 'Kas Keluar', 'Saldo', 'Status', 'Petugas'],
        ...cashbookReport.items.map((t) => [
          t.Tanggal,
          t.ID_Transaksi,
          t.Jenis_Transaksi,
          t.Sumber_Transaksi,
          t.ID_Sumber,
          t.namaAnggota || '-',
          t.rtAnggota || '-',
          t.Uraian,
          t.Kas_Masuk || 0,
          t.Kas_Keluar || 0,
          t.Saldo,
          t.Status,
          t.Petugas,
        ]),
        ['', '', '', '', '', '', 'TOTAL', '', cashbookReport.summary.totalMasuk, cashbookReport.summary.totalKeluar, '', '', ''],
      ];
      const wsCash = XLSX.utils.aoa_to_sheet(cashRows);
      XLSX.utils.book_append_sheet(wb, wsCash, 'Buku Kas');

      // Sheet 3: Iuran
      const iuranRows = [
        ['ID Iuran', 'ID Anggota', 'Nama Kepala Keluarga', 'RT', 'Periode Bulan', 'Periode Tahun', 'Tanggal Bayar', 'Metode', 'Nominal', 'Status', 'Petugas'],
        ...iuranReport.items.map((i) => [
          i.ID_Iuran,
          i.ID_Anggota,
          i.namaKepalaKeluarga,
          i.rt,
          i.Periode_Bulan,
          i.Periode_Tahun,
          i.Tanggal_Bayar,
          i.Metode,
          i.Nominal,
          i.Status,
          i.Petugas,
        ]),
        ['', '', '', '', '', '', '', 'TOTAL', iuranReport.summary.totalNominal, '', ''],
      ];
      const wsIuran = XLSX.utils.aoa_to_sheet(iuranRows);
      XLSX.utils.book_append_sheet(wb, wsIuran, 'Iuran');

      // Sheet 4: Santunan
      const santunanRows = [
        ['ID Santunan', 'ID Laporan', 'Nama Almarhum', 'RT', 'Nama Penerima', 'Hubungan', 'Nominal', 'Status Verifikasi', 'Status Persetujuan', 'Tanggal Pengajuan', 'Tanggal Pencairan', 'Metode', 'No Bukti'],
        ...santunanReport.items.map((s) => [
          s.ID_Santunan,
          s.ID_Laporan,
          s.namaAnggota || '-',
          s.rt || '-',
          s.Nama_Penerima,
          s.Hubungan_Penerima,
          s.Nominal_Santunan,
          s.Status_Verifikasi,
          s.Status_Persetujuan,
          s.Tanggal_Pengajuan,
          s.Tanggal_Pencairan || '-',
          s.Metode_Pencairan || '-',
          s.Nomor_Bukti || '-',
        ]),
        ['', '', '', '', '', 'TOTAL DICAIRKAN', santunanReport.summary.totalNominalDicairkan, '', '', '', '', '', ''],
      ];
      const wsSantunan = XLSX.utils.aoa_to_sheet(santunanRows);
      XLSX.utils.book_append_sheet(wb, wsSantunan, 'Santunan');

      // Sheet 5: Pengeluaran
      const expenseRows = [
        ['ID Pengeluaran', 'Tanggal', 'Kategori', 'Uraian', 'Nominal', 'Status', 'Metode', 'No Bukti', 'Keterangan'],
        ...pengeluaranReport.items.map((e) => [
          e.ID_Pengeluaran,
          e.Tanggal_Pengeluaran,
          e.Kategori,
          e.Uraian,
          e.Nominal,
          e.Status,
          e.Metode_Pembayaran,
          e.Nomor_Bukti || '-',
          e.Keterangan || '-',
        ]),
        ['', '', '', 'TOTAL DIBAYARKAN', pengeluaranReport.summary.totalNominalDibayar, '', '', '', ''],
      ];
      const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Pengeluaran');

      // Sheet 6: Rekonsiliasi
      const reconRows = [
        ['REKONSILIASI KEUANGAN BUKU KAS SIJAKA'],
        ['Status Rekonsiliasi:', reconciliationReport.reconciliationStatus],
        ['Total Kas Masuk Valid:', reconciliationReport.ledger.totalKasMasuk],
        ['Total Kas Keluar Valid:', reconciliationReport.ledger.totalKasKeluar],
        ['Formula:', 'Kas Masuk - Kas Keluar'],
        ['Expected Saldo:', reconciliationReport.ledger.expectedSaldo],
        ['Saldo Riil Buku Kas:', reconciliationReport.ledger.saldoBukuKas],
        ['Selisih:', reconciliationReport.ledger.selisih],
        [''],
        ['INTEGRITY CHECKS', 'STATUS', 'DETAIL'],
        ...reconciliationReport.integrityChecks.checks.map((c) => [
          `${c.checkNumber}. ${c.title}`,
          c.status,
          c.details,
        ]),
      ];
      const wsRecon = XLSX.utils.aoa_to_sheet(reconRows);
      XLSX.utils.book_append_sheet(wb, wsRecon, 'Rekonsiliasi');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      await createActivityLog({
        ID_User: user.ID_User,
        Nama_User: user.Nama,
        Aksi: 'EXPORT_EXCEL' as any,
        Modul: 'LAPORAN_EXPORT',
        Record_ID: 'EXCEL_EXPORT',
        Deskripsi: `Mengekspor Laporan Lengkap SIJAKA ke Excel (${summaryReport.periodInfo.label})`,
        Status: 'SUCCESS',
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="SIJAKA_Laporan_${summaryReport.periodInfo.startDate}_${summaryReport.periodInfo.endDate}.xlsx"`);
      res.send(buf);
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      res.status(500).json({ success: false, message: error.message || 'Gagal mengekspor laporan ke Excel.' });
    }
  });

  // ------------------------------------------
  // API 404 & GLOBAL ERROR HANDLER
  // ------------------------------------------
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
  });

  app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Terjadi kesalahan pada server saat memproses permintaan API.',
    });
  });

  return app;
}

export const app = createApp();

async function startServer() {
  const PORT = 3000;

  // ------------------------------------------
  // VITE MIDDLEWARE & STATIC SERVING
  // ------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIJAKA Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
