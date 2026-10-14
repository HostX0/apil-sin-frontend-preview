'use client';

import { CheckCircle2, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  PRIORITY_AR,
  TASK_STATUS_AR,
  formatLongDateAr,
  type ListTasksQuery,
  type TaskSummary,
} from '@/lib/ui-shared';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cn } from '@muhami/ui';
import { TaskFormSheet } from '@/components/tasks/task-form-sheet';
import { ApiError } from '@/lib/api-client';
import { useCompleteTask, useDeleteTask, useTaskCounts, useTasks } from '@/lib/api/tasks';
import { useAuth } from '@/lib/auth-context';

/**
 * المهام — the office's own work, as opposed to the court's.
 *
 * Four filters, because these are the four questions actually asked: what is
 * open, what is mine, what is late, and what did we finish. Anything finer
 * belongs to search.
 */
function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const FILTERS = [
  { key: 'open', label: 'Open', query: {} as Partial<ListTasksQuery> },
  { key: 'mine', label: 'My tasks', query: { mine: true } as Partial<ListTasksQuery> },
  {
    key: 'overdue',
    label: 'Overdue',
    query: { dueBefore: todayKey() } as Partial<ListTasksQuery>,
  },
  {
    key: 'done',
    label: 'Completed',
    query: { status: 'DONE', includeClosed: true } as Partial<ListTasksQuery>,
  },
] as const;

export default function TasksPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('open');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TaskSummary | undefined>();

  const active = FILTERS.find((option) => option.key === filter) ?? FILTERS[0];
  const query = useTasks(active.query);
  const counts = useTaskCounts();

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-ink lg:text-2xl">Tasks</h1>
          {counts.data ? (
            <p className="ltr-numerals text-xs text-ink-subtle">
              {counts.data.open} Open
              {counts.data.overdue > 0 ? ` · ${counts.data.overdue} Overdue` : ''}
              {counts.data.dueToday > 0 ? ` · ${counts.data.dueToday} Today` : ''}
            </p>
          ) : null}
        </div>

        {can('task:create') ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add task
          </Button>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-md bg-surface-sunken p-1">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            aria-pressed={filter === option.key}
            className={cn(
              'min-h-11 flex-1 whitespace-nowrap rounded px-3 text-xs font-medium transition-colors',
              filter === option.key ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error instanceof ApiError ? query.error.messageAr : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={filter === 'done' ? CheckCircle2 : ListTodo}
          title={
            filter === 'done'
              ? 'No completed tasks yet'
              : filter === 'overdue'
                ? 'No overdue tasks'
                : filter === 'mine'
                  ? 'No tasks assigned to you'
                  : 'No open tasks'
          }
          description={
            filter === 'done'
              ? 'Completed tasks appear here.'
              : filter === 'overdue'
                ? 'Open tasks past their due date appear here.'
                : filter === 'mine'
                  ? 'Tasks assigned to you by the office appear here.'
                  : 'Record work to complete, such as preparing a pleading, following a notice or collecting a document.'
          }
          action={
            can('task:create') && filter === 'open' ? (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setSheetOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                Add first task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={() => {
                  setEditing(task);
                  setSheetOpen(true);
                }}
              />
            ))}
          </ul>
        </Card>
      )}

      {query.hasNextPage ? (
        <Button
          variant="secondary"
          block
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more
        </Button>
      ) : null}

      <TaskFormSheet open={sheetOpen} onOpenChange={setSheetOpen} task={editing} />
    </div>
  );
}

function TaskRow({ task, onEdit }: { task: TaskSummary; onEdit: () => void }) {
  const { can } = useAuth();
  const complete = useCompleteTask();
  const remove = useDeleteTask();

  const done = task.status === 'DONE';

  return (
    <li className="flex items-start gap-3 p-3.5">
      {/* A real checkbox, not a styled button: it keeps the keyboard
          behaviour, the announced role and the tap target for free. */}
      <label className="tap-target -ms-2 -mt-2 flex shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={done}
          disabled={!can('task:complete') || complete.isPending}
          onChange={(event) => complete.mutate({ id: task.id, done: event.target.checked })}
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className="size-5 accent-brand"
        />
      </label>

      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('text-sm', done ? 'text-ink-subtle line-through' : 'text-ink')}>
          {task.title}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {task.priority !== 'NORMAL' ? (
            <Badge tone={task.priority === 'URGENT' ? 'danger' : 'neutral'}>
              {PRIORITY_AR[task.priority]}
            </Badge>
          ) : null}
          {done ? <Badge tone="success">{TASK_STATUS_AR[task.status]}</Badge> : null}
          {task.isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
          {task.caseId && task.caseNumber ? (
            <Link
              href={`/cases/${task.caseId}`}
              className="ltr-numerals text-xs text-brand hover:underline"
            >
              {task.caseNumber}
            </Link>
          ) : null}
        </div>

        {task.dueAt || task.assigneeName ? (
          <p className="text-xs text-ink-subtle">
            {task.dueAt ? formatLongDateAr(new Date(task.dueAt)) : ''}
            {task.dueAt && task.assigneeName ? ' · ' : ''}
            {task.assigneeName ?? ''}
          </p>
        ) : null}
        {complete.isError || remove.isError ? (
          <p role="alert" className="text-xs text-danger">
            {(complete.error ?? remove.error) instanceof ApiError
              ? ((complete.error ?? remove.error) as ApiError).messageAr
              : 'Could not save the change. Please try again.'}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center">
        {can('task:update') ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${task.title}`}
            className="tap-target flex items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken"
          >
            <Pencil className="size-4" />
          </button>
        ) : null}

        {can('task:delete') ? (
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Delete task "${task.title}”? This cannot be undone.`))
                remove.mutate(task.id);
            }}
            aria-label={`Delete ${task.title}`}
            className="tap-target flex items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}
