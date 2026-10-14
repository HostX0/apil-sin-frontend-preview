import { foldArabicDigits } from './arabic';

/**
 * Iraqi mobile number handling.
 *
 * Accepted on input: 07XXXXXXXXX · +9647XXXXXXXXX · 009647XXXXXXXXX · 9647XXXXXXXXX,
 * with or without spaces/dashes, in Western or Arabic-Indic digits.
 *
 * Stored canonically as E.164 (+9647XXXXXXXXX) so that duplicate detection,
 * SMS/WhatsApp delivery (Phase 18) and search all agree on one representation.
 */

const IRAQ_CC = '964';

/** Iraqi mobile prefixes after the country code, i.e. 7XX. */
const MOBILE_PREFIX = /^7[3-9]\d{8}$/;

export type PhoneParseResult =
  | { ok: true; e164: string; national: string }
  | { ok: false; reason: 'EMPTY' | 'NOT_NUMERIC' | 'NOT_IRAQI_MOBILE' };

function stripToDigits(raw: string): string {
  return foldArabicDigits(raw).replace(/[^\d+]/g, '');
}

export function parseIraqiMobile(raw: string | null | undefined): PhoneParseResult {
  if (!raw || raw.trim().length === 0) return { ok: false, reason: 'EMPTY' };

  let s = stripToDigits(raw);
  if (s.length === 0) return { ok: false, reason: 'NOT_NUMERIC' };

  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00')) s = s.slice(2);
  if (s.startsWith(IRAQ_CC)) s = s.slice(IRAQ_CC.length);
  // National trunk prefix: 07xx → 7xx
  if (s.startsWith('0')) s = s.slice(1);

  if (!MOBILE_PREFIX.test(s)) return { ok: false, reason: 'NOT_IRAQI_MOBILE' };

  return { ok: true, e164: `+${IRAQ_CC}${s}`, national: `0${s}` };
}

/** Canonical storage form, or null when unparseable. */
export function toE164(raw: string | null | undefined): string | null {
  const result = parseIraqiMobile(raw);
  return result.ok ? result.e164 : null;
}

/** Display form: 0770 123 4567 */
export function formatIraqiMobile(e164: string | null | undefined): string {
  if (!e164) return '';
  const parsed = parseIraqiMobile(e164);
  if (!parsed.ok) return e164;
  const n = parsed.national; // 07701234567
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

/** Carrier hint, useful for SMS routing in Phase 18. Best-effort, never authoritative. */
export function iraqiCarrierHint(e164: string): 'ZAIN' | 'ASIACELL' | 'KOREK' | 'OTHER' {
  const parsed = parseIraqiMobile(e164);
  if (!parsed.ok) return 'OTHER';
  const prefix = parsed.national.slice(0, 4);
  if (['0780', '0781', '0782', '0783', '0784'].includes(prefix)) return 'ZAIN';
  if (['0770', '0771', '0772', '0773', '0774'].includes(prefix)) return 'ASIACELL';
  if (['0750', '0751', '0752', '0753', '0754'].includes(prefix)) return 'KOREK';
  return 'OTHER';
}
