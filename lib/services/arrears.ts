import { MemberArrearsInfo } from '../../src/types/index.ts';
import { getMemberById, getAllMembers } from '../googleSheets/anggota.ts';
import { getContributionsByMemberId, getAllContributions } from '../googleSheets/iuran.ts';
import { getParsedSettings } from '../googleSheets/settings.ts';

/**
 * Calculates payment arrears for a specific member
 */
export async function calculateMemberArrears(memberId: string): Promise<MemberArrearsInfo> {
  const member = await getMemberById(memberId);
  if (!member) {
    throw new Error(`Anggota dengan ID ${memberId} tidak ditemukan.`);
  }

  const settings = await getParsedSettings();
  const monthlyRate = settings.IURAN_BULANAN || 5000;

  // Determine current date (August 2026 in app context or actual current date)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Parse start date from member.Tanggal_Daftar
  let startYear = currentYear;
  let startMonth = currentMonth;

  if (member.Tanggal_Daftar) {
    const parts = member.Tanggal_Daftar.split('-');
    if (parts.length >= 2) {
      startYear = parseInt(parts[0], 10);
      startMonth = parseInt(parts[1], 10);
    }
  }

  // Determine end obligation date
  let endYear = currentYear;
  let endMonth = currentMonth;

  if ((member.Status === 'Tidak Aktif' || member.Status === 'Meninggal') && member.Tanggal_Nonaktif) {
    const nonaktifParts = member.Tanggal_Nonaktif.split('-');
    if (nonaktifParts.length >= 2) {
      endYear = parseInt(nonaktifParts[0], 10);
      endMonth = parseInt(nonaktifParts[1], 10);
    }
  }

  // Generate required obligation periods (YYYY-MM)
  const requiredPeriods: string[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const periodStr = `${y}-${String(m).padStart(2, '0')}`;
    requiredPeriods.push(periodStr);

    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  // Fetch member's paid contributions
  const contributions = await getContributionsByMemberId(memberId);
  const paidSet = new Set<string>();

  for (const c of contributions) {
    if (c.Status === 'Lunas') {
      const p = `${c.Periode_Tahun}-${String(c.Periode_Bulan).padStart(2, '0')}`;
      paidSet.add(p);
    }
  }

  const currentPeriodStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const unpaidPeriods: string[] = [];
  const tunggakanPeriods: string[] = [];

  for (const p of requiredPeriods) {
    if (!paidSet.has(p)) {
      unpaidPeriods.push(p);
      // If period is strictly before current month, it counts as tunggakan
      if (p < currentPeriodStr) {
        tunggakanPeriods.push(p);
      }
    }
  }

  const belumBayarBulanBerjalan = unpaidPeriods.includes(currentPeriodStr);

  return {
    idAnggota: member.ID_Anggota,
    namaAnggota: member.Nama,
    rt: member.RT,
    statusAnggota: member.Status,
    tanggalDaftar: member.Tanggal_Daftar,
    tanggalNonaktif: member.Tanggal_Nonaktif,
    totalBulanWajib: requiredPeriods.length,
    totalBulanLunas: paidSet.size,
    totalBulanTunggakan: tunggakanPeriods.length,
    totalNominalTunggakan: tunggakanPeriods.length * monthlyRate,
    periodeTunggakan: tunggakanPeriods,
    belumBayarBulanBerjalan,
    periodeBelumBayar: unpaidPeriods,
  };
}

/**
 * Calculates arrears and contribution summaries for all active members
 */
export async function calculateAllMembersArrears(): Promise<{
  membersArrears: MemberArrearsInfo[];
  summary: {
    totalAnggotaAktif: number;
    jumlahSudahBayarBulanIni: number;
    jumlahBelumBayarBulanIni: number;
    totalAnggotaMenunggak: number;
    totalNominalTunggakan: number;
    totalIuranTerkumpulBulanIni: number;
  };
}> {
  const allMembers = await getAllMembers();
  const allContributions = await getAllContributions();
  const settings = await getParsedSettings();
  const monthlyRate = settings.IURAN_BULANAN || 5000;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentPeriodStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const activeMembers = allMembers.filter((m) => m.Status === 'Aktif');
  const results: MemberArrearsInfo[] = [];

  let jumlahSudahBayarBulanIni = 0;
  let totalAnggotaMenunggak = 0;
  let totalNominalTunggakan = 0;
  let totalIuranTerkumpulBulanIni = 0;

  // Calculate current month collections
  for (const c of allContributions) {
    if (
      c.Periode_Tahun === currentYear &&
      c.Periode_Bulan === currentMonth &&
      c.Status === 'Lunas'
    ) {
      totalIuranTerkumpulBulanIni += c.Nominal;
    }
  }

  for (const member of activeMembers) {
    const arrearsInfo = await calculateMemberArrears(member.ID_Anggota);
    results.push(arrearsInfo);

    if (!arrearsInfo.belumBayarBulanBerjalan) {
      jumlahSudahBayarBulanIni++;
    }

    if (arrearsInfo.totalBulanTunggakan > 0) {
      totalAnggotaMenunggak++;
      totalNominalTunggakan += arrearsInfo.totalNominalTunggakan;
    }
  }

  const jumlahBelumBayarBulanIni = activeMembers.length - jumlahSudahBayarBulanIni;

  return {
    membersArrears: results,
    summary: {
      totalAnggotaAktif: activeMembers.length,
      jumlahSudahBayarBulanIni,
      jumlahBelumBayarBulanIni,
      totalAnggotaMenunggak,
      totalNominalTunggakan,
      totalIuranTerkumpulBulanIni,
    },
  };
}
