import { z } from 'zod';
import { uuidSchema } from './common';

/**
 * Global search — Phase 12.
 *
 * One box over five entity types. The Arabic normalisation from Phase 3 does
 * the heavy lifting: every searchable column already stores a folded matching
 * key, so the query only has to be folded the same way before it is compared.
 */

export const SEARCH_GROUPS = ['CLIENTS', 'CASES', 'DOCUMENTS', 'HEARINGS', 'RECEIPTS'] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export const SEARCH_GROUP_AR: Record<SearchGroup, string> = {
  CLIENTS: 'الموكّلون',
  CASES: 'الدعاوى',
  DOCUMENTS: 'المستندات',
  HEARINGS: 'الجلسات',
  RECEIPTS: 'الوصولات',
};

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'أدخل نص البحث.').max(200),
  /** Restrict to specific groups; omitted means every group the user may read. */
  groups: z
    .string()
    .optional()
    .transform((raw) => (raw ? raw.split(',').filter(Boolean) : undefined))
    .pipe(z.array(z.enum(SEARCH_GROUPS)).optional()),
  /** Results per group. The palette shows a handful; a group page shows more. */
  limit: z.coerce.number().int().min(1).max(25).default(5),
});
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

export interface SearchHit {
  id: string;
  group: SearchGroup;
  /** Primary line — the name or number a lawyer would recognise. */
  title: string;
  /** Secondary line: context that disambiguates two similar titles. */
  subtitle: string | null;
  /** Third line, usually a date or a status. */
  meta: string | null;
  href: string;
  /**
   * 0–1. Exact and prefix matches score 1; trigram similarity supplies the rest.
   * Used only for ordering within a group.
   */
  score: number;
}

export interface SearchGroupResult {
  group: SearchGroup;
  hits: SearchHit[];
  /** Total matches, so the UI can offer "see all 47". */
  total: number;
}

export interface GlobalSearchResult {
  query: string;
  /** Groups the caller is not permitted to read are absent, not empty. */
  groups: SearchGroupResult[];
  /** True when the exact-match pass found nothing and fuzzy matching was used. */
  usedFuzzy: boolean;
  tookMs: number;
}

// ── Saved searches ──────────────────────────────────────────────────────────

export const SAVED_SEARCH_SCOPES = ['CASES', 'CLIENTS', 'DOCUMENTS', 'FINANCE'] as const;
export type SavedSearchScope = (typeof SAVED_SEARCH_SCOPES)[number];

export const SAVED_SEARCH_SCOPE_AR: Record<SavedSearchScope, string> = {
  CASES: 'الدعاوى',
  CLIENTS: 'الموكّلون',
  DOCUMENTS: 'المستندات',
  FINANCE: 'المالية',
};

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1, 'اسم البحث مطلوب.').max(80),
  scope: z.enum(SAVED_SEARCH_SCOPES),
  /**
   * The exact filter state, stored verbatim.
   *
   * Kept as the URL query string rather than a parsed structure: the list
   * screens already encode their whole state there (Phase 6), so a saved search
   * reproduces its result set by restoring a URL, and adding a filter in a later
   * phase needs no migration here.
   */
  query: z.string().max(2000),
  /** Visible to the whole office. Requires savedsearch:share. */
  isShared: z.boolean().default(false),
});
export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;

export const listSavedSearchesQuerySchema = z.object({
  scope: z.enum(SAVED_SEARCH_SCOPES).optional(),
});
export type ListSavedSearchesQuery = z.infer<typeof listSavedSearchesQuerySchema>;

export interface SavedSearchSummary {
  id: string;
  name: string;
  scope: SavedSearchScope;
  query: string;
  isShared: boolean;
  ownerId: string;
  ownerName: string | null;
  isMine: boolean;
  createdAt: string;
}

export const savedSearchIdSchema = z.object({ id: uuidSchema });

// ── Export ──────────────────────────────────────────────────────────────────

export const EXPORT_SCOPES = ['CASES', 'CLIENTS', 'RECEIPTS', 'EXPENSES'] as const;
export type ExportScope = (typeof EXPORT_SCOPES)[number];

export const exportQuerySchema = z.object({
  scope: z.enum(EXPORT_SCOPES),
  /** Same filter query string the list screen uses, so what you see is what you export. */
  filters: z.string().max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;
