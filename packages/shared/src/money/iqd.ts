import { foldArabicDigits } from '../text/arabic';

/**
 * ADR-004 — Money representation.
 *
 * Money is NEVER a float and NEVER a JS `number` in transit. It is a `bigint`
 * count of minor units, serialised over the wire as a decimal string.
 *
 * The Iraqi dinar has no circulating subunit (the fils is obsolete), so IQD has
 * zero decimal places and one minor unit == one dinar. The `decimals` indirection
 * exists so that adding USD in Phase 18 is a configuration change, not a rewrite
 * of every financial calculation.
 */

export const SUPPORTED_CURRENCIES = ['IQD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_DECIMALS: Record<Currency, number> = { IQD: 0 };

export const DEFAULT_CURRENCY: Currency = 'IQD';

/** A money value as it crosses the API boundary. */
export interface MoneyDto {
  /** Minor units as a decimal string, e.g. "12000000". Never a number — JSON floats lose precision. */
  amount: string;
  currency: Currency;
}

export function money(minorUnits: bigint, currency: Currency = DEFAULT_CURRENCY): MoneyDto {
  return { amount: minorUnits.toString(), currency };
}

export function toMinorUnits(dto: MoneyDto): bigint {
  return BigInt(dto.amount);
}

/**
 * Parse human input ("12,000,000" / "١٢٠٠٠٠٠٠" / "12000000.00") into minor units.
 * Throws on anything ambiguous — silently coercing money input is how ledgers drift.
 */
export function parseMoneyInput(raw: string, currency: Currency = DEFAULT_CURRENCY): bigint {
  const decimals = CURRENCY_DECIMALS[currency];
  const cleaned = foldArabicDigits(raw)
    .replace(/[\s,٬]/g, '')
    .trim();

  if (cleaned.length === 0) throw new Error('MONEY_EMPTY');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) throw new Error('MONEY_NOT_NUMERIC');

  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [wholeRaw, fracRaw = ''] = unsigned.split('.');
  const whole = wholeRaw ?? '0';

  if (fracRaw.length > decimals && /[1-9]/.test(fracRaw.slice(decimals))) {
    // Refuse to silently discard significant digits.
    throw new Error('MONEY_TOO_PRECISE');
  }

  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');
  const magnitude = BigInt(whole + frac);
  return negative ? -magnitude : magnitude;
}

/**
 * Format for display. Grouping uses the ar-IQ convention; the caller decides
 * whether digits render Western or Arabic-Indic (a user preference).
 */
export function formatMoney(
  minorUnits: bigint,
  currency: Currency = DEFAULT_CURRENCY,
  options: { withSymbol?: boolean } = {},
): string {
  const decimals = CURRENCY_DECIMALS[currency];
  const negative = minorUnits < 0n;
  const digits = (negative ? -minorUnits : minorUnits).toString().padStart(decimals + 1, '0');

  const whole = decimals === 0 ? digits : digits.slice(0, digits.length - decimals);
  const frac = decimals === 0 ? '' : digits.slice(digits.length - decimals);

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = frac ? `${grouped}.${frac}` : grouped;
  const signed = negative ? `-${body}` : body;

  return options.withSymbol === false ? signed : `${signed} ${CURRENCY_LABEL_AR[currency]}`;
}

export const CURRENCY_LABEL_AR: Record<Currency, string> = { IQD: 'د.ع' };

/** Safe summation — exists so no call site is tempted to use `reduce` over numbers. */
export function sumMinorUnits(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const v of values) total += v;
  return total;
}
