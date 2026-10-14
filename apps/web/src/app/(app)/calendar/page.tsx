'use client';

import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  EVENT_TYPE_AR,
  MONTH_AR,
  WEEKDAY_AR,
  addDaysToKey,
  addMonths,
  buildMonthGrid,
  buildWeekGrid,
  formatHijriDate,
  formatLongDateAr,
  gridRange,
  parseDateKey,
  toBaghdadDateKey,
  type CalendarItem,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { EventFormSheet } from '@/components/calendar/event-form-sheet';
import { CalendarExport } from '@/components/calendar/calendar-export';
import { EventDetailsSheet } from '@/components/calendar/event-details-sheet';
import { MonthGrid, dotClass } from '@/components/calendar/month-grid';
import { ApiError } from '@/lib/api-client';
import { useCalendarRange } from '@/lib/api/calendar';
import { Can } from '@/lib/auth-context';

type View = 'month' | 'week' | 'day';

const VIEW_AR: Record<View, string> = { month: 'Month', week: 'Week', day: 'Day' };

export default function CalendarPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <CalendarView />
    </Suspense>
  );
}

function CalendarView() {
  const todayKey = toBaghdadDateKey(new Date());
  const router = useRouter();
  const params = useSearchParams();
  const requestedDate = params.get('date');
  const requestedEvent = params.get('event');
  const initialDate = validCalendarDate(requestedDate) ? requestedDate : todayKey;
  const [view, setView] = useState<View>('day');
  const [anchor, setAnchor] = useState(initialDate);
  const [selected, setSelected] = useState(initialDate);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(
    validEventId(requestedEvent) ? requestedEvent : null,
  );

  useEffect(() => {
    if (!validCalendarDate(requestedDate)) return;
    setSelected(requestedDate);
    setAnchor(requestedDate);
    setView('day');
  }, [requestedDate]);
  useEffect(() => {
    if (validEventId(requestedEvent)) setSelectedEvent(requestedEvent);
  }, [requestedEvent]);

  // One request per view, sized to exactly what the view renders.
  const range = useMemo(() => {
    if (view === 'month') {
      // Same builder the grid renders from, so the fetched range and the
      // rendered cells can never disagree.
      return gridRange(buildMonthGrid(anchor, todayKey));
    }
    if (view === 'week') {
      const days = buildWeekGrid(anchor, todayKey);
      return gridRange(days);
    }
    return { from: selected, to: selected };
  }, [view, anchor, selected, todayKey]);

  const query = useCalendarRange(range.from, range.to);
  const items = query.data ?? [];

  const step = (direction: 1 | -1) => {
    const next =
      view === 'month'
        ? addMonths(anchor, direction)
        : addDaysToKey(view === 'week' ? anchor : selected, direction * (view === 'week' ? 7 : 1));
    setAnchor(next);
    setSelected(next);
  };

  const { year, month } = parseDateKey(view === 'day' ? selected : anchor);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">
            Appointments and calendar
          </h1>
          <p className="mt-1 text-xs leading-5 text-ink-subtle">
            Hearings, appointments and due tasks, in Baghdad time.
          </p>
        </div>
        <Can permission="event:create">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add appointment
          </Button>
        </Can>
      </div>

      <div className="flex items-center gap-2">
        {/* Navigation follows the English reading direction. */}
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="ltr-numerals truncate text-base font-semibold text-ink">
            {view === 'day'
              ? formatLongDateAr(new Date(`${selected}T12:00:00+03:00`))
              : `${MONTH_AR[month - 1]} ${year}`}
          </p>
          <p className="truncate text-xs text-ink-subtle">
            {formatHijriDate(new Date(`${view === 'day' ? selected : anchor}T12:00:00+03:00`))}
          </p>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next"
          className="tap-target flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
          {(['day', 'week', 'month'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setAnchor(selected);
                setView(option);
              }}
              aria-pressed={view === option}
              className={cn(
                'min-h-11 rounded px-3 text-xs font-medium transition-colors',
                view === option ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted',
              )}
            >
              {VIEW_AR[option]}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAnchor(todayKey);
            setSelected(todayKey);
          }}
        >
          Today
        </Button>
      </div>

      <Legend />
      <CalendarExport
        items={items}
        from={range.from}
        to={range.to}
        disabled={query.isLoading || query.isError || query.isPlaceholderData}
      />

      {query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading || query.isPlaceholderData ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <>
          {view === 'month' ? (
            <Card className="overflow-hidden p-0">
              <MonthGrid
                monthKey={anchor}
                todayKey={todayKey}
                selectedKey={selected}
                items={items}
                onSelect={(dateKey) => {
                  setSelected(dateKey);
                  setView('day');
                }}
              />
            </Card>
          ) : null}

          {view === 'week' ? (
            <WeekView
              anchor={anchor}
              todayKey={todayKey}
              items={items}
              onSelect={(dateKey) => {
                setSelected(dateKey);
                setView('day');
              }}
            />
          ) : null}

          {view === 'day' ? (
            <DayAgenda
              dateKey={selected}
              items={items}
              isLoading={query.isLoading}
              onAdd={() => setFormOpen(true)}
              onEvent={setSelectedEvent}
            />
          ) : null}
        </>
      )}

      <EventFormSheet open={formOpen} onOpenChange={setFormOpen} defaultDate={selected} />
      {selectedEvent ? (
        <EventDetailsSheet
          id={selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            if (requestedEvent) router.replace(`/calendar?date=${selected}`, { scroll: false });
          }}
        />
      ) : null}
    </div>
  );
}

function WeekView({
  anchor,
  todayKey,
  items,
  onSelect,
}: {
  anchor: string;
  todayKey: string;
  items: CalendarItem[];
  onSelect: (dateKey: string) => void;
}) {
  const days = buildWeekGrid(anchor, todayKey);

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const dayItems = items.filter((item) => item.dateKey === day.dateKey);

        return (
          <Card key={day.dateKey} className={cn(day.isToday && 'border-brand')}>
            <button
              type="button"
              onClick={() => onSelect(day.dateKey)}
              className="flex w-full items-center gap-3 p-3 text-start"
            >
              <span
                className={cn(
                  'ltr-numerals flex size-9 shrink-0 flex-col items-center justify-center rounded-md text-xs',
                  day.isToday ? 'bg-brand text-brand-ink' : 'bg-surface-sunken text-ink-muted',
                )}
              >
                <span className="font-bold">{day.dayOfMonth}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {WEEKDAY_AR[day.weekday]}
                </span>
                <span className="block text-xs text-ink-subtle">
                  {dayItems.length > 0 ? `${dayItems.length} in the calendar` : 'No appointments'}
                </span>
              </span>
              <span className="flex gap-0.5" aria-hidden>
                {[...new Set(dayItems.map((item) => item.type))].slice(0, 4).map((type) => (
                  <span key={type} className={cn('size-1.5 rounded-full', dotClass(type))} />
                ))}
              </span>
            </button>
          </Card>
        );
      })}
    </div>
  );
}

function DayAgenda({
  dateKey,
  items,
  isLoading,
  onAdd,
  onEvent,
}: {
  dateKey: string;
  items: CalendarItem[];
  isLoading: boolean;
  onAdd: () => void;
  onEvent: (id: string) => void;
}) {
  const dayItems = items.filter((item) => item.dateKey === dateKey);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (dayItems.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No appointments for this day"
        description="Add an appointment or reminder here. To add a court hearing, open the case and choose Hearings."
        action={
          <Can permission="event:create">
            <Button onClick={onAdd}>
              <Plus className="size-4" aria-hidden />
              Add appointment
            </Button>
          </Can>
        }
      />
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {dayItems.map((item) => (
          <li key={`${item.source}-${item.id}`}>
            <Link
              href={item.href}
              onClick={(click) => {
                if (item.source === 'EVENT') {
                  click.preventDefault();
                  onEvent(item.id);
                }
              }}
              className="flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-sunken"
            >
              <span
                aria-hidden
                className={cn('h-10 w-1 shrink-0 rounded-full', dotClass(item.type))}
              />
              <span className="ltr-numerals w-12 shrink-0 text-sm font-medium tabular-nums text-ink-muted">
                {item.time ?? 'No time set'}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-sm font-medium',
                    item.isDone ? 'text-ink-subtle line-through' : 'text-ink',
                  )}
                >
                  {item.title}
                </span>
                {item.subtitle ? (
                  <span className="block truncate text-xs text-ink-subtle">{item.subtitle}</span>
                ) : null}
              </span>
              <Badge tone="neutral">{EVENT_TYPE_AR[item.type]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function validCalendarDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validEventId(value: string | null): value is string {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  );
}

/** The colour contract, stated once on screen so the dots are readable. */
function Legend() {
  const entries = [
    { type: 'HEARING' as const, label: 'Hearing' },
    { type: 'APPOINTMENT' as const, label: 'Appointment' },
    { type: 'DEADLINE' as const, label: 'Deadline' },
    { type: 'REMINDER' as const, label: 'Reminder' },
    { type: 'URGENT_TASK' as const, label: 'Urgent' },
  ];

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto">
      {entries.map((entry) => (
        <span
          key={entry.type}
          className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted"
        >
          <span className={cn('size-2 rounded-full', dotClass(entry.type))} aria-hidden />
          {entry.label}
        </span>
      ))}
    </div>
  );
}
