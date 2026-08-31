import { Member, RTEnum, MemberStatus } from '../../src/types/index.ts';
import { getSheetsClient, isGoogleSheetsConfigured, SHEET_NAMES, HEADERS, memoryStore } from './client.ts';

function parseIdString(unformattedVal: any, formattedVal: any): string {
  if (unformattedVal !== undefined && unformattedVal !== null && unformattedVal !== '') {
    if (typeof unformattedVal === 'number') {
      return BigInt(Math.round(unformattedVal)).toString();
    }
    const str = String(unformattedVal).trim();
    return str.startsWith("'") ? str.substring(1) : str;
  }
  if (formattedVal !== undefined && formattedVal !== null && formattedVal !== '') {
    const str = String(formattedVal).trim();
    return str.startsWith("'") ? str.substring(1) : str;
  }
  return '';
}

function toTextCell(val?: string): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (!trimmed) return '';
  return trimmed.startsWith("'") ? trimmed : `'${trimmed}`;
}

export async function getAllMembers(): Promise<Member[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getMembers();
  }

  try {
    const [formattedRes, unformattedRes] = await Promise.all([
      client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.ANGGOTA}!A2:M`,
        valueRenderOption: 'FORMATTED_VALUE',
      }),
      client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.ANGGOTA}!A2:M`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      }),
    ]);

    const formattedRows = formattedRes.data.values || [];
    const unformattedRows = unformattedRes.data.values || [];

    if (formattedRows.length === 0 && unformattedRows.length === 0) {
      return [];
    }

    const maxRows = Math.max(formattedRows.length, unformattedRows.length);
    const members: Member[] = [];

    for (let i = 0; i < maxRows; i++) {
      const rowF = formattedRows[i] || [];
      const rowU = unformattedRows[i] || [];

      const id = String(rowF[0] || rowU[0] || '').trim();
      if (!id) continue;

      const noKk = parseIdString(rowU[1], rowF[1]);
      const nik = parseIdString(rowU[2], rowF[2]);

      members.push({
        ID_Anggota: id,
        No_KK: noKk,
        NIK: nik,
        Nama: String(rowF[3] || rowU[3] || ''),
        Tempat_Lahir: String(rowF[4] || rowU[4] || ''),
        Tanggal_Lahir: String(rowF[5] || rowU[5] || ''),
        Alamat: String(rowF[6] || rowU[6] || ''),
        RT: (String(rowF[7] || rowU[7] || '06') as RTEnum),
        No_HP: String(rowF[8] || rowU[8] || ''),
        Status: (String(rowF[9] || rowU[9] || 'Aktif') as MemberStatus),
        Tanggal_Daftar: String(rowF[10] || rowU[10] || ''),
        Tanggal_Nonaktif: (rowF[11] || rowU[11]) ? String(rowF[11] || rowU[11]) : undefined,
        Keterangan: (rowF[12] || rowU[12]) ? String(rowF[12] || rowU[12]) : undefined,
      });
    }

    // Keep memory in sync
    memoryStore.setMembers(members);
    return members;
  } catch (error: any) {
    console.error('Error fetching members from Google Sheets:', error);
    if (isGoogleSheetsConfigured()) {
      throw new Error(`Gagal membaca data dari Google Sheets (01_ANGGOTA): ${error?.message || error}`);
    }
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
  if (isGoogleSheetsConfigured() && !client) {
    throw new Error('Gagal menghubungkan ke Google Sheets API. Periksa kredensial Service Account.');
  }

  if (client) {
    try {
      const rowData = [
        newMember.ID_Anggota,
        toTextCell(newMember.No_KK),
        toTextCell(newMember.NIK),
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
    } catch (error: any) {
      console.error('Error appending member to Google Sheets:', error);
      throw new Error(`Gagal menyimpan data Anggota ke Google Sheets (01_ANGGOTA): ${error?.message || error}`);
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

  const client = getSheetsClient();
  if (isGoogleSheetsConfigured() && !client) {
    throw new Error('Gagal menghubungkan ke Google Sheets API. Periksa kredensial Service Account.');
  }

  if (client) {
    try {
      // Find row index in sheet (+2 because row 1 is header, 1-indexed)
      const rowIndex = index + 2;
      const rowData = [
        updatedMember.ID_Anggota,
        toTextCell(updatedMember.No_KK),
        toTextCell(updatedMember.NIK),
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
    } catch (error: any) {
      console.error('Error updating member in Google Sheets:', error);
      throw new Error(`Gagal memperbarui data Anggota di Google Sheets (01_ANGGOTA): ${error?.message || error}`);
    }
  }

  members[index] = updatedMember;
  memoryStore.setMembers([...members]);

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
