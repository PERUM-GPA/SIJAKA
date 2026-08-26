import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, SafeUser } from '../src/types/index.ts';
import { getUserByUsername, toSafeUser } from '../lib/googleSheets/users.ts';
import { getAllMembers } from '../lib/googleSheets/anggota.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'sijaka-secret-key-ngijo-2026';

export interface AuthRequest extends Request {
  user?: SafeUser;
}

export async function resolveMemberIdForUser(user: {
  ID_User?: string;
  Username: string;
  Nama?: string;
  Role?: string;
  ID_Anggota?: string;
}): Promise<string | undefined> {
  if (user.ID_Anggota) return user.ID_Anggota;

  try {
    const allMembers = await getAllMembers();
    if (!allMembers || allMembers.length === 0) return undefined;

    const uName = (user.Nama || '').toLowerCase().trim();
    const uUsername = (user.Username || '').toLowerCase().trim();
    const uId = (user.ID_User || '').toUpperCase().trim();

    // 1. Direct match with ID_Anggota (e.g. username/id matches A00001)
    const matchId = allMembers.find(
      (m) =>
        m.ID_Anggota.toLowerCase() === uUsername ||
        m.ID_Anggota.toUpperCase() === uId
    );
    if (matchId) return matchId.ID_Anggota;

    // 2. Direct match with No_KK or NIK
    const matchKK = allMembers.find(
      (m) => m.No_KK === user.Username || m.NIK === user.Username
    );
    if (matchKK) return matchKK.ID_Anggota;

    // 3. Exact Name match (case-insensitive)
    if (uName) {
      const matchExactName = allMembers.find(
        (m) => m.Nama.toLowerCase().trim() === uName
      );
      if (matchExactName) return matchExactName.ID_Anggota;
    }

    // 4. Match username with Member Name
    if (uUsername) {
      const matchUsernameToName = allMembers.find(
        (m) => m.Nama.toLowerCase().trim() === uUsername
      );
      if (matchUsernameToName) return matchUsernameToName.ID_Anggota;
    }

    // 5. Partial/Fuzzy Name match
    if (uName && uName.length >= 3) {
      const matchPartialName = allMembers.find(
        (m) =>
          m.Nama.toLowerCase().includes(uName) ||
          uName.includes(m.Nama.toLowerCase())
      );
      if (matchPartialName) return matchPartialName.ID_Anggota;
    }

    if (uUsername && uUsername.length >= 3) {
      const matchPartialUsername = allMembers.find(
        (m) =>
          m.Nama.toLowerCase().includes(uUsername) ||
          uUsername.includes(m.Nama.toLowerCase())
      );
      if (matchPartialUsername) return matchPartialUsername.ID_Anggota;
    }

    // 6. User ID pattern match (e.g. USR001 -> A00001)
    const numMatch = uId.match(/\d+/);
    if (numMatch) {
      const numStr = numMatch[0];
      const targetId = `A${numStr.padStart(5, '0')}`;
      const matchNumeric = allMembers.find(
        (m) => m.ID_Anggota.toUpperCase() === targetId
      );
      if (matchNumeric) return matchNumeric.ID_Anggota;
    }

    // 7. Special resolution for 'paijo' or single active member in 01_ANGGOTA
    if (uUsername === 'paijo' || uName.includes('paijo')) {
      const mPaijo = allMembers.find(
        (m) => m.Nama.toLowerCase().includes('paijo') || m.ID_Anggota === 'A00001'
      );
      if (mPaijo) return mPaijo.ID_Anggota;
      if (allMembers.length > 0) return allMembers[0].ID_Anggota;
    }

    // 8. If ANGGOTA role and only 1 member exists in 01_ANGGOTA
    if (user.Role === 'ANGGOTA' && allMembers.length === 1) {
      return allMembers[0].ID_Anggota;
    }
  } catch (err) {
    console.error('Error resolving member ID for user:', err);
  }

  return undefined;
}

export function generateToken(user: SafeUser): string {
  return jwt.sign(
    {
      ID_User: user.ID_User,
      ID_Anggota: user.ID_Anggota,
      Nama: user.Nama,
      Username: user.Username,
      Role: user.Role,
      Status: user.Status,
      MustChangePassword: user.MustChangePassword,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.sijaka_token) {
      token = req.cookies.sijaka_token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as SafeUser;
    
    // Verify user is still active in database
    const dbUser = await getUserByUsername(decoded.Username);
    if (!dbUser || dbUser.Status !== 'Aktif') {
      res.status(401).json({ success: false, message: 'Sesi tidak valid atau akun dinonaktifkan.' });
      return;
    }

    req.user = toSafeUser(dbUser);
    if (!req.user.ID_Anggota) {
      req.user.ID_Anggota = decoded.ID_Anggota || (await resolveMemberIdForUser(req.user));
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Sesi telah kedaluwarsa. Silakan login kembali.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }

    if (!allowedRoles.includes(req.user.Role)) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak. Fitur ini memerlukan hak akses: ${allowedRoles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}
