import { Family, FamilyRelation, FamilyStatus, HeirCandidate } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, memoryStore } from './client.ts';
import { getMemberById } from './anggota.ts';

export async function getAllFamilies(): Promise<Family[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getFamilies();
  }

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.KELUARGA}!A2:K`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return memoryStore.getFamilies();
    }

    const families: Family[] = rows.map((row) => ({
      ID_Keluarga: row[0] || '',
      ID_Anggota: row[1] || '',
      NIK: row[2] || undefined,
      Nama: row[3] || '',
      Tempat_Lahir: row[4] || undefined,
      Tanggal_Lahir: row[5] || undefined,
      Hubungan: (row[6] as FamilyRelation) || 'Lainnya',
      No_HP: row[7] || undefined,
      Status: (row[8] as FamilyStatus) || 'Aktif',
      Calon_Ahli_Waris: (row[9] as HeirCandidate) || 'Tidak',
      Keterangan: row[10] || undefined,
    })).filter((f) => f.ID_Keluarga !== '');

    memoryStore.setFamilies(families);
    return families;
  } catch (error) {
    console.error('Error fetching families from Google Sheets, using memory fallback:', error);
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
  if (client) {
    try {
      const rowData = [
        newFamily.ID_Keluarga,
        newFamily.ID_Anggota,
        newFamily.NIK || '',
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
    } catch (error) {
      console.error('Error appending family to Google Sheets:', error);
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
    ID_Keluarga: current.ID_Keluarga, // immutable
    ID_Anggota: current.ID_Anggota,   // immutable
  };

  families[index] = updatedFamily;
  memoryStore.setFamilies([...families]);

  const client = getSheetsClient();
  if (client) {
    try {
      const rowIndex = index + 2;
      const rowData = [
        updatedFamily.ID_Keluarga,
        updatedFamily.ID_Anggota,
        updatedFamily.NIK || '',
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
    } catch (error) {
      console.error('Error updating family in Google Sheets:', error);
    }
  }

  return updatedFamily;
}

export async function softDeleteFamily(id: string): Promise<Family> {
  return updateFamily(id, { Status: 'Tidak Aktif' });
}
