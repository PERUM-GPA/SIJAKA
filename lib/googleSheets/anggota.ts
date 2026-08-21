import { Member, RTEnum, MemberStatus } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, HEADERS, memoryStore } from './client.ts';

export async function getAllMembers(): Promise<Member[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getMembers();
  }

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.ANGGOTA}!A2:M`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return memoryStore.getMembers();
    }

    const members: Member[] = rows.map((row) => ({
      ID_Anggota: row[0] || '',
      No_KK: row[1] || '',
      NIK: row[2] || '',
      Nama: row[3] || '',
      Tempat_Lahir: row[4] || '',
      Tanggal_Lahir: row[5] || '',
      Alamat: row[6] || '',
      RT: (row[7] as RTEnum) || '06',
      No_HP: row[8] || '',
      Status: (row[9] as MemberStatus) || 'Aktif',
      Tanggal_Daftar: row[10] || '',
      Tanggal_Nonaktif: row[11] || undefined,
      Keterangan: row[12] || undefined,
    })).filter((m) => m.ID_Anggota !== '');

    // Keep memory in sync
    memoryStore.setMembers(members);
    return members;
  } catch (error) {
    console.error('Error fetching members from Google Sheets, using memory fallback:', error);
    return memoryStore.getMembers();
  }
}

export async function getMemberById(id: string): Promise<Member | null> {
  const members = await getAllMembers();
  return members.find((m) => m.ID_Anggota === id) || null;
}

export async function getMemberByNik(nik: string): Promise<Member | null> {
  const members = await getAllMembers();
  return members.find((m) => m.NIK === nik) || null;
}

export async function generateNextMemberId(): Promise<string> {
  const members = await getAllMembers();
  if (members.length === 0) {
    return 'A00001';
  }

  let maxNum = 0;
  for (const m of members) {
    if (m.ID_Anggota.startsWith('A')) {
      const numPart = parseInt(m.ID_Anggota.substring(1), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `A${nextNum.toString().padStart(5, '0')}`;
}

export async function createMember(data: Omit<Member, 'ID_Anggota'> & { ID_Anggota?: string }): Promise<Member> {
  const members = await getAllMembers();

  // Validate NIK uniqueness
  const existingWithNik = members.find((m) => m.NIK === data.NIK);
  if (existingWithNik) {
    throw new Error(`NIK ${data.NIK} sudah terdaftar atas nama ${existingWithNik.Nama}`);
  }

  const newId = data.ID_Anggota || (await generateNextMemberId());

  // Validate ID uniqueness
  const existingWithId = members.find((m) => m.ID_Anggota === newId);
  if (existingWithId) {
    throw new Error(`ID Anggota ${newId} sudah digunakan`);
  }

  const newMember: Member = {
    ID_Anggota: newId,
    No_KK: data.No_KK,
    NIK: data.NIK,
    Nama: data.Nama,
    Tempat_Lahir: data.Tempat_Lahir,
    Tanggal_Lahir: data.Tanggal_Lahir,
    Alamat: data.Alamat,
    RT: data.RT,
    No_HP: data.No_HP,
    Status: data.Status,
    Tanggal_Daftar: data.Tanggal_Daftar || new Date().toISOString().split('T')[0],
    Tanggal_Nonaktif: data.Tanggal_Nonaktif,
    Keterangan: data.Keterangan,
  };

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newMember.ID_Anggota,
        newMember.No_KK,
        newMember.NIK,
        newMember.Nama,
        newMember.Tempat_Lahir,
        newMember.Tanggal_Lahir,
        newMember.Alamat,
        newMember.RT,
        newMember.No_HP,
        newMember.Status,
        newMember.Tanggal_Daftar,
        newMember.Tanggal_Nonaktif || '',
        newMember.Keterangan || '',
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.ANGGOTA}!A:M`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      console.error('Error appending member to Google Sheets:', error);
      // We will still save to memory store so user actions aren't lost
    }
  }

  const updatedMembers = [newMember, ...members];
  memoryStore.setMembers(updatedMembers);

  return newMember;
}

export async function updateMember(id: string, updates: Partial<Omit<Member, 'ID_Anggota'>>): Promise<Member> {
  const members = await getAllMembers();
  const index = members.findIndex((m) => m.ID_Anggota === id);

  if (index === -1) {
    throw new Error(`Anggota dengan ID ${id} tidak ditemukan`);
  }

  const current = members[index];

  // If NIK is being changed, verify uniqueness
  if (updates.NIK && updates.NIK !== current.NIK) {
    const existingWithNik = members.find((m) => m.NIK === updates.NIK && m.ID_Anggota !== id);
    if (existingWithNik) {
      throw new Error(`NIK ${updates.NIK} sudah terdaftar atas nama ${existingWithNik.Nama}`);
    }
  }

  const updatedMember: Member = {
    ...current,
    ...updates,
    ID_Anggota: id, // Ensure ID remains immutable
  };

  members[index] = updatedMember;
  memoryStore.setMembers([...members]);

  const client = getSheetsClient();
  if (client) {
    try {
      // Find row index in sheet (+2 because row 1 is header, 1-indexed)
      const rowIndex = index + 2;
      const rowData = [
        updatedMember.ID_Anggota,
        updatedMember.No_KK,
        updatedMember.NIK,
        updatedMember.Nama,
        updatedMember.Tempat_Lahir,
        updatedMember.Tanggal_Lahir,
        updatedMember.Alamat,
        updatedMember.RT,
        updatedMember.No_HP,
        updatedMember.Status,
        updatedMember.Tanggal_Daftar,
        updatedMember.Tanggal_Nonaktif || '',
        updatedMember.Keterangan || '',
      ];

      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.ANGGOTA}!A${rowIndex}:M${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      console.error('Error updating member in Google Sheets:', error);
    }
  }

  return updatedMember;
}

export async function deleteMember(id: string): Promise<boolean> {
  const members = await getAllMembers();
  const filtered = members.filter((m) => m.ID_Anggota !== id);
  if (filtered.length === members.length) {
    return false;
  }

  memoryStore.setMembers(filtered);
  // Optional: If connected to sheets, full sheet rewrite or status update
  return true;
}
