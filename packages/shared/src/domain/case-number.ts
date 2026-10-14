import { foldArabicDigits } from '../text/arabic';

/**
 * Iraqi case number — Phase 0 §0.3.
 *
 * Stored as four components, never as one free-text string: free-text case
 * numbers destroy search, sorting, duplicate detection and every report.
 *
 * D-02 (unconfirmed): default display template is `{serial}/{typeCode}/{year}`
 * → 1234/ب/2025. The template is office-configurable, so switching to
 * year-first costs a settings change, not a migration.
 */

export interface CaseNumberParts {
  serial: number;
  typeCode: string;
  year: number;
}

export const DEFAULT_CASE_NUMBER_TEMPLATE = '{serial}/{typeCode}/{year}';

/** Seed type codes (رموز الدعاوى). Office-editable; these are defaults only. */
export const CASE_TYPE_CODES: ReadonlyArray<{ code: string; ar: string }> = [
  { code: 'ب', ar: 'بداءة' },
  { code: 'ج', ar: 'جنايات' },
  { code: 'جنح', ar: 'جنح' },
  { code: 'تح', ar: 'تحقيق' },
  { code: 'ش', ar: 'أحوال شخصية' },
  { code: 'ع', ar: 'عمل' },
  { code: 'تن', ar: 'تنفيذ' },
  { code: 'إد', ar: 'إداري' },
  { code: 'س', ar: 'استئناف' },
  { code: 'تم', ar: 'تمييز' },
  { code: 'عق', ar: 'عقاري' },
];

const MIN_YEAR = 1950;
const MAX_YEAR = 2200;

export function formatCaseNumber(
  parts: CaseNumberParts,
  template: string = DEFAULT_CASE_NUMBER_TEMPLATE,
): string {
  return template
    .replace('{serial}', String(parts.serial))
    .replace('{typeCode}', parts.typeCode)
    .replace('{year}', String(parts.year));
}

/**
 * Canonical search key. A user typing `1234`, `1234/ب`, `١٢٣٤/ب/٢٠٢٥` or
 * `2025/1234` must all reach the same case, so the key is order-independent
 * and digit-style independent.
 */
export function caseNumberSearchKey(parts: CaseNumberParts): string {
  return `${parts.serial} ${parts.typeCode} ${parts.year}`;
}

export type CaseNumberQuery = {
  serial?: number;
  typeCode?: string;
  year?: number;
  /** True when the input looked like a case number at all. */
  looksLikeCaseNumber: boolean;
};

/**
 * Best-effort parse of whatever the user typed into the one search box.
 * Deliberately permissive — this feeds a filter, not a write.
 */
export function parseCaseNumberQuery(raw: string): CaseNumberQuery {
  const cleaned = foldArabicDigits(raw).trim();
  if (cleaned.length === 0) return { looksLikeCaseNumber: false };

  const segments = cleaned.split(/[/\\\-\s]+/).filter((s) => s.length > 0);
  if (segments.length === 0) return { looksLikeCaseNumber: false };

  const result: CaseNumberQuery = { looksLikeCaseNumber: false };

  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      const value = Number.parseInt(segment, 10);
      // A 4-digit value inside the plausible year window is a year; anything
      // else numeric is the serial. Ambiguity resolves toward serial because a
      // serial-only search is far more common than a year-only search.
      if (
        segment.length === 4 &&
        value >= MIN_YEAR &&
        value <= MAX_YEAR &&
        result.year === undefined
      ) {
        result.year = value;
      } else if (result.serial === undefined) {
        result.serial = value;
      }
      result.looksLikeCaseNumber = true;
    } else if (result.typeCode === undefined) {
      result.typeCode = segment;
      result.looksLikeCaseNumber = true;
    }
  }

  return result;
}

export function isValidCaseYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}
