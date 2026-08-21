import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, generateToken, requireAuth, requireRole } from './server/auth.ts';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from './lib/googleSheets/anggota.ts';
import {
  getUserByUsername,
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
  checkPaymentExists,
} from './lib/googleSheets/iuran.ts';
import {
  calculateMemberArrears,
  calculateAllMembersArrears,
} from './lib/services/arrears.ts';
import { getAllLogs, createActivityLog } from './lib/googleSheets/logs.ts';
import { getAllSettings, updateSetting, getParsedSettings } from './lib/googleSheets/settings.ts';
import { isGoogleSheetsConfigured } from './lib/googleSheets/client.ts';
import { Member, DashboardMetrics } from './src/types/index.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
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
  // AUTH ROUTES
  // ------------------------------------------

  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
        return;
      }

      const user = await getUserByUsername(username);
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

      // Update last login
      await updateLastLogin(user.ID_User);

      // Safe user without password
      const safeUser = toSafeUser(user);
      const token = generateToken(safeUser);

      // Set cookie for browser
      res.cookie('sijaka_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Log Login Activity
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
  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      user: req.user,
    });
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

        metrics.totalKeluarga = activeFamilies.length;
        metrics.anggotaDenganAhliWaris = membersWithHeirSet.size;
        metrics.iuranBulanIni = arrearsData.summary.totalIuranTerkumpulBulanIni;
        metrics.jumlahSudahBayar = arrearsData.summary.jumlahSudahBayarBulanIni;
        metrics.jumlahBelumBayar = arrearsData.summary.jumlahBelumBayarBulanIni;
        metrics.totalTunggakanNominal = arrearsData.summary.totalNominalTunggakan;
        metrics.iuranBulanan = settings.IURAN_BULANAN;
        metrics.nominalSantunan = settings.NOMINAL_SANTUNAN;
        metrics.masaTungguHari = settings.MASA_TUNGGU_HARI;
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

startServer();
