import { describe, expect, it } from 'vitest';
import { OUTBOX_MAX_ATTEMPTS, type ErrorCode, type OutboxEntry } from '@muhami/shared';
import { ApiError } from '@/lib/api-client';
import { classifyOutboxFailure } from '@/lib/outbox';

/**
 * The outbox's only real decision is what a failure means.
 *
 * Getting it wrong is expensive in both directions: retrying a rejection
 * forever hides a real problem behind a spinner, and parking a transient
 * network blip forces a lawyer to resolve a "conflict" that never existed.
 */

function entry(attempts = 0): OutboxEntry {
  return {
    id: 'entry',
    method: 'POST',
    path: '/hearings/x/outcome',
    body: {},
    idempotencyKey: 'key',
    labelAr: 'تثبيت قرار جلسة',
    invalidate: [],
    status: 'PENDING',
    attempts,
    lastErrorAr: null,
    queuedAt: 0,
  };
}

function problem(status: number, code: ErrorCode = 'INTERNAL_ERROR'): ApiError {
  return new ApiError({
    type: 'about:blank',
    title: 'Error',
    status,
    code,
    messageAr: 'Server message',
  });
}

describe('outbox failure classification', () => {
  it('keeps a transport failure pending so it retries on reconnect', () => {
    // status 0 is the client's own NetworkError: nothing reached the server.
    expect(classifyOutboxFailure(problem(0), entry()).status).toBe('PENDING');
  });

  it('gives up on a transport failure once the attempt budget is spent', () => {
    const result = classifyOutboxFailure(problem(0), entry(OUTBOX_MAX_ATTEMPTS - 1));

    expect(result.status).toBe('FAILED');
    expect(result.messageAr).toContain('Could not connect');
  });

  it('parks a version conflict for the user to resolve', () => {
    const result = classifyOutboxFailure(problem(409, 'VERSION_CONFLICT'), entry());

    expect(result.status).toBe('CONFLICT');
    expect(result.messageAr).toContain('another device');
  });

  it('parks a conflict even on the first attempt', () => {
    // A conflict is the server's considered answer; retrying cannot change it.
    expect(classifyOutboxFailure(problem(409), entry(0)).status).toBe('CONFLICT');
  });

  it('retries a server error, within the budget', () => {
    expect(classifyOutboxFailure(problem(503), entry()).status).toBe('PENDING');
    expect(classifyOutboxFailure(problem(503), entry(OUTBOX_MAX_ATTEMPTS - 1)).status).toBe(
      'FAILED',
    );
  });

  it('never retries a rejection the server has already considered', () => {
    for (const status of [400, 403, 404, 422]) {
      expect(classifyOutboxFailure(problem(status), entry()).status).toBe('FAILED');
    }
  });

  it('surfaces the server message on a rejection', () => {
    expect(classifyOutboxFailure(problem(422), entry()).messageAr).toBe('Server message');
  });

  it('treats a non-ApiError as unrecoverable rather than looping', () => {
    const result = classifyOutboxFailure(new TypeError('boom'), entry());

    expect(result.status).toBe('FAILED');
    expect(result.messageAr).toContain('Unexpected error');
  });
});
