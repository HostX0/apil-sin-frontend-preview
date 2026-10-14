import { z } from 'zod';

/**
 * Offline sync and Web Push — Phase 15.
 *
 * The shapes here are the contract between the browser's outbox and the API.
 * Both sides import them, so an outbox entry queued by one release cannot be
 * replayed against an API that expects a different shape without the types
 * saying so.
 */

// ── Web Push ────────────────────────────────────────────────────────────────

export const pushSubscribeSchema = z.object({
  /**
   * The push service URL issued by the browser. Treated as a secret — anyone
   * holding it can send this device a notification.
   */
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(300),
  }),
  deviceLabel: z.string().trim().max(120).optional(),
});
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
});
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;

/** What the service worker receives in a push event. */
export interface PushPayload {
  title: string;
  body: string;
  link?: string | null;
  /** Collapses repeats of the same subject into one notification. */
  tag?: string;
}

// ── Outbox ──────────────────────────────────────────────────────────────────

export const OUTBOX_STATUSES = ['PENDING', 'SENDING', 'FAILED', 'CONFLICT'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OUTBOX_STATUS_AR: Record<OutboxStatus, string> = {
  PENDING: 'بانتظار الاتصال',
  SENDING: 'قيد الإرسال',
  FAILED: 'فشل الإرسال',
  CONFLICT: 'تعارض مع تعديل آخر',
};

/**
 * A write waiting for a connection.
 *
 * `idempotencyKey` is generated when the entry is queued, not when it is sent,
 * which is the whole point: a replay after a timeout carries the same key and
 * the API answers with the original result instead of performing the write
 * twice.
 */
export interface OutboxEntry {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body: unknown;
  idempotencyKey: string;
  /** Arabic description of the action, for the pending-changes screen. */
  labelAr: string;
  /** Query keys to invalidate once this entry lands. */
  invalidate: string[][];
  status: OutboxStatus;
  attempts: number;
  lastErrorAr: string | null;
  queuedAt: number;
}

/**
 * How many times an entry is retried before it is parked for the user.
 *
 * Low on purpose. A write that has failed five times is not going to succeed on
 * the sixth, and a silent retry loop is how an outbox turns into a queue nobody
 * knows is broken.
 */
export const OUTBOX_MAX_ATTEMPTS = 5;
