import { z } from 'zod';

/**
 * Cursor pagination — the convention for every list endpoint (Phase 3).
 *
 * Offset pagination is banned: it degrades on large offsets and silently skips
 * or repeats rows when the underlying data changes between pages, which is
 * exactly what happens on a busy case list.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const cursorPaginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export interface Page<T> {
  items: T[];
  /** Pass back as `cursor` to fetch the next page. Null when exhausted. */
  nextCursor: string | null;
  /**
   * Total matching rows. Omitted on hot paths where the COUNT would dominate
   * the query cost — the UI must handle `undefined` rather than assume 0.
   */
  total?: number;
}

export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');
export type SortDirection = z.infer<typeof sortDirectionSchema>;

/**
 * Opaque cursors — clients pass them back verbatim and never depend on their
 * shape. Implemented without `Buffer` so this module stays usable in the
 * browser bundle as well as in Node.
 */
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function encodeCursor(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let out = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    out += BASE64_ALPHABET[b0 >> 2];
    out += BASE64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += BASE64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += BASE64_ALPHABET[b2 & 0x3f];
  }

  return out;
}

export function decodeCursor(cursor: string): string | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of cursor) {
    const index = BASE64_ALPHABET.indexOf(char);
    if (index === -1) return null;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  if (bytes.length === 0) return null;

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
