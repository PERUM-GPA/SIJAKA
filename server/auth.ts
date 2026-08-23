import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, SafeUser } from '../src/types/index.ts';
import { getUserByUsername, toSafeUser } from '../lib/googleSheets/users.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'sijaka-secret-key-ngijo-2026';

export interface AuthRequest extends Request {
  user?: SafeUser;
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
