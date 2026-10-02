/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Assistant Phase 1 - Type Definitions
 */

export type AssistantCategory = 'GENERAL' | 'NAVIGATION' | 'SELF_DATA' | 'HELP' | 'REDIRECT';

export interface SuggestedAction {
  label: string;
  action: 'NAVIGATE' | 'VIEW_IURAN' | 'VIEW_KELUARGA' | 'INFO' | 'OPEN_MODAL';
  target?: string;
}

export interface AssistantChatRequest {
  message: string;
  conversationId?: string;
}

export interface AssistantChatResponseData {
  message: string;
  category: AssistantCategory;
  suggestedActions: SuggestedAction[];
}

export interface AssistantChatResponse {
  success: boolean;
  data: AssistantChatResponseData;
  message?: string;
}

export interface AssistantMemberFamilyItem {
  nama: string;
  hubungan: string;
  status: string;
  calonAhliWaris: boolean;
}

export interface AssistantMemberIuranItem {
  periode: string;
  status: string;
  tanggalPembayaran?: string;
  nominal?: number; // Only exposed if status is Lunas
}

export interface AssistantMemberArrearsSummary {
  jumlahPeriode: number;
  nominalTunggakan: number;
  statusBulanBerjalan: boolean; // true if already paid current month, false if unpaid
  periodeBelumBayar: string[];
}

export interface AssistantMemberContext {
  nama: string;
  rt: string;
  status: string;
  keluarga: AssistantMemberFamilyItem[];
  iuran: AssistantMemberIuranItem[];
  tunggakan: AssistantMemberArrearsSummary;
}

export interface AssistantUserContext {
  idUser: string;
  username: string;
  nama: string;
  role: string;
  idAnggota?: string;
  memberData?: AssistantMemberContext; // Only populated for role ANGGOTA
}

export interface GuardCheckResult {
  passed: boolean;
  response?: AssistantChatResponseData;
  reason?: string;
}
