import { z } from 'zod';
import { CLIENT_KINDS, type ClientKind } from '../domain/enums';
import { cursorPaginationSchema } from '../api/pagination';
import {
  iraqiMobileSchema,
  longText,
  optionalEmailSchema,
  optionalIraqiMobileSchema,
  optionalText,
  personNameSchema,
  uuidSchema,
  versionSchema,
} from './common';

/**
 * Client schemas — Phase 5.
 *
 * Required: full name + mobile. Everything else optional, exactly as briefed.
 * The two-field minimum is a product decision, not laziness: a lawyer adding a
 * walk-in client on a phone in a courthouse corridor must be done in under
 * twenty seconds, and every extra required field is a reason to write it on
 * paper instead.
 */

/**
 * Iraqi national ID (رقم البطاقة الوطنية) is 12 digits. Accepted with or without
 * separators and in either digit style; stored digits-only.
 */
export const nationalIdSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => value.length === 0 || /^\d{10,14}$/.test(value), {
    message: 'رقم البطاقة الوطنية يجب أن يتكوّن من أرقام (١٠ إلى ١٤ خانة).',
  })
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const clientBaseShape = {
  fullName: personNameSchema,
  kind: z.enum(CLIENT_KINDS).default('INDIVIDUAL'),
  nationalId: nationalIdSchema,
  address: optionalText(300),
  phoneSecondary: optionalIraqiMobileSchema,
  email: optionalEmailSchema,
  notes: longText(2000),
  tagIds: z.array(uuidSchema).max(20).optional(),
};

export const createClientSchema = z.object({
  ...clientBaseShape,
  mobile: iraqiMobileSchema,
  sendWelcome: z.boolean().optional(),
  includeWelcomeImage: z.boolean().optional(),
  /**
   * Set by the client after the user has seen and accepted the duplicate
   * warning. The API refuses a duplicate without it, so "warn before saving"
   * is enforced by the server rather than trusted to the form.
   */
  confirmDuplicate: z.boolean().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  ...clientBaseShape,
  mobile: iraqiMobileSchema,
  version: versionSchema,
  confirmDuplicate: z.boolean().optional(),
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const CLIENT_SORTS = ['recent', 'name', 'oldest'] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

export const CLIENT_SORT_AR: Record<ClientSort, string> = {
  recent: 'الأحدث إضافة',
  name: 'الاسم (أ — ي)',
  oldest: 'الأقدم إضافة',
};

export const listClientsQuerySchema = cursorPaginationSchema.extend({
  /** One box, three targets: name, mobile, national ID. */
  search: z.string().trim().max(200).optional(),
  kind: z.enum(CLIENT_KINDS).optional(),
  isFavorite: z.coerce.boolean().optional(),
  tagId: uuidSchema.optional(),
  sort: z.enum(CLIENT_SORTS).default('recent'),
});
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;

export const duplicateCheckQuerySchema = z
  .object({
    mobile: z.string().trim().max(30).optional(),
    nationalId: z.string().trim().max(30).optional(),
    /** Excluded from the results when editing an existing client. */
    excludeId: uuidSchema.optional(),
  })
  .refine((value) => Boolean(value.mobile ?? value.nationalId), {
    message: 'يجب تمرير رقم الموبايل أو رقم البطاقة للتحقق.',
  });
export type DuplicateCheckQuery = z.infer<typeof duplicateCheckQuerySchema>;

// ── Response shapes ─────────────────────────────────────────────────────────

export interface ClientListItem {
  id: string;
  fullName: string;
  mobile: string;
  kind: ClientKind;
  nationalId: string | null;
  isFavorite: boolean;
  caseCount: number;
  activeCaseCount: number;
  createdAt: string;
}

export interface ClientDetail extends ClientListItem {
  address: string | null;
  phoneSecondary: string | null;
  email: string | null;
  notes: string | null;
  version: number;
  updatedAt: string;
  tags: Array<{ id: string; label: string; colorToken: string }>;
}

export interface DuplicateMatch {
  id: string;
  fullName: string;
  mobile: string;
  matchedOn: Array<'mobile' | 'nationalId'>;
}

export interface ActivityEntry {
  id: string;
  action: string;
  summaryAr: string;
  actorLabel: string | null;
  createdAt: string;
}
