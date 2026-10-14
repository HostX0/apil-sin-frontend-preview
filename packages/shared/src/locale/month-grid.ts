import { WEEKEND_DAYS, baghdadDayBounds, toBaghdadDateKey } from './calendar';

/**
 * Calendar grid construction.
 *
 * Pure date arithmetic, deliberately not a calendar library: the month grid has
 * to be RTL-native, and every heavyweight option assumes a left-to-right week
 * that then has to be fought. Building the day list ourselves and letting
 * `dir="rtl"` mirror the CSS grid is both smaller and correct.
 *
 * Weeks start Sunday and the weekend is Friday–Saturday (Phase 0 §0.5).
 */

export interface CalendarDay {
  /** "2025-08-12" — the join key shared with the API. */
  dateKey: string;
  dayOfMonth: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  isWeekend: boolean;
  /** False for the leading/trailing days borrowed from adjacent months. */
  inMonth: boolean;
  isToday: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parts of a "YYYY-MM-DD" key, without going through a Date. */
export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map((part) => Number.parseInt(part, 10));
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
}

export function makeDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Sunday. Computed in UTC so no local timezone can shift it. */
function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addMonths(dateKey: string, delta: number): string {
  const { year, month } = parseDateKey(dateKey);
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return makeDateKey(nextYear, nextMonth, 1);
}

export function addDaysToKey(dateKey: string, delta: number): string {
  const { start } = baghdadDayBounds(dateKey);
  return toBaghdadDateKey(new Date(start.getTime() + delta * DAY_MS));
}

/**
 * Six full weeks covering the month.
 *
 * Always 42 cells so the grid does not change height between months — a
 * shifting layout makes the whole screen feel unstable when paging.
 */
export function buildMonthGrid(dateKey: string, todayKey: string): CalendarDay[] {
  const { year, month } = parseDateKey(dateKey);
  const firstWeekday = weekdayOf(year, month, 1);
  const total = daysInMonth(year, month);

  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const previousTotal = daysInMonth(previous.year, previous.month);

  const days: CalendarDay[] = [];

  // Leading days from the previous month.
  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    const day = previousTotal - index;
    days.push(makeDay(previous.year, previous.month, day, false, todayKey));
  }

  for (let day = 1; day <= total; day += 1) {
    days.push(makeDay(year, month, day, true, todayKey));
  }

  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  let trailing = 1;
  while (days.length < 42) {
    days.push(makeDay(next.year, next.month, trailing, false, todayKey));
    trailing += 1;
  }

  return days;
}

/** The Sunday→Saturday week containing `dateKey`. */
export function buildWeekGrid(dateKey: string, todayKey: string): CalendarDay[] {
  const { year, month, day } = parseDateKey(dateKey);
  const weekday = weekdayOf(year, month, day);
  const start = addDaysToKey(dateKey, -weekday);

  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToKey(start, index);
    const parts = parseDateKey(key);
    return makeDay(parts.year, parts.month, parts.day, true, todayKey);
  });
}

function makeDay(
  year: number,
  month: number,
  day: number,
  inMonth: boolean,
  todayKey: string,
): CalendarDay {
  const dateKey = makeDateKey(year, month, day);
  const weekday = weekdayOf(year, month, day);

  return {
    dateKey,
    dayOfMonth: day,
    weekday,
    isWeekend: WEEKEND_DAYS.includes(weekday),
    inMonth,
    isToday: dateKey === todayKey,
  };
}

/** Inclusive range covering the whole grid, for one API request per view. */
export function gridRange(days: CalendarDay[]): { from: string; to: string } {
  return {
    from: days[0]?.dateKey ?? '',
    to: days[days.length - 1]?.dateKey ?? '',
  };
}
