'use client';

import { Download } from 'lucide-react';
import { APP_SLUG, formatLongDateAr, type CalendarItem } from '@/lib/ui-shared';
import { Button } from '@muhami/ui';
import { createCalendarIcs } from '@/lib/calendar-ics';

export function CalendarExport({
  items,
  from,
  to,
  disabled,
}: {
  items: CalendarItem[];
  from: string;
  to: string;
  disabled: boolean;
}) {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([createCalendarIcs(items, { from, to })], { type: 'text/calendar;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${APP_SLUG}-calendar-${from}-${to}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Leave enough time for the browser to read the local Blob download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <details className="rounded-md border border-line p-3">
      <summary className="cursor-pointer text-sm font-medium text-ink">
        Use events in Google Calendar or Outlook
      </summary>
      <div className="mt-3 space-y-3">
        <ol className="list-inside list-decimal space-y-2 text-sm leading-6 text-ink-muted">
          <li>Choose Month, Week or Day to display the period you want to export.</li>
          <li>Select Download appointments to save the file to your device.</li>
          <li>
            Open the import settings in Google Calendar or Outlook and choose the downloaded file.
          </li>
        </ol>
        <p className="text-xs leading-6 text-ink-subtle">
          The file contains a copy of this period’s appointments. Download a new copy if
          appointments change.
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || items.length === 0}
          onClick={download}
        >
          <Download className="size-4" aria-hidden />
          Download appointments
        </Button>
        <p className="text-xs text-ink-subtle">
          Period: {formatLongDateAr(new Date(`${from}T12:00:00+03:00`))} To{' '}
          {formatLongDateAr(new Date(`${to}T12:00:00+03:00`))}. The file includes appointments you
          have permission to view.
        </p>
      </div>
    </details>
  );
}
