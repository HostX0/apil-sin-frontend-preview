import { ERROR_MESSAGE_AR, type ProblemDetails } from '@/lib/ui-shared';
import { uiEnglish } from '@/lib/ui-english';
import { previewRequest } from './preview-api';

/** Preview-only adapter. It has no fetch, cookie, API URL or production fallback. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly messageAr: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly traceId: string | undefined;

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
    this.messageAr = uiEnglish(
      problem.messageAr,
      ERROR_MESSAGE_AR[problem.code] ?? 'Could not complete this action. Please try again.',
    );
    this.fieldErrors = Object.fromEntries(
      Object.entries(problem.errors ?? {}).map(([key, messages]) => [
        key,
        messages.map((message) => uiEnglish(message, 'Please check this field.')),
      ]),
    );
    this.traceId = problem.traceId;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }
}


export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  skipAuthRetry?: boolean;
  beforeSend?: () => void;
}

// Keep the UI session helpers compatible while this demo uses synthetic identity.
export function setVerifiedApiPrincipal(_principal: string | null): void {}
export function advanceApiSession(): void {}
export async function settleAuthRefresh(): Promise<void> {}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new ApiError({ type: 'about:blank', title: 'Preview only', status: 403,
      code: 'FORBIDDEN', messageAr: 'External API requests are disabled in this preview.' });
  }
  options.beforeSend?.();
  if (options.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
  return previewRequest(path, options) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
