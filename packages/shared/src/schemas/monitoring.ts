import { z } from 'zod';
import { cursorPaginationSchema } from '../api/pagination';
import { uuidSchema } from './common';

/**
 * Monitoring, notifications and reminders — Phase 13.
 *
 * The four watchlists are the product telling a lawyer what is about to go
 * wrong before it does. Their definitions are Phase 0 §0.5 verbatim and are
 * restated in the service that computes them.
 */

export const WATCHLISTS = [
  'NO_FEE_AGREEMENT',
  'NO_CERTIFIED_POA',
  'OUTSTANDING_FEES',
  'INACTIVE_CASES',
] as const;
export type Watchlist = (typeof WATCHLISTS)[number];

export const WATCHLIST_AR: Record<Watchlist, string> = {
  NO_FEE_AGREEMENT: 'دعاوى بلا عقد أتعاب',
  NO_CERTIFIED_POA: 'دعاوى بلا وكالة مصدّقة',
  OUTSTANDING_FEES: 'أتعاب مستحقة',
  INACTIVE_CASES: 'دعاوى راكدة',
};

export const WATCHLIST_DESCRIPTION_AR: Record<Watchlist, string> = {
  NO_FEE_AGREEMENT: 'دعاوى نشطة لم يُسجَّل لها عقد أتعاب.',
  NO_CERTIFIED_POA: 'دعاوى نشطة بلا وكالة مصدّقة سارية المفعول.',
  OUTSTANDING_FEES: 'أتعاب متفق عليها لم تُستوفَ بالكامل على دعاوى غير مؤرشفة.',
  INACTIVE_CASES: 'دعاوى نشطة بلا أي حركة منذ المدة المحددة في إعدادات المكتب.',
};

export const watchlistQuerySchema = cursorPaginationSchema.extend({
  list: z.enum(WATCHLISTS),
});
export type WatchlistQuery = z.infer<typeof watchlistQuerySchema>;

export interface WatchlistItem {
  caseId: string;
  numberDisplay: string;
  clientName: string;
  subject: string;
  courtName: string;
  /** The number that makes this row actionable: days idle, amount owed, and so on. */
  detail: string;
  href: string;
}

export interface WatchlistCounts {
  NO_FEE_AGREEMENT: number;
  NO_CERTIFIED_POA: number;
  OUTSTANDING_FEES: number;
  INACTIVE_CASES: number;
  total: number;
}

// ── Notifications ───────────────────────────────────────────────────────────

export const NOTIFICATION_KINDS = [
  'HEARING',
  'DEADLINE',
  'APPOINTMENT',
  'POA_EXPIRY',
  'DOCUMENT_EXPIRY',
  'TASK_DUE',
  'SYSTEM',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_AR: Record<NotificationKind, string> = {
  HEARING: 'جلسة',
  DEADLINE: 'موعد نهائي',
  APPOINTMENT: 'موعد',
  POA_EXPIRY: 'انتهاء وكالة',
  DOCUMENT_EXPIRY: 'انتهاء مستند',
  TASK_DUE: 'مهمة مستحقة',
  SYSTEM: 'النظام',
};

export const listNotificationsQuerySchema = cursorPaginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  titleAr: string;
  bodyAr: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export const markReadSchema = z.object({
  ids: z.array(uuidSchema).max(200).optional(),
  /** Mark everything read. Used by the "mark all" action. */
  all: z.boolean().optional(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;

// ── Preferences ─────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = ['inApp', 'email', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_AR: Record<NotificationChannel, string> = {
  inApp: 'داخل التطبيق',
  email: 'البريد الإلكتروني',
  push: 'إشعارات المتصفح',
};

/**
 * Lead times, in minutes before the event.
 *
 * A day and an hour by default: an Iraqi court session is usually in the
 * morning, so a reminder the previous afternoon is when a lawyer can still
 * prepare, and one an hour before is when they need to leave.
 */
export const DEFAULT_HEARING_LEAD_MINUTES = [1440, 60];

export const notificationPreferencesSchema = z.object({
  inApp: z.boolean().default(true),
  email: z.boolean().default(false),
  /**
   * Web Push (Phase 15). Off by default, and turning it on is not enough on its
   * own — the browser must also grant permission and register a subscription.
   * The two are deliberately separate: revoking permission in browser settings
   * must not silently rewrite a preference the user set in this app.
   */
  push: z.boolean().default(false),
  hearingLeadMinutes: z.array(z.number().int().min(0).max(20_160)).max(4).default([1440, 60]),
  /**
   * Quiet hours in Baghdad time, as "HH:MM". A reminder due inside the window is
   * held until it closes rather than dropped — a hearing reminder that is
   * silently discarded because it fell at 23:00 is the worst possible outcome.
   */
  quietFrom: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  quietTo: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  kinds: z.record(z.enum(NOTIFICATION_KINDS), z.boolean()).optional(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  email: false,
  push: false,
  hearingLeadMinutes: [1440, 60],
};

// ── Office statistics ───────────────────────────────────────────────────────

export interface OfficeStatistics {
  cases: {
    total: number;
    active: number;
    closed: number;
    archived: number;
    byType: Array<{ label: string; count: number }>;
    byStatus: Array<{ label: string; count: number }>;
  };
  clients: { total: number; withActiveCases: number };
  hearings: { upcoming30Days: number; heldLast30Days: number };
  documents: { total: number; expiringSoon: number };
  finance: {
    agreed?: string;
    invoiced: string;
    paid: string;
    outstanding: string;
    expenses: string;
  };
  watchlists: WatchlistCounts;
}
