/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Assistant Phase 1 - Context Builder
 */

import { SafeUser } from '../../src/types/index.ts';
import { getMemberById } from '../../lib/googleSheets/anggota.ts';
import { getFamiliesByMemberId } from '../../lib/googleSheets/keluarga.ts';
import { getContributionsByMemberId } from '../../lib/googleSheets/iuran.ts';
import { calculateMemberArrears } from '../../lib/services/arrears.ts';
import { resolveMemberIdForUser } from '../auth.ts';
import {
  AssistantUserContext,
  AssistantMemberContext,
  AssistantMemberFamilyItem,
  AssistantMemberIuranItem,
} from './types.ts';

/**
 * Builds user context strictly based on authenticated session.
 * For ANGGOTA: Reads only the member's own KK data (Profile, Keluarga, Iuran, Tunggakan).
 * For STAFF (ADMIN, BENDAHARA, PENGURUS): Does NOT provide broad citizen database access in Phase 1.
 */
export async function buildAssistantContext(user: SafeUser): Promise<AssistantUserContext> {
  const baseContext: AssistantUserContext = {
    idUser: user.ID_User,
    username: user.Username,
    nama: user.Nama,
    role: user.Role,
    idAnggota: user.ID_Anggota,
  };

  // If user is not ANGGOTA, do not expose broad database in Phase 1
  if (user.Role !== 'ANGGOTA') {
    return baseContext;
  }

  // Resolve ID_Anggota securely from session/database (never from client request)
  let memberId = user.ID_Anggota;
  if (!memberId) {
    memberId = await resolveMemberIdForUser(user);
    baseContext.idAnggota = memberId;
  }

  if (!memberId) {
    return baseContext;
  }

  try {
    // 1. Fetch own Member Profile
    const member = await getMemberById(memberId);
    if (!member) {
      return baseContext;
    }

    // 2. Fetch own Family members
    const families = await getFamiliesByMemberId(memberId);
    const safeFamilies: AssistantMemberFamilyItem[] = families.map((f) => ({
      nama: f.Nama,
      hubungan: f.Hubungan,
      status: f.Status,
      calonAhliWaris: f.Calon_Ahli_Waris === 'Ya',
    }));

    // 3. Fetch own Contributions
    const contributions = await getContributionsByMemberId(memberId);
    const safeIuran: AssistantMemberIuranItem[] = contributions.map((c) => ({
      periode: `${c.Periode_Bulan} ${c.Periode_Tahun}`,
      status: c.Status,
      tanggalPembayaran: c.Tanggal_Bayar || undefined,
      nominal: c.Status === 'Lunas' ? c.Nominal : undefined,
    }));

    // 4. Calculate own Arrears
    const arrears = await calculateMemberArrears(memberId);
    const safeTunggakan = {
      jumlahPeriode: arrears.totalBulanTunggakan,
      nominalTunggakan: arrears.totalNominalTunggakan,
      statusBulanBerjalan: !arrears.belumBayarBulanBerjalan,
      periodeBelumBayar: arrears.periodeBelumBayar,
    };

    // Construct safe member context (Strictly omitting other citizen data, NIK, No KK, phone, address)
    const memberData: AssistantMemberContext = {
      nama: member.Nama,
      rt: member.RT,
      status: member.Status,
      keluarga: safeFamilies,
      iuran: safeIuran,
      tunggakan: safeTunggakan,
    };

    baseContext.memberData = memberData;
    return baseContext;
  } catch (error) {
    console.error('Error building assistant context for member:', error);
    return baseContext;
  }
}
