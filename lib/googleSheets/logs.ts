import { ActivityLog, ActionType } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, memoryStore, cachedRead, invalidateCache } from './client.ts';

export async function getAllLogs(): Promise<ActivityLog[]> {
  const client = getSheetsClient();
  if (!client) {
    return memoryStore.getLogs();
  }

  return cachedRead(
    'logs',
    async () => {
      const response = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.LOG_AKTIVITAS}!A2:I`,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return memoryStore.getLogs();
      }

      const logs: ActivityLog[] = rows.map((row) => ({
        ID_Log: row[0] || '',
        Timestamp: row[1] || '',
        ID_User: row[2] || '',
        Nama_User: row[3] || '',
        Aksi: (row[4] as ActionType) || 'LOGIN',
        Modul: row[5] || '',
        Record_ID: row[6] || '',
        Deskripsi: row[7] || '',
        Status: (row[8] as 'SUCCESS' | 'FAILED') || 'SUCCESS',
      })).filter((l) => l.ID_Log !== '');

      memoryStore.setLogs(logs);
      return logs;
    },
    () => memoryStore.getLogs(),
    15000
  );
}

export async function generateNextLogId(): Promise<string> {
  const logs = await getAllLogs();
  if (logs.length === 0) {
    return 'LOG00001';
  }

  let maxNum = 0;
  for (const l of logs) {
    if (l.ID_Log.startsWith('LOG')) {
      const numPart = parseInt(l.ID_Log.substring(3), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `LOG${nextNum.toString().padStart(5, '0')}`;
}

export async function createActivityLog(params: {
  ID_User: string;
  Nama_User: string;
  Aksi: ActionType;
  Modul: string;
  Record_ID: string;
  Deskripsi: string;
  Status?: 'SUCCESS' | 'FAILED';
}): Promise<ActivityLog> {
  const nextId = await generateNextLogId();
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const newLog: ActivityLog = {
    ID_Log: nextId,
    Timestamp: timestamp,
    ID_User: params.ID_User,
    Nama_User: params.Nama_User,
    Aksi: params.Aksi,
    Modul: params.Modul,
    Record_ID: params.Record_ID,
    Deskripsi: params.Deskripsi,
    Status: params.Status || 'SUCCESS',
  };

  memoryStore.addLog(newLog);
  invalidateCache('logs');

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newLog.ID_Log,
        newLog.Timestamp,
        newLog.ID_User,
        newLog.Nama_User,
        newLog.Aksi,
        newLog.Modul,
        newLog.Record_ID,
        newLog.Deskripsi,
        newLog.Status,
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.LOG_AKTIVITAS}!A:I`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } catch (error) {
      console.error('Error writing log to Google Sheets:', error);
    }
  }

  return newLog;
}
