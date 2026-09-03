import { DeathReport, DeathReportStatus, DeathReportHubungan } from '../../src/types/index.ts';
import { getSheetsClient, SHEET_NAMES, HEADERS, memoryStore, cachedRead, invalidateCache } from './client.ts';
import { getMemberById } from './anggota.ts';

function formatDateTime(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function generateNextDeathReportId(): Promise<string> {
  const reports = await getAllDeathReports();
  if (reports.length === 0) {
    return 'LK000001';
  }

  const numericIds = reports
    .map((r) => {
      const match = r.ID_Laporan.match(/^LK(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `LK${String(nextNum).padStart(6, '0')}`;
}

export async function getAllDeathReports(): Promise<DeathReport[]> {
  const client = getSheetsClient();
  if (!client) {
    return [...memoryStore.getDeathReports()];
  }

  return cachedRead(
    'deathReports',
    async () => {
      const res = await client.sheets.spreadsheets.values.get({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.LAPORAN_KEMATIAN}!A2:Q`,
      });

      const rows = res.data.values || [];
      if (rows.length === 0) {
        return [];
      }

      const reports: DeathReport[] = rows.map((row) => ({
        ID_Laporan: (row[0] || '').trim(),
        ID_Anggota: (row[1] || '').trim(),
        Tanggal_Lapor: (row[2] || '').trim(),
        Pelapor: (row[3] || '').trim(),
        Hubungan_Pelapor: (row[4] || 'Lainnya').trim() as DeathReportHubungan,
        Waktu_Kematian: (row[5] || '').trim(),
        Tempat_Kematian: (row[6] || '').trim(),
        Penyebab_Kematian: (row[7] || '').trim() || undefined,
        Dokumen_Pendukung: (row[8] || '').trim() || undefined,
        Status: (row[9] || 'DIAJUKAN').trim() as DeathReportStatus,
        Diverifikasi_Oleh: (row[10] || '').trim() || undefined,
        Tanggal_Verifikasi: (row[11] || '').trim() || undefined,
        Disetujui_Oleh: (row[12] || '').trim() || undefined,
        Tanggal_Persetujuan: (row[13] || '').trim() || undefined,
        Keterangan: (row[14] || '').trim() || undefined,
        Tanggal_Dibuat: (row[15] || '').trim(),
        Tanggal_Diperbarui: (row[16] || '').trim(),
      }));

      memoryStore.setDeathReports(reports);
      return reports;
    },
    () => [...memoryStore.getDeathReports()],
    15000
  );
}

export async function getDeathReportById(id: string): Promise<DeathReport | null> {
  const reports = await getAllDeathReports();
  return reports.find((r) => r.ID_Laporan === id) || null;
}

export async function getDeathReportsByMemberId(memberId: string): Promise<DeathReport[]> {
  const reports = await getAllDeathReports();
  return reports.filter((r) => r.ID_Anggota === memberId);
}

export async function createDeathReport(input: {
  ID_Anggota: string;
  Tanggal_Lapor?: string;
  Pelapor: string;
  Hubungan_Pelapor: DeathReportHubungan;
  Waktu_Kematian: string;
  Tempat_Kematian: string;
  Penyebab_Kematian?: string;
  Dokumen_Pendukung?: string;
  Keterangan?: string;
}): Promise<DeathReport> {
  // Validate member exists
  const member = await getMemberById(input.ID_Anggota);
  if (!member) {
    throw new Error(`Anggota dengan ID ${input.ID_Anggota} tidak ditemukan.`);
  }

  // Check if active death report exists
  const existingReports = await getDeathReportsByMemberId(input.ID_Anggota);
  const activeReport = existingReports.find((r) => r.Status !== 'DITOLAK');
  if (activeReport) {
    throw new Error(`Anggota ini sudah memiliki laporan kematian tercatat (${activeReport.ID_Laporan} - Status: ${activeReport.Status}).`);
  }

  const nextId = await generateNextDeathReportId();
  const nowStr = formatDateTime();

  const newReport: DeathReport = {
    ID_Laporan: nextId,
    ID_Anggota: input.ID_Anggota,
    Tanggal_Lapor: input.Tanggal_Lapor || new Date().toISOString().split('T')[0],
    Pelapor: input.Pelapor.trim(),
    Hubungan_Pelapor: input.Hubungan_Pelapor,
    Waktu_Kematian: input.Waktu_Kematian.trim(),
    Tempat_Kematian: input.Tempat_Kematian.trim(),
    Penyebab_Kematian: input.Penyebab_Kematian ? input.Penyebab_Kematian.trim() : undefined,
    Dokumen_Pendukung: input.Dokumen_Pendukung ? input.Dokumen_Pendukung.trim() : undefined,
    Status: 'DIAJUKAN',
    Keterangan: input.Keterangan ? input.Keterangan.trim() : undefined,
    Tanggal_Dibuat: nowStr,
    Tanggal_Diperbarui: nowStr,
  };

  const reports = await getAllDeathReports();
  reports.push(newReport);
  memoryStore.setDeathReports(reports);
  invalidateCache('deathReports');

  const client = getSheetsClient();
  if (client) {
    try {
      const rowData = [
        newReport.ID_Laporan,
        newReport.ID_Anggota,
        newReport.Tanggal_Lapor,
        newReport.Pelapor,
        newReport.Hubungan_Pelapor,
        newReport.Waktu_Kematian,
        newReport.Tempat_Kematian,
        newReport.Penyebab_Kematian || '',
        newReport.Dokumen_Pendukung || '',
        newReport.Status,
        '',
        '',
        '',
        '',
        newReport.Keterangan || '',
        newReport.Tanggal_Dibuat,
        newReport.Tanggal_Diperbarui,
      ];

      await client.sheets.spreadsheets.values.append({
        spreadsheetId: client.spreadsheetId,
        range: `${SHEET_NAMES.LAPORAN_KEMATIAN}!A:Q`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });
    } catch (err) {
      console.error('Error appending death report to Google Sheets:', err);
    }
  }

  return newReport;
}

export async function updateDeathReport(
  id: string,
  updates: Partial<DeathReport>
): Promise<DeathReport> {
  const reports = await getAllDeathReports();
  const index = reports.findIndex((r) => r.ID_Laporan === id);
  if (index === -1) {
    throw new Error(`Laporan Kematian ${id} tidak ditemukan.`);
  }

  const current = reports[index];
  const updated: DeathReport = {
    ...current,
    ...updates,
    ID_Laporan: current.ID_Laporan,
    ID_Anggota: updates.ID_Anggota || current.ID_Anggota,
    Tanggal_Diperbarui: formatDateTime(),
  };

  reports[index] = updated;
  memoryStore.setDeathReports(reports);

  await syncAllDeathReports(reports);
  return updated;
}

export async function verifyDeathReport(
  id: string,
  userId: string,
  status: 'DIVERIFIKASI' | 'DITOLAK',
  keterangan?: string
): Promise<DeathReport> {
  const reports = await getAllDeathReports();
  const index = reports.findIndex((r) => r.ID_Laporan === id);
  if (index === -1) {
    throw new Error(`Laporan Kematian ${id} tidak ditemukan.`);
  }

  const current = reports[index];
  if (current.Status === 'SELESAI') {
    throw new Error(`Laporan kematian ${id} sudah berstatus SELESAI dan tidak dapat diubah.`);
  }

  const nowStr = formatDateTime();
  const updated: DeathReport = {
    ...current,
    Status: status,
    Diverifikasi_Oleh: userId,
    Tanggal_Verifikasi: nowStr,
    Keterangan: keterangan ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Verifikasi: ${keterangan}` : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  reports[index] = updated;
  memoryStore.setDeathReports(reports);

  await syncAllDeathReports(reports);
  return updated;
}

export async function approveDeathReport(
  id: string,
  userId: string,
  status: 'DISETUJUI' | 'DITOLAK',
  keterangan?: string
): Promise<DeathReport> {
  const reports = await getAllDeathReports();
  const index = reports.findIndex((r) => r.ID_Laporan === id);
  if (index === -1) {
    throw new Error(`Laporan Kematian ${id} tidak ditemukan.`);
  }

  const current = reports[index];
  if (current.Status === 'SELESAI') {
    throw new Error(`Laporan kematian ${id} sudah berstatus SELESAI dan tidak dapat diubah.`);
  }

  const nowStr = formatDateTime();
  const updated: DeathReport = {
    ...current,
    Status: status,
    Disetujui_Oleh: userId,
    Tanggal_Persetujuan: nowStr,
    Keterangan: keterangan ? `${current.Keterangan ? current.Keterangan + ' | ' : ''}Persetujuan: ${keterangan}` : current.Keterangan,
    Tanggal_Diperbarui: nowStr,
  };

  reports[index] = updated;
  memoryStore.setDeathReports(reports);

  await syncAllDeathReports(reports);
  return updated;
}

export async function completeDeathReport(id: string): Promise<DeathReport> {
  const reports = await getAllDeathReports();
  const index = reports.findIndex((r) => r.ID_Laporan === id);
  if (index === -1) {
    throw new Error(`Laporan Kematian ${id} tidak ditemukan.`);
  }

  const current = reports[index];
  const nowStr = formatDateTime();
  const updated: DeathReport = {
    ...current,
    Status: 'SELESAI',
    Tanggal_Diperbarui: nowStr,
  };

  reports[index] = updated;
  memoryStore.setDeathReports(reports);

  await syncAllDeathReports(reports);
  return updated;
}

async function syncAllDeathReports(reports: DeathReport[]): Promise<void> {
  invalidateCache('deathReports');
  const client = getSheetsClient();
  if (!client) return;

  try {
    const rows = reports.map((r) => [
      r.ID_Laporan,
      r.ID_Anggota,
      r.Tanggal_Lapor,
      r.Pelapor,
      r.Hubungan_Pelapor,
      r.Waktu_Kematian,
      r.Tempat_Kematian,
      r.Penyebab_Kematian || '',
      r.Dokumen_Pendukung || '',
      r.Status,
      r.Diverifikasi_Oleh || '',
      r.Tanggal_Verifikasi || '',
      r.Disetujui_Oleh || '',
      r.Tanggal_Persetujuan || '',
      r.Keterangan || '',
      r.Tanggal_Dibuat,
      r.Tanggal_Diperbarui,
    ]);

    await client.sheets.spreadsheets.values.update({
      spreadsheetId: client.spreadsheetId,
      range: `${SHEET_NAMES.LAPORAN_KEMATIAN}!A2:Q`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  } catch (error) {
    console.error('Error syncing all death reports to Google Sheets:', error);
  }
}
