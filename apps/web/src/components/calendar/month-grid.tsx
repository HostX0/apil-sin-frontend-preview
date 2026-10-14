'use client';

import { useMemo } from 'react';
import {
  EVENT_TYPE_COLOR_TOKEN,
  WEEKDAY_SHORT_AR,
  buildMonthGrid,
  type CalendarDay,
  type CalendarItem,
  type EventType,
} from '@/lib/ui-shared';
import { cn } from '@muhami/ui';

/**
 * Month grid.
 *
 * The whole thing is a plain CSS grid inside a `dir="rtl"` document, so Sunday
 * lands on the right and the week reads right-to-left with no reversal logic.
 * Fighting a heavyweight LTR calendar library into this shape costs more code
 * and still gets the edges wrong.
 *
 * Always 42 cells, so the grid height never changes between months.
 */
export function MonthGrid({
  monthKey,
  todayKey,
  selectedKey,
  items,
  onSelect,
}: {
  monthKey: string;
  todayKey: string;
  selectedKey: string;
  items: CalendarItem[];
  onSelect: (dateKey: string) => void;
}) {
  const days = useMemo(() => buildMonthGrid(monthKey, todayKey), [monthKey, todayKey]);

  /** Distinct event types per day — the coloured indicators from the brief. */
  const indicators = useMemo(() => {
    const byDay = new Map<string, EventType[]>();
    for (const item of items) {
      const existing = byDay.get(item.dateKey) ?? [];
      if (!existing.includes(item.type)) existing.push(item.type);
      byDay.set(item.dateKey, existing);
    }
    return byDay;
  }, [items]);

  const counts = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const item of items) byDay.set(item.dateKey, (byDay.get(item.dateKey) ?? 0) + 1);
    return byDay;
  }, [items]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line pb-1.5">
        {WEEKDAY_SHORT_AR.map((label, index) => (
          <div
            key={label}
            className={cn(
              'text-center text-xs font-medium',
              index >= 5 ? 'text-ink-subtle' : 'text-ink-subtle',
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.dateKey}
            day={day}
            types={indicators.get(day.dateKey) ?? []}
            count={counts.get(day.dateKey) ?? 0}
            isSelected={day.dateKey === selectedKey}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  types,
  count,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  types: EventType[];
  count: number;
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
}) {
  // Three dots plus a "+N" overflow: more than three is unreadable at this size
  // and the exact count is on the day view anyway.
  const visible = types.slice(0, 3);
  const overflow = count - visible.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(day.dateKey)}
      aria-label={`${day.dayOfMonth} — ${count}Event`}
      aria-current={day.isToday ? 'date' : undefined}
      aria-pressed={isSelected}
      className={cn(
        'flex aspect-square flex-col items-center justify-center gap-1 border-b border-s border-line text-sm transition-colors',
        // The last column has no start border, so the grid's outer edge stays clean.
        day.weekday === 6 && 'border-s-0',
        !day.inMonth && 'text-ink-subtle bg-surface-sunken',
        day.inMonth && day.isWeekend && 'bg-surface-sunken/40',
        isSelected && 'bg-brand-subtle',
        'hover:bg-surface-sunken',
      )}
    >
      <span
        className={cn(
          'ltr-numerals flex size-7 items-center justify-center rounded-full tabular-nums',
          day.isToday && 'bg-brand font-bold text-brand-ink',
          !day.isToday && day.inMonth && 'text-ink',
        )}
      >
        {day.dayOfMonth}
      </span>

      <span className="flex h-2 items-center gap-0.5" aria-hidden>
        {visible.map((type) => (
          <span key={type} className={cn('size-1.5 rounded-full', dotClass(type))} />
        ))}
        {overflow > 0 ? (
          <span className="ltr-numerals text-[0.5625rem] leading-none text-ink-subtle">
            +{overflow}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** The fixed colour contract from the brief, resolved to design tokens. */
function dotClass(type: EventType): string {
  return {
    'event-blue': 'bg-event-blue',
    'event-green': 'bg-event-green',
    'event-orange': 'bg-event-orange',
    'event-purple': 'bg-event-purple',
    'event-red': 'bg-event-red',
  }[EVENT_TYPE_COLOR_TOKEN[type]]!;
}

export { dotClass };
