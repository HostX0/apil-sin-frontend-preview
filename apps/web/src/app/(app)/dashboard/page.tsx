'use client';

import {
  ArrowUpLeft,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ListChecks,
  Users,
  ClipboardList,
  CircleHelp,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  EVENT_TYPE_COLOR_TOKEN,
  EVENT_SOURCE_AR,
  toBaghdadDateKey,
  type CalendarItem,
  type EventType,
} from '@/lib/ui-shared';
import { Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { EventFormSheet } from '@/components/calendar/event-form-sheet';
import { CaseFormSheet } from '@/components/cases/case-form-sheet';
import { ClientFormSheet } from '@/components/clients/client-form-sheet';
import { TransactionFormSheet } from '@/components/transactions/transaction-form-sheet';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { useNumeralFormatter } from '@/components/shell/app-header';
import { ApiError } from '@/lib/api-client';
import { useTodayDashboard } from '@/lib/api/dashboard';
import { Can, useAuth } from '@/lib/auth-context';

type QuickCreate = 'client' | 'case' | 'transaction' | 'appointment' | null;

export default function TodayPage() {
  const { user, can } = useAuth();
  const router = useRouter();
  const [quickCreate, setQuickCreate] = useState<QuickCreate>(null);
  const { data, isLoading, isError, error, refetch } = useTodayDashboard();
  const format = useNumeralFormatter();
  const pendingSchedule = data?.schedule.filter((item) => !item.isDone) ?? [];
  const completedSchedule = data?.schedule.length
    ? data.schedule.length - pendingSchedule.length
    : 0;

  const close = () => setQuickCreate(null);

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-xl border border-line bg-surface px-5 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-center">
          <div className="min-w-0 max-w-2xl">
            <p className="mb-2 text-xs font-semibold text-brand">Dashboard</p>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Welcome, {user?.fullName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-ink-muted">
              Record new work using the shortcuts below, and follow today’s hearings and
              appointments.
            </p>
            {can('event:read.all') || can('event:read.own') ? (
              <Link
                href="/calendar"
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                <CalendarPlus className="size-4" aria-hidden />
                Open calendar
              </Link>
            ) : null}
          </div>

          {isLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : data ? (
            <DailyFocus
              schedule={data.schedule}
              pending={pendingSchedule}
              completed={completedSchedule}
              format={format}
              onAddEvent={() => setQuickCreate('appointment')}
              canAddEvent={can('event:create')}
            />
          ) : null}
        </div>
      </section>

      <InstallPrompt />

      {isError ? (
        <ErrorState
          title="Could not load today's overview"
          description={error instanceof ApiError ? error.messageAr : undefined}
          traceId={error instanceof ApiError ? error.traceId : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <section aria-labelledby="office-summary" className="space-y-3">
            <h2 id="office-summary" className="sr-only">
              Office overview
            </h2>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </>
              ) : (
                <>
                  {can('case:read.all') || can('case:read.own') ? (
                    <SummaryCard
                      label="Active cases"
                      value={format(data!.metrics.activeCases)}
                      icon={Scale}
                      href="/cases?active=1"
                      tone="brand"
                    />
                  ) : null}
                  {can('event:read.all') || can('event:read.own') ? (
                    <SummaryCard
                      label="Hearings this week"
                      value={format(data!.metrics.weekHearings)}
                      icon={CalendarPlus}
                      href="/calendar"
                      tone="info"
                    />
                  ) : null}
                </>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.3fr)] lg:gap-6">
            <section
              aria-labelledby="quick-actions"
              className="space-y-4 rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-6"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="size-5 text-brand" aria-hidden />
                <h2 id="quick-actions" className="text-base font-semibold text-ink">
                  Record new work
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Can permission="case:create">
                  <ActionCard
                    label="New case"
                    hint="Choose the client and lawyer"
                    icon={Scale}
                    onClick={() => setQuickCreate('case')}
                  />
                </Can>
                <Can permission="client:create">
                  <ActionCard
                    label="New client"
                    hint="Name and mobile number"
                    icon={Users}
                    onClick={() => setQuickCreate('client')}
                  />
                </Can>
                <Can permission="transaction:create">
                  <ActionCard
                    label="New transaction"
                    hint="Work with a department or authority"
                    icon={ClipboardList}
                    onClick={() => setQuickCreate('transaction')}
                  />
                </Can>
                <Can permission="event:create">
                  <ActionCard
                    label="New appointment"
                    hint="Add it to the calendar"
                    icon={CalendarPlus}
                    onClick={() => setQuickCreate('appointment')}
                  />
                </Can>
              </div>
            </section>

            <section aria-labelledby="today-schedule" className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="today-schedule" className="text-base font-semibold text-ink">
                    Today’s schedule
                  </h2>
                </div>
                {can('event:read.all') || can('event:read.own') ? (
                  <Link
                    href="/calendar"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    View calendar
                    <ArrowUpLeft className="size-3.5" aria-hidden />
                  </Link>
                ) : null}
              </div>

              {isLoading ? (
                <Skeleton className="h-44 w-full rounded-xl" />
              ) : data!.schedule.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="border-b border-line px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-ink-muted">
                        Today, in time order
                      </span>
                      <span className="ltr-numerals text-xs font-medium text-ink-muted">
                        {format(data!.schedule.length)} commitments
                      </span>
                    </div>
                  </div>
                  <ul className="divide-y divide-line">
                    {data!.schedule.map((item) => (
                      <ScheduleRow key={`${item.source}-${item.id}`} item={item} />
                    ))}
                  </ul>
                </Card>
              ) : (
                <EmptyState
                  className="border-solid border-line bg-surface py-8"
                  icon={CalendarPlus}
                  title="No hearings or appointments today"
                  description="Today's hearings, appointments and tasks appear here."
                  action={
                    <Can permission="event:create">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setQuickCreate('appointment')}
                      >
                        Add appointment
                      </Button>
                    </Can>
                  }
                />
              )}
            </section>
          </div>

          {!isLoading ? <OnboardingCard initial={data!.isEmptyOffice} /> : null}
        </>
      )}

      <CaseFormSheet
        open={quickCreate === 'case'}
        onOpenChange={close}
        onSaved={(saved) => {
          if (can('case:read.all')) router.push(`/cases/${saved.id}`);
        }}
      />
      <ClientFormSheet
        open={quickCreate === 'client'}
        onOpenChange={close}
        onSaved={(saved) => {
          if (can('client:read.all')) router.push(`/clients/${saved.id}`);
        }}
      />
      <TransactionFormSheet open={quickCreate === 'transaction'} onOpenChange={close} />
      <EventFormSheet
        open={quickCreate === 'appointment'}
        onOpenChange={close}
        defaultDate={data?.todayKey ?? toBaghdadDateKey(new Date())}
      />
    </div>
  );
}

function DailyFocus({
  schedule,
  pending,
  completed,
  format,
  onAddEvent,
  canAddEvent,
}: {
  schedule: CalendarItem[];
  pending: CalendarItem[];
  completed: number;
  format: (value: number | string) => string;
  onAddEvent: () => void;
  canAddEvent: boolean;
}) {
  const next = pending[0];
  const progress = schedule.length === 0 ? 0 : Math.round((completed / schedule.length) * 100);

  return (
    <div className="min-w-0 max-w-full rounded-lg bg-surface-sunken p-4">
      <div className="flex items-center gap-4">
        {schedule.length > 0 ? (
          <div
            role="progressbar"
            aria-label="Today's completion progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="relative size-[4.5rem] shrink-0"
          >
            <svg viewBox="0 0 44 44" className="size-full -rotate-90" aria-hidden>
              <circle
                cx="22"
                cy="22"
                r="18"
                pathLength="100"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                className="text-line"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                pathLength="100"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${progress} 100`}
                className="dashboard-progress-ring text-brand"
              />
            </svg>
            <span className="ltr-numerals absolute inset-0 flex items-center justify-center text-xs font-bold text-ink">
              {format(progress)}%
            </span>
          </div>
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <CalendarPlus className="size-6" aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          {next ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                <Clock3 className="size-3.5" aria-hidden />
                <span>
                  Up next · {EVENT_SOURCE_AR[next.source]} · {next.time ?? 'No time set'}
                </span>
              </div>
              <Link
                href={next.href}
                className="mt-1 flex min-h-11 items-center gap-2 text-base font-semibold text-ink transition-colors hover:text-brand"
              >
                <span className="min-w-0 flex-1 truncate">{next.title}</span>
                <ArrowUpLeft className="size-4 shrink-0" aria-hidden />
              </Link>
              <p className="text-xs leading-6 text-ink-muted">
                {format(completed)} of {format(schedule.length)} completed today
              </p>
            </>
          ) : schedule.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5 text-sm font-bold text-success">
                <CheckCircle2 className="size-4" aria-hidden />
                Today’s commitments are complete
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                All items are complete. Review tomorrow or add an appointment.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <ListChecks className="size-4 text-brand" aria-hidden />
                No appointments today
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                The next hearing or appointment recorded in the calendar appears here.
              </p>
              {canAddEvent ? (
                <button
                  type="button"
                  onClick={onAddEvent}
                  className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
                >
                  Add appointment now
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ item }: { item: CalendarItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-center gap-3 px-3.5 py-4 transition-colors hover:bg-surface-sunken sm:px-4"
      >
        <span
          aria-hidden
          className={cn('size-2 shrink-0 rounded-full', eventBarClass(item.type))}
        />
        <span className="ltr-numerals w-14 shrink-0 text-sm font-semibold tabular-nums text-ink-muted">
          {item.time ?? '—'}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm font-semibold',
              item.isDone ? 'text-ink-subtle line-through' : 'text-ink',
            )}
          >
            {item.title}
          </span>
          {item.subtitle ? (
            <span className="mt-1 block truncate text-xs text-ink-muted">{item.subtitle}</span>
          ) : null}
        </span>
        <ArrowUpLeft className="size-4 shrink-0 text-ink-muted" aria-hidden />
      </Link>
    </li>
  );
}

function OnboardingCard({ initial }: { initial: boolean }) {
  const { can } = useAuth();
  if (!can('client:create') && !can('case:create') && !can('transaction:create')) return null;
  const steps = [
    {
      number: '1',
      title: 'Add client',
      text: 'Record the name and mobile number once, or choose an existing client.',
      href: '/clients',
      icon: Users,
      permission: 'client:read.all' as const,
    },
    {
      number: '2',
      title: 'Record a case or transaction',
      text: 'A case goes to a court; a transaction goes to a department. Choose the client and responsible lawyer.',
      href: can('case:create') ? '/cases?new=1' : '/transactions',
      icon: Scale,
      permission: can('case:create') ? ('case:create' as const) : ('transaction:create' as const),
    },
    {
      number: '3',
      title: 'Follow up from the file',
      text: 'Add documents and dates, then record case fees and payments.',
      href: '/help#daily-work',
      icon: ClipboardList,
      permission: undefined,
    },
  ];
  return (
    <Card className="p-4 sm:p-5">
      <details open={initial || undefined}>
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-ink">
          {initial ? 'Start with these three steps' : 'How to record new work'}
        </summary>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="flex gap-3 rounded-lg bg-surface-sunken p-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-bold text-brand"
                aria-hidden
              >
                {step.number}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-1 text-xs leading-6 text-ink-muted">{step.text}</p>
                {!step.permission || can(step.permission) ? (
                  <Link
                    href={step.href}
                    className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand"
                  >
                    <step.icon className="size-4" aria-hidden />
                    {step.number === '3' ? 'View the steps' : step.title}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <Link
          href="/help"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
        >
          <CircleHelp className="size-4" aria-hidden />
          User guide and help
        </Link>
      </details>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
  tone: 'brand' | 'info' | 'warning';
}) {
  const toneClass = {
    brand: 'bg-brand-subtle text-brand',
    info: 'bg-info-subtle text-info',
    warning: 'bg-warning-subtle text-warning',
  }[tone];

  return (
    <Link
      href={href}
      className="card-surface group flex min-h-24 items-center gap-3 p-4 transition-colors hover:border-brand sm:gap-4"
    >
      <span
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', toneClass)}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-6 text-ink-muted">{label}</span>
        <span className="ltr-numerals mt-0.5 block truncate text-2xl font-bold tabular-nums text-ink">
          {value}
        </span>
      </div>
      <ArrowUpLeft
        className="hidden size-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand sm:block"
        aria-hidden
      />
    </Link>
  );
}

function ActionCard({
  label,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-28 flex-col items-start gap-3 rounded-lg border border-transparent bg-surface-sunken p-3 text-start transition-colors hover:border-brand hover:bg-brand-subtle"
    >
      <Icon className="size-6 text-brand" aria-hidden />
      <div>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">{hint}</span>
      </div>
    </button>
  );
}

function eventBarClass(type: EventType): string {
  return {
    'event-blue': 'bg-event-blue',
    'event-green': 'bg-event-green',
    'event-orange': 'bg-event-orange',
    'event-purple': 'bg-event-purple',
    'event-red': 'bg-event-red',
  }[EVENT_TYPE_COLOR_TOKEN[type]]!;
}
