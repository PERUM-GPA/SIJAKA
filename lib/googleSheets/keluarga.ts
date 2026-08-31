import { Family, FamilyRelation, FamilyStatus, HeirCandidate } from '../../src/types/index.ts';
import { getSheetsClient, isGoogleSheetsConfigured, SHEET_NAMES, memoryStore } from './client.ts';
import { getMemberById } from './anggota.ts';

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

export async function getAllFamilies(): Promise<Family[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getFamilies();
  }

  try {
    const [formattedRes, unformattedRes] = await Promise.all([
      client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.KELUARGA}!A2:K`,
        valueRenderOption: 'FORMATTED_VALUE',
      }),
      client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.KELUARGA}!A2:K`,
        valueRenderOption: 'UNFORMATTED_VALUE',
      }),
    ]);

    const formattedRows = formattedRes.data.values || [];
    const unformattedRows = unformattedRes.data.values || [];

    if (formattedRows.length === 0 && unformattedRows.length === 0) {
      return [];
    }

    const maxRows = Math.max(formattedRows.length, unformattedRows.length);
    const families: Family[] = [];

    for (let i = 0; i < maxRows; i++) {
      const rowF = formattedRows[i] || [];
      const rowU = unformattedRows[i] || [];

      const id = String(rowF[0] || rowU[0] || '').trim();
      if (!id) continue;

      const memberId = String(rowF[1] || rowU[1] || '').trim();
      const rawNik = parseIdString(rowU[2], rowF[2]);

      families.push({
        ID_Keluarga: id,
        ID_Anggota: memberId,
        NIK: rawNik ? rawNik : undefined,
        Nama: String(rowF[3] || rowU[3] || ''),
        Tempat_Lahir: (rowF[4] || rowU[4]) ? String(rowF[4] || rowU[4]) : undefined,
        Tanggal_Lahir: (rowF[5] || rowU[5]) ? String(rowF[5] || rowU[5]) : undefined,
        Hubungan: (String(rowF[6] || rowU[6] || 'Lainnya') as FamilyRelation),
        No_HP: (rowF[7] || rowU[7]) ? String(rowF[7] || rowU[7]) : undefined,
        Status: (String(rowF[8] || rowU[8] || 'Aktif') as FamilyStatus),
        Calon_Ahli_Waris: (String(rowF[9] || rowU[9] || 'Tidak') as HeirCandidate),
        Keterangan: (rowF[10] || rowU[10]) ? String(rowF[10] || rowU[10]) : undefined,
      });
    }

    memoryStore.setFamilies(families);
    return families;
  } catch (error: any) {
    console.error('Error fetching families from Google Sheets:', error);
    if (isGoogleSheetsConfigured()) {
      throw new Error(`Gagal membaca data dari Google Sheets (02_KELUARGA): ${error?.message || error}`);
    }
    return memoryStore.getFamilies();
  }
}

export async function getFamilyById(id: string): Promise<Family | null> {
  const families = await getAllFamilies();
  return families.find((f) => f.ID_Keluarga === id) || null;
}

export async function getFamiliesByMemberId(memberId: string): Promise<Family[]> {
  const families = await getAllFamilies();
  return families.filter((f) => f.ID_Anggota === memberId);
}

export async function generateNextFamilyId(): Promise<string> {
  const families = await getAllFamilies();
  if (families.length === 0) {
    return 'K00001';
  }

  let maxNum = 0;
  for (const f of families) {
    if (f.ID_Keluarga.startsWith('K')) {
      const numPart = parseInt(f.ID_Keluarga.substring(1), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `K${nextNum.toString().padStart(5, '0')}`;
}

export async function createFamily(data: {
  ID_Anggota: string;
  NIK?: string;
  Nama: string;
  Tempat_Lahir?: string;
  Tanggal_Lahir?: string;
  Hubungan: FamilyRelation;
  No_HP?: string;
  Status?: FamilyStatus;
  Calon_Ahli_Waris?: HeirCandidate;
  Keterangan?: string;
}): Promise<Family> {
  // Validate ID_Anggota exists in 01_ANGGOTA
  const member = await getMemberById(data.ID_Anggota);
  if (!member) {
    throw new Error('Anggota utama tidak ditemukan.');
  }

  if (!data.Nama || data.Nama.trim() === '') {
    throw new Error('Nama keluarga wajib diisi.');
  }

  const newId = await generateNextFamilyId();
  const newFamily: Family = {
    ID_Keluarga: newId,
    ID_Anggota: data.ID_Anggota,
    NIK: data.NIK?.trim() || undefined,
    Nama: data.Nama.trim(),
    Tempat_Lahir: data.Tempat_Lahir?.trim() || undefined,
    Tanggal_Lahir: data.Tanggal_Lahir?.trim() || undefined,
    Hubungan: data.Hubungan || 'Lainnya',
    No_HP: data.No_HP?.trim() || undefined,
    Status: data.Status || 'Aktif',
    Calon_Ahli_Waris: data.Calon_Ahli_Waris || 'Tidak',
    Keterangan: data.Keterangan?.trim() || undefined,
  };

  const client = getSheetsClient();
  if (isGoogleSheetsConfigured() && !client) {
    throw new Error('Gagal menghubungkan ke Google Sheets API. Periksa kredensial Service Account.');
  }

  if (client) {
    try {
      const rowData = [
        newFamily.ID_Keluarga,
        newFamily.ID_Anggota,
        toTextCell(newFamily.NIK),
        newFamily.Nama,
        newFamily.Tempat_Lahir || '',
        newFamily.Tanggal_Lahir || '',
        newFamily.Hubungan,
        newFamily.No_HP || '',
        newFamily.Status,
        newFamily.Calon_Ahli_Waris,
        newFamily.Keterangan || '',
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.KELUARGA}!A:K`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error: any) {
      console.error('Error appending family to Google Sheets:', error);
      throw new Error(`Gagal menyimpan data Keluarga ke Google Sheets (02_KELUARGA): ${error?.message || error}`);
    }
  }

  const families = await getAllFamilies();
  const updatedFamilies = [newFamily, ...families];
  memoryStore.setFamilies(updatedFamilies);

  return newFamily;
}

export async function updateFamily(
  id: string,
  updates: Partial<Omit<Family, 'ID_Keluarga' | 'ID_Anggota'>>
): Promise<Family> {
  const families = await getAllFamilies();
  const index = families.findIndex((f) => f.ID_Keluarga === id);

  if (index === -1) {
    throw new Error(`Data keluarga dengan ID ${id} tidak ditemukan`);
  }

  const current = families[index];
  const updatedFamily: Family = {
    ...current,
    ...updates,
    ID_Keluarga: id,
    ID_Anggota: current.ID_Anggota,
  };

  const client = getSheetsClient();
  if (isGoogleSheetsConfigured() && !client) {
    throw new Error('Gagal menghubungkan ke Google Sheets API. Periksa kredensial Service Account.');
  }

  if (client) {
    try {
      const rowIndex = index + 2;
      const rowData = [
        updatedFamily.ID_Keluarga,
        updatedFamily.ID_Anggota,
        toTextCell(updatedFamily.NIK),
        updatedFamily.Nama,
        updatedFamily.Tempat_Lahir || '',
        updatedFamily.Tanggal_Lahir || '',
        updatedFamily.Hubungan,
        updatedFamily.No_HP || '',
        updatedFamily.Status,
        updatedFamily.Calon_Ahli_Waris,
        updatedFamily.Keterangan || '',
      ];

      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.KELUARGA}!A${rowIndex}:K${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error: any) {
      console.error('Error updating family in Google Sheets:', error);
      throw new Error(`Gagal memperbarui data Keluarga di Google Sheets (02_KELUARGA): ${error?.message || error}`);
    }
  }

  families[index] = updatedFamily;
  memoryStore.setFamilies([...families]);

  return updatedFamily;
}

export async function softDeleteFamily(id: string): Promise<Family> {
  return updateFamily(id, { Status: 'Tidak Aktif' });
}
