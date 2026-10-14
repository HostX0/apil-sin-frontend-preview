import { describe, expect, it } from 'vitest';
import { moneyStringSchema } from './common';
import { recordCasePaymentSchema, setCaseFeeSchema } from './finance';

describe('financial integer validation', () => {
  it('accepts exact integers beyond JavaScript precision within PostgreSQL BIGINT bounds', () => {
    for (const amount of ['9007199254740993', '9223372036854775807', '-9223372036854775808'])
      expect(moneyStringSchema.parse(amount)).toBe(amount);
  });
  it('rejects values outside PostgreSQL BIGINT before they reach the database', () => {
    for (const amount of ['9223372036854775808', '-9223372036854775809', '9'.repeat(200)])
      expect(moneyStringSchema.safeParse(amount).success).toBe(false);
  });
  it('returns validation failures for malformed fee and payment amounts without throwing', () => {
    for (const amount of ['1.5', 'abc', '', 'Infinity', '1e5']) {
      expect(setCaseFeeSchema.safeParse({ totalAmount: amount }).success).toBe(false);
      expect(
        recordCasePaymentSchema.safeParse({
          amount,
          method: 'CASH',
          paidAt: '2026-10-11',
          idempotencyKey: 'validation-payment',
        }).success,
      ).toBe(false);
    }
  });
  it('permits free cases while forbidding negative fees and zero payments', () => {
    expect(setCaseFeeSchema.safeParse({ totalAmount: '0' }).success).toBe(true);
    expect(setCaseFeeSchema.safeParse({ totalAmount: '-1' }).success).toBe(false);
    expect(
      recordCasePaymentSchema.safeParse({
        amount: '0',
        method: 'CASH',
        paidAt: '2026-10-11',
        idempotencyKey: 'zero-payment',
      }).success,
    ).toBe(false);
  });
  it('requires the agreement and its version together for edits', () => {
    const agreementId = '11111111-1111-4111-8111-111111111111';
    expect(setCaseFeeSchema.safeParse({ totalAmount: '100', agreementId }).success).toBe(false);
    expect(setCaseFeeSchema.safeParse({ totalAmount: '100', version: 0 }).success).toBe(false);
    expect(
      setCaseFeeSchema.safeParse({ totalAmount: '100', agreementId, version: 0 }).success,
    ).toBe(true);
  });
});
