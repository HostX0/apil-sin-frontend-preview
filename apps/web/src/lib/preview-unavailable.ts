import { ApiError } from '@/lib/api-client';

/** A local error only; no request is made for disabled production integrations. */
export function previewUnavailable(message: string): ApiError {
  return new ApiError({
    type: 'about:blank',
    title: 'Frontend preview',
    status: 403,
    code: 'FORBIDDEN',
    messageAr: message,
  });
}
