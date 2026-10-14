import { describe, expect, it } from 'vitest';
import {
  CURRENCY_DECIMALS,
  formatMoney,
  money,
  parseMoneyInput,
  sumMinorUnits,
  toMinorUnits,
} from './iqd';

/**
 * ADR-004 in executable form.
 *
 * A ledger that drifts by a fraction of a dinar destroys trust permanently, and
 * no amount of later correction restores it. These tests exist so a change that
 * reintroduces floating point fails loudly.
 */

describe('currency contract', () => {
  it('treats IQD as having no subunit', () => {
    // The fils is obsolete: one minor unit is one dinar.
    expect(CURRENCY_DECIMALS.IQD).toBe(0);
  });
});

describe('parseMoneyInput', () => {
  it('parses a plain amount', () => {
    expect(parseMoneyInput('12000000')).toBe(12_000_000n);
  });

  it('ignores thousands separators, Latin and Arabic', () => {
    expect(parseMoneyInput('12,000,000')).toBe(12_000_000n);
    expect(parseMoneyInput('12٬000٬000')).toBe(12_000_000n);
    expect(parseMoneyInput('12 000 000')).toBe(12_000_000n);
  });

  it('parses Arabic-Indic digits', () => {
    expect(parseMoneyInput('١٢٠٠٠٠٠٠')).toBe(12_000_000n);
  });

  it('accepts a trailing .00 on a zero-decimal currency', () => {
    expect(parseMoneyInput('250000.00')).toBe(250_000n);
  });

  it('refuses to silently discard significant digits', () => {
    // Truncating here is exactly how ledgers start to drift.
    expect(() => parseMoneyInput('250000.50')).toThrow('MONEY_TOO_PRECISE');
  });

  it('rejects non-numeric input rather than coercing it', () => {
    expect(() => parseMoneyInput('abc')).toThrow('MONEY_NOT_NUMERIC');
    expect(() => parseMoneyInput('12,00x')).toThrow('MONEY_NOT_NUMERIC');
    expect(() => parseMoneyInput('')).toThrow('MONEY_EMPTY');
  });

  it('handles negative amounts, for credit notes', () => {
    expect(parseMoneyInput('-500000')).toBe(-500_000n);
  });

  it('survives values beyond Number.MAX_SAFE_INTEGER', () => {
    // 9,007,199,254,740,993 is 2^53 + 1 — the first integer a double cannot
    // represent. A `number`-based implementation returns ...992 here.
    const huge = '9007199254740993';
    expect(parseMoneyInput(huge).toString()).toBe(huge);
  });
});

describe('formatMoney', () => {
  it('groups thousands and appends the Iraqi dinar symbol', () => {
    expect(formatMoney(12_000_000n)).toBe('12,000,000 د.ع');
  });

  it('omits the symbol on request', () => {
    expect(formatMoney(12_000_000n, 'IQD', { withSymbol: false })).toBe('12,000,000');
  });

  it('formats zero and small values', () => {
    expect(formatMoney(0n, 'IQD', { withSymbol: false })).toBe('0');
    expect(formatMoney(999n, 'IQD', { withSymbol: false })).toBe('999');
    expect(formatMoney(1000n, 'IQD', { withSymbol: false })).toBe('1,000');
  });

  it('formats negative values with the sign outside the digits', () => {
    expect(formatMoney(-250_000n, 'IQD', { withSymbol: false })).toBe('-250,000');
  });

  it('round-trips through parseMoneyInput', () => {
    for (const value of [0n, 1n, 999n, 1_000n, 12_345_678n, -500_000n]) {
      expect(parseMoneyInput(formatMoney(value, 'IQD', { withSymbol: false }))).toBe(value);
    }
  });
});

describe('the wire format', () => {
  it('serialises as a decimal string, never a number', () => {
    const dto = money(12_000_000n);
    expect(dto).toEqual({ amount: '12000000', currency: 'IQD' });
    expect(typeof dto.amount).toBe('string');
  });

  it('round-trips exactly at a magnitude that would break a JSON number', () => {
    const exact = 9_007_199_254_740_993n;
    expect(toMinorUnits(money(exact))).toBe(exact);
  });
});

describe('sumMinorUnits', () => {
  it('adds without drift', () => {
    expect(sumMinorUnits([250_000n, 250_000n, 500_000n])).toBe(1_000_000n);
  });

  it('handles an empty set', () => {
    expect(sumMinorUnits([])).toBe(0n);
  });

  it('nets credit notes against receipts', () => {
    expect(sumMinorUnits([1_000_000n, -250_000n])).toBe(750_000n);
  });

  it('stays exact over many additions where floats would not', () => {
    // 0.1 + 0.2 !== 0.3 is the classic; the integer equivalent must hold.
    const values = Array.from({ length: 10_000 }, () => 333_333n);
    expect(sumMinorUnits(values)).toBe(3_333_330_000n);
  });
});
