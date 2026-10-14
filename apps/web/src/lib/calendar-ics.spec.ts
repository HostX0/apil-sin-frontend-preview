import { describe, expect, it } from 'vitest';
import type { CalendarItem } from '@muhami/shared';
import { createCalendarIcs } from './calendar-ics';

const item: CalendarItem = {
  id: 'example',
  source: 'EVENT',
  type: 'APPOINTMENT',
  dateKey: '2026-10-11',
  time: '09:30',
  title: 'اجتماع الموكّل',
  subtitle: null,
  caseId: null,
  caseNumber: null,
  href: '/calendar',
  isDone: false,
};
const range = { from: '2026-10-11', to: '2026-10-12' };
const now = new Date('2026-10-11T00:00:00Z');
describe('authorized calendar export', () => {
  it('converts Baghdad appointments to UTC without changing the intended local time', () => {
    const text = createCalendarIcs([item], range, now);
    expect(text).toContain('DTSTART:20261011T063000Z\r\n');
    expect(text).toContain('DTSTAMP:20261011T000000Z\r\n');
    expect(text).not.toContain('/calendar');
  });
  it('keeps all-day dates and their exclusive next-day boundary', () => {
    expect(createCalendarIcs([{ ...item, time: null }], range, now)).toContain(
      'DTSTART;VALUE=DATE:20261011\r\nDTEND;VALUE=DATE:20261012',
    );
  });
  it('includes only entries within the exported displayed range', () => {
    const text = createCalendarIcs(
      [item, { ...item, id: 'outside', dateKey: '2026-10-13' }],
      range,
      now,
    );
    expect(text).not.toContain('outside');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
  it('escapes event text so multiline input cannot inject calendar properties', () => {
    const text = createCalendarIcs(
      [
        {
          ...item,
          title: 'جلسة\nATTENDEE:evil@example.com',
          subtitle: 'ألف، باء; اختبار, نص\\آخر',
        },
      ],
      range,
      now,
    );
    expect(text).not.toContain('\r\nATTENDEE:');
    expect(text).toContain('\\nATTENDEE:');
    expect(text).toContain('\\;');
    expect(text).toContain('\\,');
    expect(text).toContain('\\\\');
  });
  it('folds Arabic text on UTF-8 boundaries within the RFC 75-octet limit', () => {
    const text = createCalendarIcs([{ ...item, title: 'موعد طويل '.repeat(50) }], range, now);
    for (const line of text.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(text.replace(/\r\n /g, '')).toContain(`SUMMARY:${'موعد طويل '.repeat(50)}`);
  });
});
