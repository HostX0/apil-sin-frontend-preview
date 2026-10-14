/**
 * Locale contract — set once here, read everywhere (Phase 0 §0.5, §0.11).
 *
 * Week starts Sunday; the weekend is Friday–Saturday. Every "this week",
 * calendar grid and deadline calculation in the product reads these constants;
 * no module may hardcode its own week logic.
 *
 * Dates are stored UTC and rendered Asia/Baghdad. Baghdad is UTC+3 with no DST,
 * which is why fixed-offset arithmetic below is safe — it would not be elsewhere.
 */

export const APP_TIMEZONE = 'Asia/Baghdad';
export const APP_LOCALE = 'ar-IQ';

/** 0 = Sunday … 6 = Saturday */
export const WEEK_START_DAY = 0;
export const WEEKEND_DAYS: readonly number[] = [5, 6]; // Friday, Saturday

export const WEEKDAY_AR: readonly string[] = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const WEEKDAY_SHORT_AR: readonly string[] = [
  'أحد',
  'إثن',
  'ثلا',
  'أرب',
  'خمي',
  'جمع',
  'سبت',
];

export const MONTH_AR: readonly string[] = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];

export function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.includes(date.getDay());
}

/** A calendar day key in Baghdad time: "2025-08-12". The join key for all calendar UI. */
export function toBaghdadDateKey(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Inclusive [start, end) UTC bounds of a Baghdad calendar day. */
export function baghdadDayBounds(dateKey: string): { start: Date; end: Date } {
  // Baghdad is a fixed UTC+3 offset (no daylight saving), so this is exact.
  const start = new Date(`${dateKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Sunday→Saturday bounds of the week containing `dateKey`, as UTC instants. */
export function baghdadWeekBounds(dateKey: string): { start: Date; end: Date } {
  const { start: dayStart } = baghdadDayBounds(dateKey);
  const weekdayName = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
  }).format(dayStart);
  const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayIndex = Math.max(0, order.indexOf(weekdayName));

  const start = new Date(dayStart.getTime() - dayIndex * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Add N days, skipping weekends when `basis` is 'working'.
 *
 * ⚖️ Deliberately NOT holiday-aware, and deliberately not seeded with any
 * statutory period. Iraqi appeal/cassation periods are entered by the office's
 * lawyer as DeadlineRule rows with a statute reference (Phase 0 §0.10). Shipping
 * a guessed limitation period would expose users to professional negligence.
 */
export function addDays(
  from: Date,
  days: number,
  basis: 'calendar' | 'working' = 'calendar',
): Date {
  if (basis === 'calendar') {
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const result = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

/** "الأحد ١٢ آب ٢٠٢٥" — the canonical long date used in headers and PDFs. */
export function formatLongDateAr(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayIndex = Math.max(0, order.indexOf(get('weekday')));
  const monthIndex = Math.max(0, Number.parseInt(get('month'), 10) - 1);

  return `${WEEKDAY_AR[weekdayIndex]} ${Number.parseInt(get('day'), 10)} ${MONTH_AR[monthIndex]} ${get('year')}`;
}
