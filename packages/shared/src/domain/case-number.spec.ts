import { describe, expect, it } from 'vitest';
import {
  caseNumberSearchKey,
  formatCaseNumber,
  isValidCaseYear,
  parseCaseNumberQuery,
} from './case-number';

describe('formatCaseNumber', () => {
  it('renders the default Iraqi template', () => {
    expect(formatCaseNumber({ serial: 1234, typeCode: 'ب', year: 2025 })).toBe('1234/ب/2025');
  });

  it('honours an office-configured template (D-02 remains changeable)', () => {
    expect(
      formatCaseNumber({ serial: 1234, typeCode: 'ب', year: 2025 }, '{year}/{typeCode}/{serial}'),
    ).toBe('2025/ب/1234');
  });
});

describe('parseCaseNumberQuery', () => {
  it('reads the full number', () => {
    const parsed = parseCaseNumberQuery('1234/ب/2025');
    expect(parsed).toMatchObject({ serial: 1234, typeCode: 'ب', year: 2025 });
  });

  it('reads Arabic-Indic digits', () => {
    const parsed = parseCaseNumberQuery('١٢٣٤/ب/٢٠٢٥');
    expect(parsed).toMatchObject({ serial: 1234, typeCode: 'ب', year: 2025 });
  });

  it('reads a bare serial', () => {
    const parsed = parseCaseNumberQuery('1234');
    expect(parsed.serial).toBe(1234);
    expect(parsed.looksLikeCaseNumber).toBe(true);
  });

  it('reads serial and type without a year', () => {
    expect(parseCaseNumberQuery('1234/ب')).toMatchObject({ serial: 1234, typeCode: 'ب' });
  });

  it('reads the year-first order some offices write', () => {
    const parsed = parseCaseNumberQuery('2025/1234');
    expect(parsed.year).toBe(2025);
    expect(parsed.serial).toBe(1234);
  });

  it('treats a four-digit value outside the year window as a serial', () => {
    // 9999 is not a plausible year, so it must not be swallowed as one.
    expect(parseCaseNumberQuery('9999').serial).toBe(9999);
    expect(parseCaseNumberQuery('9999').year).toBeUndefined();
  });

  it('accepts dashes and spaces as separators', () => {
    expect(parseCaseNumberQuery('1234 - ب - 2025')).toMatchObject({
      serial: 1234,
      typeCode: 'ب',
      year: 2025,
    });
  });

  it('does not mistake a personal name for a case number', () => {
    expect(parseCaseNumberQuery('أحمد الجبوري').serial).toBeUndefined();
  });

  it('handles empty input', () => {
    expect(parseCaseNumberQuery('').looksLikeCaseNumber).toBe(false);
    expect(parseCaseNumberQuery('   ').looksLikeCaseNumber).toBe(false);
  });
});

describe('caseNumberSearchKey', () => {
  it('is order-independent and digit-style independent', () => {
    expect(caseNumberSearchKey({ serial: 1234, typeCode: 'ب', year: 2025 })).toBe('1234 ب 2025');
  });
});

describe('isValidCaseYear', () => {
  it('accepts plausible years and rejects the rest', () => {
    expect(isValidCaseYear(2025)).toBe(true);
    expect(isValidCaseYear(1949)).toBe(false);
    expect(isValidCaseYear(2201)).toBe(false);
    expect(isValidCaseYear(2025.5)).toBe(false);
  });
});
