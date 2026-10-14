import { describe, expect, it } from 'vitest';
import { normalizeArabic } from '../text/arabic';
import {
  COURT_CATALOG_VERSION,
  FEDERAL_APPEAL_COURTS,
  IRAQ_GOVERNORATES,
  SEED_COURTS,
  createCourtSchema,
  listCourtsQuerySchema,
} from './court';

describe('court catalog', () => {
  it('covers every federal appellate presidency exactly once', () => {
    expect(FEDERAL_APPEAL_COURTS).toHaveLength(16);

    const names = FEDERAL_APPEAL_COURTS.map((court) => normalizeArabic(court.name));
    expect(new Set(names).size).toBe(names.length);
    expect(FEDERAL_APPEAL_COURTS.every((court) => court.type === 'APPEAL')).toBe(true);
  });

  it('contains no duplicate legal court identity', () => {
    const keys = SEED_COURTS.map(
      (court) =>
        `${court.jurisdiction ?? 'FEDERAL'}:${court.governorate}:${court.type}:${normalizeArabic(court.name)}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses canonical governorate labels for every bundled court', () => {
    const governorates = new Set<string>(IRAQ_GOVERNORATES);
    expect(SEED_COURTS.every((court) => governorates.has(court.governorate))).toBe(true);
  });

  it('accepts governorate filtering in the court list contract', () => {
    expect(listCourtsQuerySchema.parse({ governorate: 'نينوى' })).toEqual({
      governorate: 'نينوى',
    });
  });

  it('accepts court landlines instead of forcing a client-mobile format', () => {
    const parsed = createCourtSchema.parse({
      name: 'محكمة اختبار',
      type: 'FIRST_INSTANCE',
      jurisdiction: 'FEDERAL',
      phone: '01-1234567',
    });
    expect(parsed.phone).toBe('01-1234567');
  });

  it('keeps a dated catalog version so sync behaviour is traceable', () => {
    expect(COURT_CATALOG_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
