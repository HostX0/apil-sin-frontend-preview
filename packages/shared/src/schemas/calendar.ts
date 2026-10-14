import { z } from 'zod';
import {
  EVENT_TYPES,
  HEARING_OUTCOMES,
  type CaseStatus,
  type EventType,
  type HearingOutcome,
  type HearingStatus,
} from '../domain/enums';
import { dateKeySchema, longText, optionalText, uuidSchema } from './common';

/**
 * Calendar, hearings and events — Phase 7.
 *
 * One unified read model across three tables (hearings, calendar events, tasks
 * with a due date), because a lawyer looking at a day does not care which table
 * a commitment came from.
 */

// ── Hearings ────────────────────────────────────────────────────────────────

export const createHearingSchema = z.object({
  caseId: uuidSchema,
  /** Baghdad calendar day. Time is separate so "date known, time not" is expressible. */
  date: dateKeySchema,
  /** "09:00". Omitted when the court has not fixed a time. */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM.')
    .optional(),
  courtId: uuidSchema.optional(),
  purpose: optionalText(200),
  attendingLawyerId: uuidSchema.optional(),
  notes: longText(2000),
  /** Proceed despite a clash with another hearing at the same time. */
  acknowledgeConflict: z.boolean().optional(),
});
export type CreateHearingInput = z.infer<typeof createHearingSchema>;

export const updateHearingSchema = createHearingSchema.omit({ caseId: true }).extend({
  /** Recorded so a rescheduled session keeps its history rather than moving silently. */
  rescheduleReason: optionalText(500),
});
export type UpdateHearingInput = z.infer<typeof updateHearingSchema>;

/**
 * Recording what happened, and what was set next.
 *
 * This is the single highest-value interaction in the product: it is what a
 * litigator does after every court session, and the reason they will keep the
 * system up to date at all. Everything it needs is in one payload so it can be
 * one screen.
 */
export const recordOutcomeSchema = z
  .object({
    outcome: z.enum(HEARING_OUTCOMES),
    notes: longText(2000),
    adjournmentReason: optionalText(300),

    /** Schedule the follow-up session in the same action. */
    nextDate: dateKeySchema.optional(),
    nextTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM.')
      .optional(),
    nextPurpose: optionalText(200),

    /** Minutes before the next session to notify. Consumed by Phase 13. */
    reminderOffsets: z.array(z.number().int().min(0).max(43_200)).max(5).optional(),
    /** Proceed after the UI showed a real per-lawyer clash for the follow-up. */
    acknowledgeConflict: z.boolean().optional(),

    /**
     * Optionally advance the case status in the same step. Routed through the
     * same state machine as a manual change, so no guard is bypassed.
     */
    advanceCaseStatus: z.boolean().optional(),
    expectedJudgmentDate: dateKeySchema.optional(),
  })
  .refine((value) => value.outcome !== 'ADJOURNED' || Boolean(value.nextDate), {
    path: ['nextDate'],
    message: 'تاريخ الجلسة القادمة مطلوب عند التأجيل.',
  })
  .refine(
    (value) =>
      value.outcome !== 'RESERVED_FOR_JUDGMENT' ||
      !value.advanceCaseStatus ||
      Boolean(value.expectedJudgmentDate),
    {
      path: ['expectedJudgmentDate'],
      message: 'التاريخ المتوقع للحكم مطلوب لنقل الدعوى إلى «حجز للحكم».',
    },
  );
export type RecordOutcomeInput = z.infer<typeof recordOutcomeSchema>;

// ── Calendar events ─────────────────────────────────────────────────────────

export const RECURRENCE_RULES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type RecurrenceRule = (typeof RECURRENCE_RULES)[number];

export const RECURRENCE_RULE_AR: Record<RecurrenceRule, string> = {
  NONE: 'لا يتكرر',
  DAILY: 'يومياً',
  WEEKLY: 'أسبوعياً',
  MONTHLY: 'شهرياً',
  YEARLY: 'سنوياً',
};

const eventBaseSchema = z.object({
  title: z.string().trim().min(1, 'العنوان مطلوب.').max(200),
  /** HEARING is excluded: hearings are created through the hearings API. */
  type: z.enum(['APPOINTMENT', 'DEADLINE', 'REMINDER', 'URGENT_TASK']),
  date: dateKeySchema,
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM.')
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM.')
    .optional(),
  allDay: z.boolean().default(false),
  location: optionalText(200),
  notes: longText(2000),
  caseId: uuidSchema.optional(),
  /** Omitted on create means the creator; on update it preserves the owner. */
  ownerId: uuidSchema.optional(),
  reminderOffsets: z.array(z.number().int().min(0).max(43_200)).max(5).default([]),
  recurrence: z.enum(RECURRENCE_RULES).default('NONE'),
  recurrenceEnd: dateKeySchema.optional(),
});

function validateEvent(value: z.infer<typeof eventBaseSchema>, ctx: z.RefinementCtx) {
  if (value.recurrence !== 'NONE' && !value.recurrenceEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceEnd'],
      message: 'تاريخ انتهاء التكرار مطلوب.',
    });
  }
  if (value.endTime && value.time && value.endTime <= value.time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endTime'],
      message: 'وقت الانتهاء يجب أن يكون بعد وقت البدء.',
    });
  }
}

export const createEventSchema = eventBaseSchema.superRefine(validateEvent);
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = eventBaseSchema
  .extend({ version: z.number().int().min(0) })
  .superRefine(validateEvent);
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export interface CalendarEventDetail {
  id: string;
  title: string;
  type: CreateEventInput['type'];
  date: string;
  time: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  caseId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  reminderOffsets: number[];
  recurrence: RecurrenceRule;
  recurrenceEnd: string | null;
  seriesId: string | null;
  version: number;
}

// ── Unified calendar read ───────────────────────────────────────────────────

export const calendarRangeQuerySchema = z
  .object({
    from: dateKeySchema,
    to: dateKeySchema,
    /** Restrict to one user's commitments; omitted means the whole office. */
    ownerId: uuidSchema.optional(),
    caseId: uuidSchema.optional(),
  })
  .refine((value) => value.from <= value.to, {
    path: ['to'],
    message: 'نهاية المدة يجب أن تكون بعد بدايتها.',
  });
export type CalendarRangeQuery = z.infer<typeof calendarRangeQuerySchema>;

/** One shape for everything that lands on a day, whatever table it came from. */
export interface CalendarItem {
  id: string;
  source: 'HEARING' | 'EVENT' | 'TASK';
  type: EventType;
  dateKey: string;
  /** "09:00", or null for an all-day or time-unknown item. */
  time: string | null;
  title: string;
  subtitle: string | null;
  caseId: string | null;
  caseNumber: string | null;
  /** Deep link into the app. */
  href: string;
  isDone: boolean;
}

export interface HearingDetail {
  id: string;
  caseId: string;
  caseNumber: string;
  caseStatus: CaseStatus;
  clientName: string;
  courtId: string;
  courtName: string;
  scheduledAt: string;
  dateKey: string;
  hasTime: boolean;
  status: HearingStatus;
  purpose: string | null;
  attendingLawyer: { id: string; fullName: string } | null;
  outcome: HearingOutcome | null;
  outcomeNotes: string | null;
  adjournmentReason: string | null;
  nextHearingId: string | null;
  nextHearingAt: string | null;
}

/** A clash the user is warned about but never blocked by. */
export interface HearingConflict {
  id: string;
  caseNumber: string;
  courtName: string;
  scheduledAt: string;
}

export const EVENT_SOURCE_AR: Record<CalendarItem['source'], string> = {
  HEARING: 'جلسة',
  EVENT: 'حدث',
  TASK: 'مهمة',
};

/** Ordering within a day when two items share a time (Phase 0 §0.5). */
export const CALENDAR_TYPE_ORDER: readonly EventType[] = [...EVENT_TYPES];
