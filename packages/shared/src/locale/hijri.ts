import { APP_TIMEZONE } from './calendar';

/**
 * Hijri display — D-06: display only, never storage.
 *
 * Dates are stored and computed in Gregorian. This module renders a second
 * label for users who read Hijri, and nothing in the system ever parses a Hijri
 * string back into an instant. If a document ever needs Hijri as its *official*
 * date, that is a model change, not a formatter change.
 *
 * Umm al-Qura is the calendar used across Iraq for civil purposes.
 */

const HIJRI_LOCALE = 'ar-SA-u-ca-islamic-umalqura';

export const HIJRI_MONTH_AR: readonly string[] = [
  'محرّم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

/** "١٢ صفر ١٤٤٧ هـ" */
export function formatHijriDate(instant: Date): string {
  try {
    return new Intl.DateTimeFormat(HIJRI_LOCALE, {
      timeZone: APP_TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(instant);
  } catch {
    // Not every runtime ships the Umm al-Qura calendar. Degrade to nothing
    // rather than showing a wrong date next to a legal deadline.
    return '';
  }
}

/** Short form for dense surfaces: "١٢ صفر". */
export function formatHijriShort(instant: Date): string {
  try {
    return new Intl.DateTimeFormat(HIJRI_LOCALE, {
      timeZone: APP_TIMEZONE,
      day: 'numeric',
      month: 'long',
    }).format(instant);
  } catch {
    return '';
  }
}

export function isHijriSupported(): boolean {
  return formatHijriDate(new Date(0)).length > 0;
}
