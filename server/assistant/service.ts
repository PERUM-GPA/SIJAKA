/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Assistant Phase 1 - Service Orchestrator
 */

import { GoogleGenAI } from '@google/genai';
import {
  AssistantChatRequest,
  AssistantChatResponseData,
  AssistantUserContext,
  SuggestedAction,
} from './types.ts';
import { evaluateAssistantGuard } from './guard.ts';
import { buildAssistantContext } from './context.ts';
import { SafeUser } from '../../src/types/index.ts';

let aiClient: GoogleGenAI | null = null;
let rateLimitCooldownUntil = 0;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `Anda adalah Asisten SIJAKA (Sistem Informasi Jaminan Kematian Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo, Karangploso, Malang).
Peran Anda adalah asisten informasi yang ramah, sopan, amanah, dan patuh pada ketentuan sistem.

ATURAN KEAMANAN MUTLAK (SECURITY RULES):
1. ANDA BERSIFAT READ-ONLY: Jangan pernah menyetujui, mencatat, mengubah, atau menghapus data transaksi, anggota, keluarga, santunan, donasi, atau kas.
2. BUKAN PENGAMBIL KEPUTUSAN: Anda BUKAN penentu hak klaim santunan. Keputusan santunan sepenuhnya merupakan wewenang Pengurus/Bendahara berdasarkan musyawarah dan dokumen sah.
3. PRIVASI & ANTI-IDOR: Untuk anggota (warga), Anda HANYA mengetahui data KK anggota yang sedang login sesuai KONTEKS DATA RESMI yang diberikan. DILARANG KERAS mengarang, menebak, atau mengungkap data warga lain.
4. KEBIJAKAN UTAMA SIJAKA:
   - Asas 1 KK = 1 Kepesertaan.
   - Iuran wajib: Rp5.000 / KK / bulan.
   - Masa tunggu perlindungan: 0 hari (aktif sejak terdaftar).
   - Tunggakan iuran TIDAK menghapus hak santunan kematian bagi warga/keluarga terdaftar.
   - Cakupan perlindungan: Seluruh anggota keluarga yang tercatat sah (Kepala Keluarga, Pasangan, Anak, Orang Tua/Mertua, Tanggungan).
5. Jika user meminta melakukan tindakan perubahan data, jelaskan bahwa tindakan harus dilakukan melalui menu SIJAKA yang sesuai.
6. Jika informasi yang ditanyakan tidak tersedia dalam konteks, jawab dengan jujur bahwa informasi tersebut tidak tercatat di sistem.

FORMAT KELUARAN (WAJIB JSON):
{
  "message": "penjelasan yang jelas dan sopan dalam bahasa Indonesia",
  "category": "GENERAL" | "NAVIGATION" | "SELF_DATA" | "HELP" | "REDIRECT",
  "suggestedActions": [
    { "label": "Label tombol", "action": "NAVIGATE" | "VIEW_IURAN" | "VIEW_KELUARGA" | "INFO", "target": "opsional rute/tab" }
  ]
}`;

/**
 * Intelligent deterministic fallback generator when AI API key is unavailable, offline, or rate-limited.
 */
function generateFallbackResponse(
  message: string,
  context: AssistantUserContext
): AssistantChatResponseData {
  const lower = message.toLowerCase();

  // 1. Inquiries about santunan decision / approval / disbursement
  if (
    lower.includes('santunan') &&
    (lower.includes('setuju') ||
      lower.includes('cair') ||
      lower.includes('putus') ||
      lower.includes('apakah') ||
      lower.includes('acc') ||
      lower.includes('jaminan'))
  ) {
    return {
      message:
        'Asisten SIJAKA bukan penentu keputusan santunan kematian dan tidak memiliki wewenang menyetujui atau mencairkan dana santunan. Hak santunan kematian warga terdaftar dijamin sesuai ketentuan SIJAKA (masa tunggu 0 hari dan tunggakan iuran tidak membatalkan hak santunan), namun verifikasi berkas kematian dan keputusan pencairan resmi sepenuhnya merupakan wewenang Pengurus dan Bendahara.',
      category: 'HELP',
      suggestedActions: [
        { label: 'Ketentuan Santunan', action: 'INFO', target: 'santunan' },
      ],
    };
  }

  // 2. Inquiries about user's own contributions / iuran / tunggakan
  if (
    lower.includes('iuran') ||
    lower.includes('tunggakan') ||
    lower.includes('tagihan') ||
    lower.includes('bayar')
  ) {
    if (context.role === 'ANGGOTA' && context.memberData) {
      const { tunggakan, iuran } = context.memberData;
      const latestIuran = iuran.length > 0 ? iuran[iuran.length - 1] : null;
      let statusText = '';

      if (tunggakan.jumlahPeriode === 0) {
        statusText = `Alhamdulillah, status iuran KK Anda saat ini LUNAS tanpa tunggakan.`;
      } else {
        statusText = `Catatan sistem menunjukkan terdapat ${tunggakan.jumlahPeriode} periode belum terbayar dengan estimasi tunggakan sebesar Rp${tunggakan.nominalTunggakan.toLocaleString('id-ID')}.`;
      }

      const lunasBulanIniText = tunggakan.statusBulanBerjalan
        ? ' Iuran untuk bulan berjalan sudah terbayar.'
        : ' Iuran bulan berjalan saat ini belum tercatat lunas.';

      return {
        message: `${statusText}${lunasBulanIniText} Mengingat prinsip gotong royong jamaah, tunggakan iuran tidak menggugurkan hak santunan kematian anggota terdaftar.`,
        category: 'SELF_DATA',
        suggestedActions: [
          { label: 'Lihat Riwayat Iuran', action: 'VIEW_IURAN' },
          { label: 'Ketentuan Santunan', action: 'INFO', target: 'santunan' },
        ],
      };
    } else {
      return {
        message:
          'Informasi iuran anggota dapat dikelola melalui modul "Transaksi Iuran" pada menu internal SIJAKA oleh Bendahara atau Pengurus.',
        category: 'NAVIGATION',
        suggestedActions: [
          { label: 'Buka Transaksi Iuran', action: 'NAVIGATE', target: '/iuran' },
        ],
      };
    }
  }

  // 2. Inquiries about family members / ahli waris
  if (
    lower.includes('keluarga') ||
    lower.includes('anggota keluarga') ||
    lower.includes('ahli waris') ||
    lower.includes('jiwa') ||
    lower.includes('tanggungan')
  ) {
    if (context.role === 'ANGGOTA' && context.memberData) {
      const { keluarga } = context.memberData;
      const totalKeluarga = keluarga.length;
      const ahliWaris = keluarga.filter((k) => k.calonAhliWaris);
      const ahliWarisText =
        ahliWaris.length > 0
          ? `Calon ahli waris terdaftar: ${ahliWaris.map((a) => a.nama).join(', ')}.`
          : 'Belum ada calon ahli waris spesifik yang ditandai.';

      return {
        message: `Kartu Keluarga Anda terdaftar dengan ${totalKeluarga} anggota keluarga yang terlindungi dalam jaminan kematian SIJAKA. ${ahliWarisText}`,
        category: 'SELF_DATA',
        suggestedActions: [
          { label: 'Kelola Data Keluarga', action: 'VIEW_KELUARGA' },
        ],
      };
    } else {
      return {
        message:
          'Data susunan keluarga dan ahli waris jamaah dapat dilihat dan dikelola melalui modul "Data Anggota" & "Data Keluarga".',
        category: 'NAVIGATION',
        suggestedActions: [
          { label: 'Data Anggota', action: 'NAVIGATE', target: '/anggota' },
          { label: 'Data Keluarga', action: 'NAVIGATE', target: '/keluarga' },
        ],
      };
    }
  }

  // 3. Inquiries about santunan rules (masa tunggu, nominal, ketentuan)
  if (
    lower.includes('santunan') ||
    lower.includes('masa tunggu') ||
    lower.includes('klaim') ||
    lower.includes('aturan') ||
    lower.includes('ad/art')
  ) {
    return {
      message:
        'Ketentuan Pokok Santunan SIJAKA Ar Rohman:\n1. Asas 1 KK = 1 Kepesertaan dengan iuran Rp5.000/KK/bulan.\n2. Seluruh anggota keluarga yang sah dalam KK terlindungi (Kepala Keluarga, Pasangan, Anak, Orang Tua, Tanggungan).\n3. Masa tunggu perlindungan: 0 hari (aktif seketika sejak terdaftar).\n4. Tunggakan iuran TIDAK membatalkan hak santunan kematian.\n5. Pengajuan santunan dilakukan dengan menyerahkan berkas keterangan kematian ke Pengurus RT untuk diproses oleh Bendahara.',
      category: 'HELP',
      suggestedActions: [
        { label: 'Informasi Santunan', action: 'INFO', target: 'santunan' },
        { label: 'Riwayat Iuran', action: 'VIEW_IURAN' },
      ],
    };
  }

  // 4. Inquiries about navigation / features
  if (
    lower.includes('buku kas') ||
    lower.includes('laporan') ||
    lower.includes('pengeluaran') ||
    lower.includes('donasi')
  ) {
    if (context.role === 'ANGGOTA') {
      return {
        message:
          'Modul pembukuan keuangan internal (Buku Kas, Pengeluaran, dan Rekonsiliasi) dikhususkan untuk Pengurus dan Bendahara. Anggota dapat melihat ringkasan keuangan umum melalui Dashboard Publik.',
        category: 'GENERAL',
        suggestedActions: [
          { label: 'Dashboard Publik', action: 'NAVIGATE', target: '/' },
        ],
      };
    } else {
      return {
        message:
          'Navigasi Keuangan SIJAKA:\n- Buku Kas: /buku-kas\n- Pengeluaran: /pengeluaran\n- Donasi: /donasi\n- Laporan & Rekonsiliasi: /reports',
        category: 'NAVIGATION',
        suggestedActions: [
          { label: 'Buku Kas', action: 'NAVIGATE', target: '/buku-kas' },
          { label: 'Laporan', action: 'NAVIGATE', target: '/reports' },
        ],
      };
    }
  }

  // 5. Default greeting & general help
  const roleDisplay = context.role === 'ANGGOTA' ? 'Bapak/Ibu Jamaah' : `Pengurus (${context.role})`;
  return {
    message: `Halo ${context.nama || roleDisplay}, saya adalah Asisten Resmi SIJAKA (Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo). Ada yang bisa saya bantu terkait informasi kepesertaan, status iuran, susunan keluarga, atau ketentuan santunan?`,
    category: 'GENERAL',
    suggestedActions:
      context.role === 'ANGGOTA'
        ? [
            { label: 'Cek Status Iuran', action: 'VIEW_IURAN' },
            { label: 'Data Keluarga', action: 'VIEW_KELUARGA' },
            { label: 'Ketentuan Santunan', action: 'INFO', target: 'santunan' },
          ]
        : [
            { label: 'Dashboard Internal', action: 'NAVIGATE', target: '/dashboard' },
            { label: 'Transaksi Iuran', action: 'NAVIGATE', target: '/iuran' },
            { label: 'Buku Kas', action: 'NAVIGATE', target: '/buku-kas' },
          ],
  };
}

/**
 * Main chat handler for Assistant Phase 1.
 */
export async function processAssistantChat(
  user: SafeUser,
  request: AssistantChatRequest
): Promise<AssistantChatResponseData> {
  // 1. Build authoritative context strictly from session (no client-provided IDs)
  const context = await buildAssistantContext(user);

  // 2. Evaluate Security & Anti-IDOR Guard
  const guardResult = evaluateAssistantGuard(request.message, context);
  if (!guardResult.passed && guardResult.response) {
    return guardResult.response;
  }

  // 3. Check for Gemini API availability and rate-limit cooldown
  if (Date.now() < rateLimitCooldownUntil) {
    return generateFallbackResponse(request.message, context);
  }

  const ai = getAiClient();
  if (!ai) {
    return generateFallbackResponse(request.message, context);
  }

  try {
    // 4. Construct prompt with sanitized context
    const contextPrompt = `KONTEKS PENGGUNA TERAUTENTIKASI (RESMI DARI SERVER):
User ID: ${context.idUser}
Nama: ${context.nama}
Role: ${context.role}
ID Anggota: ${context.idAnggota || 'Tidak terikat KK (Staf Internal)'}
${
  context.memberData
    ? `DATA RESMI KARTU KELUARGA SENDIRI:
- Nama KK: ${context.memberData.nama}
- RT: ${context.memberData.rt}
- Status: ${context.memberData.status}
- Anggota Keluarga: ${JSON.stringify(context.memberData.keluarga)}
- Riwayat Iuran Terakhir: ${JSON.stringify(context.memberData.iuran.slice(-5))}
- Status Tunggakan: ${JSON.stringify(context.memberData.tunggakan)}`
    : `(User adalah Staf/Pengurus - Akses broad database anggota dinonaktifkan di Phase 1)`
}

PERTANYAAN USER:
"${request.message.replace(/"/g, '\\"')}"`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const rawText = result.text?.trim() || '';
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText) as AssistantChatResponseData;
        if (parsed.message && parsed.category) {
          // Normalize suggested actions
          const actions: SuggestedAction[] = Array.isArray(parsed.suggestedActions)
            ? parsed.suggestedActions.map((a) => ({
                label: String(a.label || 'Buka'),
                action: (a.action as any) || 'NAVIGATE',
                target: a.target ? String(a.target) : undefined,
              }))
            : [];

          return {
            message: parsed.message,
            category: parsed.category,
            suggestedActions: actions,
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse Gemini JSON response, falling back to deterministic response:', parseError);
      }
    }

    return generateFallbackResponse(request.message, context);
  } catch (apiError: any) {
    const errStr = String(apiError?.message || apiError);
    const isRateLimit =
      apiError?.status === 429 ||
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('Quota exceeded');

    if (isRateLimit) {
      rateLimitCooldownUntil = Date.now() + 60_000;
      console.info('Gemini API rate limit reached (429), activated 60s cooldown; serving deterministic fallback.');
    } else {
      console.warn('Gemini API call failed, using deterministic fallback:', apiError?.message || apiError);
    }
    return generateFallbackResponse(request.message, context);
  }
}
