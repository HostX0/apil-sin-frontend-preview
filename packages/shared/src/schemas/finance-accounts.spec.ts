import { describe, expect, it } from 'vitest';
import {
  createFinanceAccountSchema,
  createFinanceMovementSchema,
  updateFinanceAccountSchema,
  voidFinanceMovementSchema,
  financeActivityQuerySchema,
} from './finance-accounts';

const account = {
  title: 'استشارة قانونية',
  totalAmount: '100000',
  idempotencyKey: 'new-financial-account',
};
const payment = {
  kind: 'PAYMENT',
  amount: '25000',
  occurredAt: '2026-10-12',
  description: 'دفعة أولى',
  method: 'CASH',
  idempotencyKey: 'first-payment-key',
};

describe('independent finance contracts', () => {
  it('supports independent, client and transaction files without inventing clients', () => {
    expect(createFinanceAccountSchema.parse(account).clientId).toBeUndefined();
    expect(
      createFinanceAccountSchema.parse({ ...account, partyName: 'شركة السند' }).partyName,
    ).toBe('شركة السند');
    expect(
      createFinanceAccountSchema.safeParse({
        ...account,
        transactionId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
  });
  it('allows zero fixed fees but rejects negative and malformed integers', () => {
    expect(createFinanceAccountSchema.safeParse({ ...account, totalAmount: '0' }).success).toBe(
      true,
    );
    for (const totalAmount of ['-1', '1.5', 'oops', '9223372036854775808'])
      expect(createFinanceAccountSchema.safeParse({ ...account, totalAmount }).success).toBe(false);
  });
  it('rejects reassignment and requires an edit version', () => {
    expect(
      updateFinanceAccountSchema.safeParse({ title: 'أتعاب', totalAmount: '50000' }).success,
    ).toBe(false);
    expect(
      updateFinanceAccountSchema.safeParse({
        title: 'أتعاب',
        totalAmount: '50000',
        version: 0,
        clientId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
  });
  it('distinguishes received payments from recoverable expenses', () => {
    expect(createFinanceMovementSchema.parse(payment).billable).toBe(false);
    expect(createFinanceMovementSchema.safeParse({ ...payment, method: undefined }).success).toBe(
      false,
    );
    expect(createFinanceMovementSchema.safeParse({ ...payment, billable: true }).success).toBe(
      false,
    );
    expect(
      createFinanceMovementSchema.safeParse({ ...payment, category: 'COURT_FEE' }).success,
    ).toBe(false);
    const expense = { ...payment, kind: 'EXPENSE', method: undefined, category: 'COURT_FEE' };
    expect(createFinanceMovementSchema.parse(expense).billable).toBe(false);
    expect(createFinanceMovementSchema.safeParse({ ...expense, reference: 'bank' }).success).toBe(
      false,
    );
  });
  it('requires positive money and a meaningful correction reason', () => {
    for (const amount of ['0', '-1', '1.5', 'oops'])
      expect(createFinanceMovementSchema.safeParse({ ...payment, amount }).success).toBe(false);
    expect(voidFinanceMovementSchema.safeParse({ reason: '  ' }).success).toBe(false);
  });
  it('accepts real Baghdad day ranges and rejects reversed or nonexistent days', () => {
    expect(
      financeActivityQuerySchema.safeParse({ from: '2026-10-12', to: '2026-10-12' }).success,
    ).toBe(true);
    for (const query of [
      { from: '2026-10-13', to: '2026-10-12' },
      { from: '2026-02-30', to: '2026-10-12' },
      { from: '2026-10-12T00:00:00Z', to: '2026-10-12' },
    ])
      expect(financeActivityQuerySchema.safeParse(query).success).toBe(false);
  });
});
