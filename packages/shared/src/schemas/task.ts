import { z } from 'zod';
import { cursorPaginationSchema } from '../api/pagination';
import { PRIORITIES, TASK_STATUSES, type Priority, type TaskStatus } from '../domain/enums';
import { dateKeySchema, longText, optionalDateSchema, requiredText, uuidSchema } from './common';

/**
 * Tasks — the office's own work, as opposed to the court's.
 *
 * A hearing is imposed by a court and has a date the office cannot move. A task
 * is something the office decided to do — draft the response, collect the
 * signature, follow up the transfer. They are separate models for that reason
 * and not merged into one "event": a missed hearing loses a case, a missed task
 * is a reminder to reschedule.
 *
 * Both surface on the calendar, which is why the calendar aggregates them; only
 * one of them is editable here.
 */

export const listTasksQuerySchema = cursorPaginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  caseId: uuidSchema.optional(),
  assigneeId: uuidSchema.optional(),
  /** `me` on the client resolves to the caller; the API never trusts a client-supplied id for this. */
  mine: z.coerce.boolean().optional(),
  /** Due on or before this day. Drives "متأخرة" and "هذا الأسبوع". */
  dueBefore: dateKeySchema.optional(),
  /** Default hides DONE and CANCELLED — a task list is a list of work left. */
  includeClosed: z.coerce.boolean().optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const createTaskSchema = z.object({
  title: requiredText('عنوان المهمة', 200),
  description: longText(2000),
  priority: z.enum(PRIORITIES).default('NORMAL'),
  /**
   * Optional on purpose. A task jotted down in a corridor has a title and
   * nothing else; forcing a date here means the task does not get written down.
   */
  dueAt: optionalDateSchema,
  caseId: uuidSchema.optional(),
  assigneeId: uuidSchema.optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  dueAt: optionalDateSchema.nullable(),
  assigneeId: uuidSchema.nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  version: z.coerce.number().int().min(0),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * Completion is its own endpoint, not an update.
 *
 * It is the one action performed constantly, from a list, with one tap — and
 * it must not require sending back the whole task. It also carries the
 * permission `task:complete`, which an assistant can hold without holding
 * `task:update`.
 */
export const completeTaskSchema = z.object({
  done: z.boolean().default(true),
});
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  dateKey: string | null;
  doneAt: string | null;
  caseId: string | null;
  caseNumber: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  /** True when `dueAt` is in the past and the task is still open. */
  isOverdue: boolean;
  version: number;
  createdAt: string;
}

export interface TaskCounts {
  open: number;
  overdue: number;
  dueToday: number;
  mine: number;
}
