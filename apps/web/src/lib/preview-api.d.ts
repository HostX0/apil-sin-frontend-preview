import type { AuthenticatedUser } from '@muhami/shared';
import type { RequestOptions } from './api-client';

export function previewRequest(path: string, options?: RequestOptions): unknown;
export const previewUser: AuthenticatedUser;
