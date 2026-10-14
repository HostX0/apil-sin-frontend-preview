import { describe, expect, it } from 'vitest';
import type { CaseFeeSummary, FinanceAccountSummary } from '@muhami/shared';
import { filterFinancialFiles, financialFiles, movementInPeriod } from './finance-workspace-utils';

const feeCase = (changes: Partial<CaseFeeSummary> = {}): CaseFeeSummary => ({
  caseId: 'case-1',
  caseNumber: '١٢٣/٢٠٢٦',
  clientName: 'أحمد علي',
  agreed: '100000',
  received: '0',
  remaining: '100000',
  overpaid: '0',
  hasAgreement: true,
  hasUnpricedAgreement: false,
  editableAgreement: null,
  payments: [],
  ...changes,
});
const account = (changes: Partial<FinanceAccountSummary> = {}): FinanceAccountSummary => ({
  id: 'account-1',
  title: 'استشارة قانونية',
  partyName: 'علي حسين',
  clientId: null,
  clientName: null,
  transactionId: null,
  transactionType: null,
  agreed: '50000',
  received: '50000',
  remaining: '0',
  expenses: '0',
  billableExpenses: '0',
  version: 1,
  notes: null,
  dueAt: null,
  movements: [],
  ...changes,
});

describe('financial file list', () => {
  it('does not present an unpriced case or percentage agreement as settled', () => {
    const rows = financialFiles(
      [
        feeCase({ hasAgreement: false, agreed: '0', remaining: '0' }),
        feeCase({ caseId: 'case-2', hasUnpricedAgreement: true, agreed: '0', remaining: '0' }),
      ],
      [],
    );
    expect(rows.map((row) => row.status)).toEqual(['unpriced', 'unpriced']);
    expect(filterFinancialFiles(rows, '', 'settled')).toEqual([]);
  });
  it('distinguishes an explicit zero fee expense file from paid fees', () => {
    expect(financialFiles([], [account({ agreed: '0', received: '0' })])[0]?.status).toBe('no-fee');
    expect(financialFiles([], [account()])[0]?.status).toBe('settled');
  });
  it('normalizes Arabic names while preserving large exact amounts and context', () => {
    const exact = '9007199254740993';
    const rows = financialFiles(
      [feeCase({ agreed: exact, remaining: exact })],
      [account({ transactionId: 'tx-1', clientId: 'client-1', clientName: 'أحمد علي' })],
    );
    const found = filterFinancialFiles(rows, 'احمد', 'all');
    expect(found).toHaveLength(2);
    expect(found[0]?.agreed).toBe(exact);
    expect(found[1]?.context).toBe('Transaction');
  });
});

describe('financial period in Baghdad', () => {
  it('includes local midnight even when its UTC date is the preceding day', () => {
    expect(movementInPeriod('2026-10-11T21:00:00.000Z', '2026-10-12', '2026-10-12')).toBe(true);
    expect(movementInPeriod('2026-10-12T21:00:00.000Z', '2026-10-12', '2026-10-12')).toBe(false);
  });
  it('includes both boundaries for a date-only financial input', () => {
    expect(movementInPeriod('2026-10-01', '2026-10-01', '2026-10-12')).toBe(true);
    expect(movementInPeriod('2026-10-12', '2026-10-01', '2026-10-12')).toBe(true);
  });
});
