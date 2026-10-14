'use client';

import { zodResolver } from '@/lib/ui-zod-resolver';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  PRIORITIES,
  PRIORITY_AR,
  createTaskSchema,
  type CreateTaskInput,
  type TaskSummary,
} from '@/lib/ui-shared';
import { Button, Field, Input, Sheet, SheetContent, SheetFooter, Textarea, cn } from '@muhami/ui';
import { ApiError } from '@/lib/api-client';
import { useUsers } from '@/lib/api/admin';
import { useCreateTask, useUpdateTask } from '@/lib/api/tasks';
import { useAuth } from '@/lib/auth-context';
import { baghdadTaskDateTimeInput, baghdadTaskDateTimeInstant } from '@/lib/task-time';

/**
 * Add / edit a task.
 *
 * Only the title is required. A task jotted down between two hearings has a
 * title and nothing else, and demanding a due date at that moment is how tasks
 * stop being written down at all — everything below the title is optional and
 * can be filled in later at a desk.
 */
export function TaskFormSheet({
  open,
  onOpenChange,
  task,
  caseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  task?: TaskSummary;
  /** Pre-links the task to a case when opened from a case file. */
  caseId?: string;
}) {
  const isEdit = Boolean(task);
  const { can } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  // Only loaded when the user may see the staff list; an assistant without
  // `user:read` simply gets no assignee picker rather than an error.
  const users = useUsers({ status: 'ACTIVE' }, can('user:read'));
  const staff = can('user:read') ? (users.data?.pages.flatMap((page) => page.items) ?? []) : [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: '', priority: 'NORMAL' },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      title: task?.title ?? '',
      description: task?.description ?? undefined,
      priority: task?.priority ?? 'NORMAL',
      // `datetime-local` wants "YYYY-MM-DDTHH:mm" with no zone or seconds.
      dueAt: task?.dueAt ? baghdadTaskDateTimeInput(task.dueAt) : undefined,
      caseId: task?.caseId ?? caseId ?? undefined,
      assigneeId: task?.assigneeId ?? undefined,
    });
  }, [open, task, caseId, reset]);

  const priority = watch('priority');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({
          id: task.id,
          ...values,
          dueAt: baghdadTaskDateTimeInstant(values.dueAt) ?? null,
          assigneeId: values.assigneeId ?? null,
          version: task.version,
        });
      } else {
        await createMutation.mutateAsync({
          ...values,
          dueAt: baghdadTaskDateTimeInstant(values.dueAt),
        });
      }
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.messageAr : 'Could not save the task.');
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? 'Edit Task' : 'New task'}
        description="Describe the work to complete. Add a due date, assignee and details if needed."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Task title" required error={errors.title?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('title')}
                placeholder="Example: Prepare the response brief"
              />
            )}
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Priority</legend>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue('priority', option, { shouldDirty: true })}
                  aria-pressed={priority === option}
                  className={cn(
                    'tap-target rounded-md border px-2 text-xs font-medium transition-colors',
                    priority === option
                      ? 'border-brand bg-brand-subtle text-brand'
                      : 'border-line text-ink-muted hover:bg-surface-sunken',
                  )}
                >
                  {PRIORITY_AR[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Task due date" error={errors.dueAt?.message} hint="Optional. Baghdad time.">
            {(props) => (
              <Input
                {...props}
                {...register('dueAt')}
                type="datetime-local"
                dir="ltr"
                className="text-start"
              />
            )}
          </Field>

          {staff.length > 0 ? (
            <Field label="Assignee" error={errors.assigneeId?.message}>
              {(props) => (
                <select
                  {...props}
                  {...register('assigneeId', {
                    setValueAs: (value: string) => (value === '' ? undefined : value),
                  })}
                  className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                >
                  <option value="">Unassigned</option>
                  {staff.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : null}

          <Field
            label="Task details"
            error={errors.description?.message}
            hint="Optional. Enter instructions for the assignee."
          >
            {(props) => <Textarea {...props} {...register('description')} rows={3} />}
          </Field>

          <input
            type="hidden"
            {...register('caseId', {
              setValueAs: (value: string) => (value === '' ? undefined : value),
            })}
          />

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <SheetFooter>
            <Button variant="secondary" block type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              block
              loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              Save task
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
