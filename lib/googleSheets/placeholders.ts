import {
  DeathReport,
  Compensation,
  CashTransaction,
  Expense
} from '../../src/types/index.ts';

export { getFamiliesByMemberId } from './keluarga.ts';
export { getContributionsByMemberId } from './iuran.ts';

// Placeholder services for Phase 3+

export async function getDeathReports(): Promise<DeathReport[]> {
  console.log(`[Phase 2 Placeholder] getDeathReports`);
  return [];
}

export async function getCompensations(): Promise<Compensation[]> {
  console.log(`[Phase 2 Placeholder] getCompensations`);
  return [];
}

export async function getCashBook(): Promise<CashTransaction[]> {
  console.log(`[Phase 2 Placeholder] getCashBook`);
  return [];
}

export async function getExpenses(): Promise<Expense[]> {
  console.log(`[Phase 2 Placeholder] getExpenses`);
  return [];
}
