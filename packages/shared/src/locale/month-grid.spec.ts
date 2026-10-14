import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  addMonths,
  buildMonthGrid,
  buildWeekGrid,
  daysInMonth,
  gridRange,
  makeDateKey,
  parseDateKey,
} from './month-grid';
import { WEEKEND_DAYS, WEEK_START_DAY } from './calendar';

/**
 * Calendar arithmetic is the classic source of bugs that only appear in
 * February, at month boundaries, or in the one timezone nobody tested. These
 * tests exist to make those appear at commit time instead.
 */

describe('locale contract', () => {
  it('starts the week on Sunday and treats Friday–Saturday as the weekend', () => {
    // Every "this week", grid and deadline calculation reads these constants.
    expect(WEEK_START_DAY).toBe(0);
    expect([...WEEKEND_DAYS].sort()).toEqual([5, 6]);
  });
});

describe('buildMonthGrid', () => {
  it('always returns six full weeks so the grid height never changes', () => {
    for (const month of ['2025-01-01', '2025-02-01', '2025-08-01', '2024-02-01']) {
      expect(buildMonthGrid(month, '2025-08-12')).toHaveLength(42);
    }
  });

  it('starts on a Sunday and ends on a Saturday', () => {
    const days = buildMonthGrid('2025-08-01', '2025-08-12');
    expect(days[0]!.weekday).toBe(0);
    expect(days[41]!.weekday).toBe(6);
  });

  it('marks borrowed leading and trailing days as outside the month', () => {
    // 1 August 2025 is a Friday, so the grid borrows Sun 27 – Thu 31 July.
    const days = buildMonthGrid('2025-08-01', '2025-08-12');
    expect(days[0]!.dateKey).toBe('2025-07-27');
    expect(days[0]!.inMonth).toBe(false);

    const first = days.find((day) => day.dateKey === '2025-08-01');
    expect(first?.inMonth).toBe(true);
    expect(first?.weekday).toBe(5); // Friday
  });

  it('contains every day of the month exactly once', () => {
    const days = buildMonthGrid('2025-08-01', '2025-08-12').filter((day) => day.inMonth);
    expect(days).toHaveLength(31);
    expect(new Set(days.map((day) => day.dateKey)).size).toBe(31);
  });

  it('handles a leap February', () => {
    const days = buildMonthGrid('2024-02-01', '2024-02-15').filter((day) => day.inMonth);
    expect(days).toHaveLength(29);
    expect(days.at(-1)?.dateKey).toBe('2024-02-29');
  });

  it('handles a non-leap February', () => {
    const days = buildMonthGrid('2025-02-01', '2025-02-15').filter((day) => day.inMonth);
    expect(days).toHaveLength(28);
  });

  it('flags the weekend on Friday and Saturday, not Saturday and Sunday', () => {
    const days = buildMonthGrid('2025-08-01', '2025-08-12');
    const friday = days.find((day) => day.dateKey === '2025-08-01');
    const saturday = days.find((day) => day.dateKey === '2025-08-02');
    const sunday = days.find((day) => day.dateKey === '2025-08-03');

    expect(friday?.isWeekend).toBe(true);
    expect(saturday?.isWeekend).toBe(true);
    expect(sunday?.isWeekend).toBe(false);
  });

  it('marks exactly one day as today when today falls inside the grid', () => {
    const days = buildMonthGrid('2025-08-01', '2025-08-12');
    expect(days.filter((day) => day.isToday)).toHaveLength(1);
  });

  it('marks no day as today when today falls outside the grid', () => {
    const days = buildMonthGrid('2025-08-01', '2030-01-01');
    expect(days.some((day) => day.isToday)).toBe(false);
  });

  it('produces days in strictly ascending order with no gaps', () => {
    const days = buildMonthGrid('2025-08-01', '2025-08-12');
    for (let index = 1; index < days.length; index += 1) {
      expect(days[index]!.dateKey > days[index - 1]!.dateKey).toBe(true);
      expect(addDaysToKey(days[index - 1]!.dateKey, 1)).toBe(days[index]!.dateKey);
    }
  });
});

describe('buildWeekGrid', () => {
  it('returns the Sunday-to-Saturday week containing the date', () => {
    // 2025-08-12 is a Tuesday.
    const week = buildWeekGrid('2025-08-12', '2025-08-12');
    expect(week).toHaveLength(7);
    expect(week[0]!.dateKey).toBe('2025-08-10'); // Sunday
    expect(week[6]!.dateKey).toBe('2025-08-16'); // Saturday
  });

  it('keeps a Sunday as the first day of its own week', () => {
    const week = buildWeekGrid('2025-08-10', '2025-08-10');
    expect(week[0]!.dateKey).toBe('2025-08-10');
  });

  it('crosses a month boundary correctly', () => {
    const week = buildWeekGrid('2025-08-01', '2025-08-01');
    expect(week[0]!.dateKey).toBe('2025-07-27');
    expect(week[6]!.dateKey).toBe('2025-08-02');
  });
});

describe('date arithmetic', () => {
  it('adds months across a year boundary', () => {
    expect(addMonths('2025-12-01', 1)).toBe('2026-01-01');
    expect(addMonths('2025-01-01', -1)).toBe('2024-12-01');
    expect(addMonths('2025-08-01', 12)).toBe('2026-08-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysToKey('2025-08-31', 1)).toBe('2025-09-01');
    expect(addDaysToKey('2025-01-01', -1)).toBe('2024-12-31');
    expect(addDaysToKey('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysToKey('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('reports days in month, including leap years', () => {
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 8)).toBe(31);
    expect(daysInMonth(2025, 4)).toBe(30);
  });

  it('round-trips a date key', () => {
    const parts = parseDateKey('2025-08-09');
    expect(parts).toEqual({ year: 2025, month: 8, day: 9 });
    expect(makeDateKey(parts.year, parts.month, parts.day)).toBe('2025-08-09');
  });
});

describe('gridRange', () => {
  it('spans the first and last cell, so one request covers the whole view', () => {
    const range = gridRange(buildMonthGrid('2025-08-01', '2025-08-12'));
    expect(range.from).toBe('2025-07-27');
    expect(range.to).toBe('2025-09-06');
  });
});
