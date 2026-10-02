/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Assistant Phase 1 - Safety Guard
 */

import { AssistantUserContext, GuardCheckResult } from './types.ts';

/**
 * Evaluates input query against strict safety, Anti-IDOR, read-only, and authorization constraints.
 */
export function evaluateAssistantGuard(
  message: string,
  context: AssistantUserContext
): GuardCheckResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      passed: false,
      response: {
        message: 'Silakan ajukan pertanyaan atau topik bantuan seputar layanan SIJAKA.',
        category: 'HELP',
        suggestedActions: [
          { label: 'Cek Status Iuran', action: 'VIEW_IURAN' },
          { label: 'Cek Data Keluarga', action: 'VIEW_KELUARGA' },
          { label: 'Panduan Santunan', action: 'INFO' },
        ],
      },
    };
  }

  const lower = trimmed.toLowerCase();

  // -------------------------------------------------------------
  // 1. CREDENTIAL & SYSTEM PROBE GUARD
  // -------------------------------------------------------------
  const credentialPatterns = [
    /\b(password|kata sandi|jwt|token|api_key|apikey|secret|env|sheet_id|service account)\b/i,
    /\b(system prompt|ignore previous instructions|abaikan instruksi sebelumnya)\b/i,
  ];
  for (const pattern of credentialPatterns) {
    if (pattern.test(lower)) {
      return {
        passed: false,
        reason: 'PROBING_CREDENTIALS_OR_PROMPT_INJECTION',
        response: {
          message:
            'Permintaan tidak dapat diproses. Asisten SIJAKA tidak memiliki akses terhadap informasi kredensial, kunci akses, atau konfigurasi internal sistem demi keamanan jamaah.',
          category: 'HELP',
          suggestedActions: [
            { label: 'Menu Utama', action: 'NAVIGATE', target: '/' },
          ],
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 2. MUTATION SAFETY GUARD (READ-ONLY ENFORCEMENT)
  // -------------------------------------------------------------
  // Assistant is strictly READ-ONLY. Detect attempts to execute transactions or mutations:
  const mutationChecks = [
    {
      pattern: /(tambah|buat|input|daftarkan|register|hapus|delete|edit|ubah|simpan)(kan|i)?\s+(anggota|warga|peserta|kk)/i,
      message:
        'Asisten SIJAKA bersifat read-only dan tidak dapat mengubah atau mendaftarkan data anggota secara langsung. Pendaftaran atau perubahan data KK dapat dilakukan melalui menu Pendaftaran / Data Anggota oleh Pengurus atau form pendaftaran warga.',
      category: 'REDIRECT' as const,
      action: { label: 'Buka Menu Anggota', action: 'NAVIGATE' as const, target: '/anggota' },
    },
    {
      pattern: /(tambah|buat|input|hapus|delete|edit|ubah|ganti)(kan|i)?\s+(keluarga|anak|istri|suami|tanggungan|ahli waris)/i,
      message:
        'Asisten tidak dapat menambah atau menghapus anggota keluarga secara mandiri. Untuk memperbarui susunan keluarga dalam KK Anda, silakan gunakan tombol "Kelola Keluarga" pada tab Data Keluarga di Member Portal.',
      category: 'REDIRECT' as const,
      action: { label: 'Buka Tab Keluarga', action: 'VIEW_KELUARGA' as const, target: 'keluarga' },
    },
    {
      pattern: /(bayar|input|catat|buat|hapus|edit|ubah|konfirmasi)(kan|i)?\s+(iuran|uang|kas\s+masuk|pembayaran)/i,
      message:
        'Asisten SIJAKA bersifat read-only dan tidak dapat mencatat atau mengonfirmasi pembayaran iuran. Pembayaran iuran warga diverifikasi dan dicatat oleh Bendahara melalui modul Transaksi Iuran.',
      category: 'REDIRECT' as const,
      action: { label: 'Lihat Riwayat Iuran', action: 'VIEW_IURAN' as const, target: 'iuran' },
    },
    {
      pattern: /(lapor|laporkan|buat|input|catat)(kan|i)?\s+(kematian|meninggal|wafat)/i,
      message:
        'Asisten SIJAKA bersifat read-only dan tidak dapat mencatat laporan kematian. Pelaporan kematian warga resmi memerlukan verifikasi dokumen (Surat Kematian/Keterangan RT). Silakan gunakan formulir Pelaporan Kematian resmi di menu Layanan Santunan atau hubungi Pengurus RT setempat.',
      category: 'REDIRECT' as const,
      action: { label: 'Layanan Santunan', action: 'INFO' as const, target: 'santunan' },
    },
    {
      pattern: /(setujui|menyetujui|acc|approve|tolak|menolak|reject|cairkan|mencairkan|bayar|membayar|transfer)(kan|i)?(\s+\w+)?\s+(santunan|klaim|dana)/i,
      message:
        'Asisten SIJAKA bukan penentu keputusan santunan dan tidak dapat menyetujui atau mencairkan dana santunan. Seluruh proses persetujuan dan pencairan santunan merupakan wewenang Pengurus dan Bendahara berdasarkan musyawarah dan dokumen sah.',
      category: 'HELP' as const,
      action: { label: 'Ketentuan Santunan', action: 'INFO' as const, target: 'santunan' },
    },
    {
      pattern: /(tambah|buat|input|catat|hapus|edit|ubah)(kan|i)?\s+(pengeluaran|biaya|donasi|saldo|buku\s+kas)/i,
      message:
        'Asisten SIJAKA bersifat read-only dan tidak dapat mengubah atau mencatat transaksi keuangan. Pencatatan keuangan (Buku Kas, Pengeluaran, Donasi) hanya dapat dilakukan oleh Pengurus dan Bendahara melalui menu pembukuan keuangan internal.',
      category: 'REDIRECT' as const,
      action: { label: 'Menu Keuangan', action: 'NAVIGATE' as const, target: '/buku-kas' },
    },
  ];

  for (const check of mutationChecks) {
    if (check.pattern.test(lower)) {
      return {
        passed: false,
        reason: 'MUTATION_ATTEMPT_BLOCKED',
        response: {
          message: check.message,
          category: check.category,
          suggestedActions: [check.action],
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 3. ANTI-IDOR & PRIVACY GUARD
  // -------------------------------------------------------------
  // If role is ANGGOTA, user is strictly forbidden from querying other member's specific ID
  if (context.role === 'ANGGOTA') {
    // Detect ID format patterns e.g. A00001, A00002, etc.
    const memberIdMatches = message.match(/\bA\d{5}\b/gi);
    if (memberIdMatches && memberIdMatches.length > 0) {
      const ownId = (context.idAnggota || '').toUpperCase();
      const unauthorizedIds = memberIdMatches
        .map((id) => id.toUpperCase())
        .filter((id) => id !== ownId);

      if (unauthorizedIds.length > 0) {
        return {
          passed: false,
          reason: 'ANTI_IDOR_VIOLATION',
          response: {
            message: `Demi menjaga privasi warga dan keamanan sistem SIJAKA, Anda hanya berhak mengakses informasi Kartu Keluarga Anda sendiri${
              ownId ? ` (ID: ${ownId})` : ''
            }. Data kepesertaan atau identitas warga lain tidak dapat diakses melalui asisten.`,
            category: 'SELF_DATA',
            suggestedActions: [
              { label: 'Lihat Data KK Saya', action: 'NAVIGATE', target: '/' },
              { label: 'Cek Iuran Saya', action: 'VIEW_IURAN' },
            ],
          },
        };
      }
    }

    // Detect probing for other people's names or lists of members (exempt inquiries about own family)
    const isAskingOwnFamily =
      lower.includes('keluarga saya') ||
      lower.includes('keluargaku') ||
      lower.includes('keluarga sendiri') ||
      (lower.includes('keluarga') && (lower.includes('saya') || lower.includes('kami')));

    if (!isAskingOwnFamily) {
      const probeOtherMembersPatterns = [
        /\b(siapa saja|daftar|semua)\s+(warga|anggota|kk|peserta|jamaah)\b/i,
        /\b(data|nik|no hp|nomor hp|telepon|alamat|tunggakan)\s+(tetangga|orang lain|warga lain|pak|bu|ketua)\b/i,
      ];

      for (const pattern of probeOtherMembersPatterns) {
        if (pattern.test(lower)) {
          return {
            passed: false,
            reason: 'PROBING_OTHER_MEMBERS_DATA',
            response: {
              message:
                'Demi menjaga kerahasiaan dan privasi data warga (PII), asisten tidak menyediakan informasi pribadi, nomor kontak, atau daftar keanggotaan warga lain. Anda hanya dapat melihat data kepesertaan keluarga Anda sendiri.',
              category: 'SELF_DATA',
              suggestedActions: [
                { label: 'Lihat Status Saya', action: 'VIEW_IURAN' },
              ],
            },
          };
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. SANTUNAN DECISION MAKER GUARD
  // -------------------------------------------------------------
  if (
    /(apakah.*(menyetujui|setuju|cairkan|putuskan|pencairan).*santunan|apakah saya pasti dapat santunan|pastikan saya dapat uang|saya minta uang santunan sekarang|jaminan uang santunan|bisa.*(cairkan|menyetujui).*santunan)/i.test(
      lower
    )
  ) {
    return {
      passed: false,
      reason: 'SANTUNAN_DECISION_PROBE',
      response: {
        message:
          'Asisten SIJAKA bukan penentu keputusan santunan kematian dan tidak memiliki wewenang menyetujui atau mencairkan dana santunan. Hak santunan kematian warga terdaftar dijamin sesuai ketentuan SIJAKA (masa tunggu 0 hari dan tunggakan iuran tidak membatalkan hak santunan), namun verifikasi berkas kematian dan keputusan pencairan resmi sepenuhnya merupakan wewenang Pengurus dan Bendahara.',
        category: 'HELP',
        suggestedActions: [
          { label: 'Ketentuan Santunan', action: 'INFO', target: 'santunan' },
        ],
      },
    };
  }

  return { passed: true };
}
