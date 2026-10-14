import {
  normalizeArabic,
  toBaghdadDateKey,
  type CaseFeeSummary,
  type FinanceAccountSummary,
} from '@muhami/shared';

export type FinancialFile = {
  id: string;
  kind: 'case' | 'account';
  title: string;
  party: string;
  context: 'Case' | 'Transaction' | 'Client' | 'Independent';
  agreed: string;
  received: string;
  remaining: string;
  status: 'unpriced' | 'outstanding' | 'settled' | 'no-fee';
};

export function financialFiles(
  cases: CaseFeeSummary[],
  accounts: FinanceAccountSummary[],
): FinancialFile[] {
  return [
    ...cases.map((row): FinancialFile => ({
      id: row.caseId,
      kind: 'case',
      title: `Case ${row.caseNumber}`,
      party: row.clientName,
      context: 'Case',
      agreed: row.agreed,
      received: row.received,
      remaining: row.remaining,
      status:
        !row.hasAgreement || row.hasUnpricedAgreement
          ? 'unpriced'
          : BigInt(row.remaining) > 0n
            ? 'outstanding'
            : 'settled',
    })),
    ...accounts.map((row): FinancialFile => ({
      id: row.id,
      kind: 'account',
      title: row.title,
      party: row.clientName ?? row.partyName ?? 'Independent account',
      context: row.transactionId ? 'Transaction' : row.clientId ? 'Client' : 'Independent',
      agreed: row.agreed,
      received: row.received,
      remaining: row.remaining,
      status:
        BigInt(row.agreed) === 0n
          ? 'no-fee'
          : BigInt(row.remaining) > 0n
            ? 'outstanding'
            : 'settled',
    })),
  ];
}

export function filterFinancialFiles(
  rows: FinancialFile[],
  search: string,
  status: 'all' | FinancialFile['status'],
) {
  const needle = normalizeArabic(search).trim();
  return rows.filter(
    (row) =>
      (status === 'all' || row.status === status) &&
      (!needle || normalizeArabic(`${row.title} ${row.party} ${row.context}`).includes(needle)),
  );
}

export function movementInPeriod(date: string, from: string, to: string) {
  const key = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toBaghdadDateKey(new Date(date));
  return (!from || key >= from) && (!to || key <= to);
}
