import { APP_NAME_EN, addDaysToKey, type CalendarItem } from '@/lib/ui-shared';
import { APP_SLUG as CALENDAR_UID_NAMESPACE } from '@muhami/shared';

/** Export only the authorized calendar rows already returned to this browser. */
export function createCalendarIcs(
  items: CalendarItem[],
  range: { from: string; to: string },
  now = new Date(),
): string {
  const stamp = utcDate(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME_EN}//Calendar//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(APP_NAME_EN)}`,
  ];
  for (const item of items) {
    if (item.dateKey < range.from || item.dateKey > range.to) continue;
    lines.push(
      'BEGIN:VEVENT',
      // Keep existing exported event identifiers stable when the platform brand changes.
      `UID:${item.source.toLowerCase()}-${safeUid(item.id)}@${CALENDAR_UID_NAMESPACE}`,
      `DTSTAMP:${stamp}`,
    );
    if (item.time)
      lines.push(`DTSTART:${utcDate(new Date(`${item.dateKey}T${item.time}:00+03:00`))}`);
    else
      lines.push(
        `DTSTART;VALUE=DATE:${item.dateKey.replaceAll('-', '')}`,
        `DTEND;VALUE=DATE:${addDaysToKey(item.dateKey, 1).replaceAll('-', '')}`,
      );
    lines.push(`SUMMARY:${escapeText(item.title)}`);
    if (item.subtitle) lines.push(`DESCRIPTION:${escapeText(item.subtitle)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

function utcDate(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}
function safeUid(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}
function foldLine(value: string): string {
  const encoder = new TextEncoder();
  let output = '',
    bytes = 0;
  for (const character of value) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      output += '\r\n ';
      bytes = 1;
    }
    output += character;
    bytes += length;
  }
  return output;
}
