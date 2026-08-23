import bcrypt from 'bcryptjs';
import { User, SafeUser, UserRole, UserStatus } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, memoryStore } from './client.ts';
import { getMemberById } from './anggota.ts';

export function toSafeUser(user: User): SafeUser {
  return {
    ID_User: user.ID_User,
    ID_Anggota: user.ID_Anggota,
    Nama: user.Nama,
    Username: user.Username,
    Role: user.Role,
    Status: user.Status,
    Tanggal_Dibuat: user.Tanggal_Dibuat,
    Terakhir_Login: user.Terakhir_Login,
    MustChangePassword: user.MustChangePassword ?? (user.Role === 'ANGGOTA'),
  };
}

export async function getAllUsers(): Promise<User[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getUsers();
  }

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.USERS}!A2:J`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return memoryStore.getUsers();
    }

    const users: User[] = rows.map((row) => {
      const role = (row[5] as UserRole) || 'ANGGOTA';
      const mustChangeCol = row[9];
      const mustChange = mustChangeCol !== undefined && mustChangeCol !== ''
        ? String(mustChangeCol).toLowerCase() === 'true'
        : (role === 'ANGGOTA');

      return {
        ID_User: row[0] || '',
        ID_Anggota: row[1] || undefined,
        Nama: row[2] || '',
        Username: row[3] || '',
        Password: row[4] || '',
        Role: role,
        Status: (row[6] as UserStatus) || 'Aktif',
        Tanggal_Dibuat: row[7] || '',
        Terakhir_Login: row[8] || undefined,
        MustChangePassword: mustChange,
      };
    }).filter((u) => u.ID_User !== '');

    memoryStore.setUsers(users);
    return users;
  } catch (error) {
    console.error('Error fetching users from Google Sheets, using memory fallback:', error);
    return memoryStore.getUsers();
  }
}

export async function getAllSafeUsers(): Promise<SafeUser[]> {
  const users = await getAllUsers();
  return users.map(toSafeUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find((u) => u.ID_User === id) || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find((u) => u.Username.toLowerCase() === username.toLowerCase()) || null;
}

export async function generateNextUserId(): Promise<string> {
  const users = await getAllUsers();
  if (users.length === 0) {
    return 'USR001';
  }

  let maxNum = 0;
  for (const u of users) {
    if (u.ID_User.startsWith('USR')) {
      const numPart = parseInt(u.ID_User.substring(3), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `USR${nextNum.toString().padStart(3, '0')}`;
}

export async function createUser(data: {
  Nama: string;
  Username: string;
  Password: string;
  Role: UserRole;
  Status: UserStatus;
  ID_Anggota?: string;
  MustChangePassword?: boolean;
}): Promise<SafeUser> {
  const users = await getAllUsers();

  // Validate Username uniqueness
  const existingWithUsername = users.find(
    (u) => u.Username.toLowerCase() === data.Username.toLowerCase()
  );
  if (existingWithUsername) {
    throw new Error(`Username '${data.Username}' sudah digunakan`);
  }

  // Validate relation: For Role === 'ANGGOTA', ID_Anggota is mandatory
  if (data.Role === 'ANGGOTA') {
    if (!data.ID_Anggota) {
      throw new Error('User dengan role ANGGOTA wajib ditautkan dengan data ID Anggota');
    }
    const member = await getMemberById(data.ID_Anggota);
    if (!member) {
      throw new Error(`ID Anggota '${data.ID_Anggota}' tidak ditemukan di database 01_ANGGOTA`);
    }
  }

  const newId = await generateNextUserId();
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(data.Password, salt);
  const mustChange = data.MustChangePassword !== undefined ? data.MustChangePassword : (data.Role === 'ANGGOTA');

  const newUser: User = {
    ID_User: newId,
    ID_Anggota: data.ID_Anggota,
    Nama: data.Nama,
    Username: data.Username,
    Password: hashedPassword,
    Role: data.Role,
    Status: data.Status,
    Tanggal_Dibuat: new Date().toISOString().split('T')[0],
    MustChangePassword: mustChange,
  };

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newUser.ID_User,
        newUser.ID_Anggota || '',
        newUser.Nama,
        newUser.Username,
        newUser.Password,
        newUser.Role,
        newUser.Status,
        newUser.Tanggal_Dibuat,
        newUser.Terakhir_Login || '',
        mustChange ? 'true' : 'false',
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.USERS}!A:J`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      console.error('Error appending user to Google Sheets:', error);
    }
  }

  const updatedUsers = [...users, newUser];
  memoryStore.setUsers(updatedUsers);

  return toSafeUser(newUser);
}

export async function updateLastLogin(id: string): Promise<void> {
  const users = await getAllUsers();
  const index = users.findIndex((u) => u.ID_User === id);
  if (index === -1) return;

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  users[index].Terakhir_Login = now;
  memoryStore.setUsers([...users]);

  const client = getSheetsClient();
  if (client) {
    try {
      const rowIndex = index + 2;
      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.USERS}!I${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[now]],
        },
      });
    } catch (err) {
      console.error('Error updating last login in Google Sheets:', err);
    }
  }
}

export async function changeUserPassword(
  userId: string,
  oldPlainPassword: string,
  newPlainPassword: string
): Promise<{ success: boolean; message: string }> {
  const users = await getAllUsers();
  const index = users.findIndex((u) => u.ID_User === userId);
  if (index === -1) {
    throw new Error('User tidak ditemukan.');
  }

  const user = users[index];

  // Verify old password
  if (!user.Password || !bcrypt.compareSync(oldPlainPassword, user.Password)) {
    throw new Error('Password lama tidak sesuai.');
  }

  if (newPlainPassword.length < 6) {
    throw new Error('Password baru minimal harus 6 karakter.');
  }

  if (oldPlainPassword === newPlainPassword) {
    throw new Error('Password baru tidak boleh sama dengan password lama.');
  }

  const salt = bcrypt.genSaltSync(10);
  const newHashed = bcrypt.hashSync(newPlainPassword, salt);

  user.Password = newHashed;
  user.MustChangePassword = false;
  users[index] = user;
  memoryStore.setUsers([...users]);

  const client = getSheetsClient();
  if (client) {
    try {
      const rowIndex = index + 2;
      // Update Password (col E) and MustChangePassword (col J)
      await Promise.all([
        client.sheets.spreadsheets.values.update({
          spreadsheetId: client.spreadsheetId,
          range: `${SHEET_NAMES.USERS}!E${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[newHashed]],
          },
        }),
        client.sheets.spreadsheets.values.update({
          spreadsheetId: client.spreadsheetId,
          range: `${SHEET_NAMES.USERS}!J${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['false']],
          },
        }),
      ]);
    } catch (err) {
      console.error('Error updating password in Google Sheets:', err);
    }
  }

  return { success: true, message: 'Password berhasil diperbarui.' };
}

export async function getUserByUsernameOrNoKK(identifier: string): Promise<User | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // 1. Direct username check
  const directUser = await getUserByUsername(trimmed);
  if (directUser) return directUser;

  // 2. Lookup by No_KK or ID_Anggota from 01_ANGGOTA
  const { getAllMembers } = await import('./anggota.ts');
  const allMembers = await getAllMembers();
  const matchedMember = allMembers.find(
    (m) => m.No_KK === trimmed || m.ID_Anggota.toLowerCase() === trimmed.toLowerCase()
  );

  if (matchedMember) {
    const allUsers = await getAllUsers();
    const existingUser = allUsers.find((u) => u.ID_Anggota === matchedMember.ID_Anggota);
    if (existingUser) {
      return existingUser;
    }

    // Auto-create user account for registered member
    const defaultPass = matchedMember.Tanggal_Lahir || 'anggota123';
    const safe = await createUser({
      Nama: matchedMember.Nama,
      Username: matchedMember.No_KK,
      Password: defaultPass,
      Role: 'ANGGOTA',
      Status: matchedMember.Status === 'Aktif' ? 'Aktif' : 'Tidak Aktif',
      ID_Anggota: matchedMember.ID_Anggota,
      MustChangePassword: true,
    });

    const newlyCreated = await getUserById(safe.ID_User);
    return newlyCreated;
  }

  return null;
}

export async function verifyUserPassword(user: User, plainPassword: string): Promise<boolean> {
  if (!user.Password) return false;
  return bcrypt.compareSync(plainPassword, user.Password);
}
