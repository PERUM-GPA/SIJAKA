import { Setting, AppSettings } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, memoryStore, cachedRead, invalidateCache } from './client.ts';

export async function getAllSettings(): Promise<Setting[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getSettings();
  }

  return cachedRead(
    'settings',
    async () => {
      const response = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.SETTINGS}!A2:D`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return memoryStore.getSettings();
      }

      const settings: Setting[] = rows.map((row) => ({
        Key: row[0] || '',
        Value: row[1] || '',
        Keterangan: row[2] || '',
        Tipe: (row[3] as 'string' | 'number' | 'boolean' | 'array') || 'string',
      })).filter((s) => s.Key !== '');

      memoryStore.setSettings(settings);
      return settings;
    },
    () => memoryStore.getSettings(),
    30000 // Settings change rarely, 30s cache
  );
}

export async function getParsedSettings(): Promise<AppSettings> {
  const settings = await getAllSettings();
  const map: Record<string, string> = {};
  settings.forEach((s) => {
    map[s.Key] = s.Value;
  });

  return {
    NAMA_APLIKASI: map['NAMA_APLIKASI'] || 'SIJAKA',
    NAMA_LEMBAGA: map['NAMA_LEMBAGA'] || 'Jamaah Tahlil Ar Rohman',
    WILAYAH: map['WILAYAH'] || 'Perum GPA Ngijo',
    RT_AKTIF: (map['RT_AKTIF'] || '06,07,10').split(',').map((s) => s.trim()),
    IURAN_BULANAN: parseInt(map['IURAN_BULANAN'] || '5000', 10),
    NOMINAL_SANTUNAN: parseInt(map['NOMINAL_SANTUNAN'] || '600000', 10),
    MASA_TUNGGU_HARI: parseInt(map['MASA_TUNGGU_HARI'] || '0', 10),
    MATA_UANG: map['MATA_UANG'] || 'IDR',
  };
}

export async function updateSetting(key: string, value: string): Promise<Setting> {
  const settings = await getAllSettings();
  const index = settings.findIndex((s) => s.Key === key);

  if (index === -1) {
    throw new Error(`Setting with key ${key} not found`);
  }

  const updated: Setting = {
    ...settings[index],
    Value: value,
  };

  settings[index] = updated;
  memoryStore.setSettings([...settings]);
  invalidateCache('settings');

  const client = getSheetsClient();
  if (client) {
    try {
      const rowIndex = index + 2;
      await client.sheets.spreadsheets.values.update({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.SETTINGS}!B${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]],
        },
      });
    } catch (err) {
      console.error('Error updating setting in Google Sheets:', err);
    }
  }

  return updated;
}
