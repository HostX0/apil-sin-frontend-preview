import { z } from 'zod';
import { DOCUMENT_TYPES, type DocumentType } from '../domain/enums';
import { cursorPaginationSchema } from '../api/pagination';
import { longText, optionalDateSchema, requiredText, uuidSchema } from './common';

/**
 * Documents — Phase 8.
 *
 * Upload is a three-step handshake so file bytes never pass through the API:
 *
 *   1. POST /documents/upload-init  → the API validates type and size, then
 *                                     returns a short-lived presigned PUT URL
 *   2. PUT <presigned url>          → the browser sends bytes straight to
 *                                     object storage, with progress
 *   3. POST /documents              → the API verifies the object really landed
 *                                     and records the metadata
 *
 * Step 3 verifies rather than trusts: without a HEAD against storage, a client
 * could register metadata for a file it never uploaded, or lie about its size.
 */

/** What the product accepts. Anything else is rejected before a URL is issued. */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_LABEL_AR: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'صورة',
  'image/png': 'صورة',
  'image/webp': 'صورة',
  'image/heic': 'صورة',
  'image/heif': 'صورة',
  'application/msword': 'مستند Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'مستند Word',
  'application/vnd.ms-excel': 'جدول Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'جدول Excel',
};

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** Type guard, so the allow-list check narrows instead of needing a cast. */
export function isAllowedMime(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export const uploadInitSchema = z.object({
  fileName: requiredText('اسم الملف', 255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'نوع الملف غير مدعوم.' }),
  }),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1, 'الملف فارغ.')
    .max(200 * 1024 * 1024, 'حجم الملف أكبر من الحد المسموح.'),
});
export type UploadInitInput = z.infer<typeof uploadInitSchema>;

export interface UploadTicket {
  /** Presigned PUT. Short-lived and single-purpose. */
  uploadUrl: string;
  /** Opaque storage key, returned to the API in step 3. */
  objectKey: string;
  expiresInSeconds: number;
  /** Must be sent as Content-Type on the PUT or the signature will not match. */
  requiredContentType: string;
}

const documentBaseShape = {
  title: requiredText('عنوان المستند', 200),
  docType: z.enum(DOCUMENT_TYPES),
  caseId: uuidSchema.optional(),
  transactionId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  issueDate: optionalDateSchema,
  /** Drives the Phase 13 document-expiry reminder. */
  expiryDate: optionalDateSchema,
  notes: longText(2000),
  tagIds: z.array(uuidSchema).max(20).optional(),
};

type DocumentAssociationAndDates = {
  caseId?: string;
  transactionId?: string;
  clientId?: string;
  issueDate?: string;
  expiryDate?: string;
};

/**
 * Shared metadata invariants for create and update.
 *
 * The old update schema omitted the create-time attachment requirement, which
 * meant editing a document could strand it outside both a case and a client.
 * Expiry also cannot precede issue: that creates impossible compliance data and
 * fires reminders for a document that, legally, did not exist yet.
 */
function validateDocumentMetadata(value: DocumentAssociationAndDates, ctx: z.RefinementCtx): void {
  if (!value.caseId && !value.transactionId && !value.clientId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['caseId'],
      message: 'يجب ربط المستند بدعوى أو معاملة أو موكّل.',
    });
  }
  if (value.caseId && value.transactionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['transactionId'],
      message: 'اختر دعوى أو معاملة واحدة للمستند.',
    });
  }

  if (
    value.issueDate &&
    value.expiryDate &&
    new Date(value.expiryDate).getTime() < new Date(value.issueDate).getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiryDate'],
      message: 'تاريخ انتهاء المستند لا يمكن أن يسبق تاريخ إصداره.',
    });
  }
}

export const createDocumentSchema = z
  .object({
    ...documentBaseShape,
    objectKey: requiredText('مفتاح الملف', 500),
    fileName: requiredText('اسم الملف', 255),
    mimeType: z.enum(ALLOWED_MIME_TYPES),
    sizeBytes: z.coerce.number().int().min(1),
    /** SHA-256 of the bytes, computed in the browser. Optional but recorded. */
    checksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, 'بصمة الملف غير صحيحة.')
      .optional(),
    pageCount: z.coerce.number().int().min(1).max(5000).optional(),
    /** Object key of a client-generated thumbnail, when one was produced. */
    thumbnailKey: z.string().max(500).optional(),
  })
  .superRefine(validateDocumentMetadata);
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z
  .object({
    ...documentBaseShape,
    version: z.coerce.number().int().min(0),
  })
  .superRefine(validateDocumentMetadata);
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

/** Adding a revision to an existing document. Prior versions are never deleted. */
export const addVersionSchema = z.object({
  objectKey: requiredText('مفتاح الملف', 500),
  fileName: requiredText('اسم الملف', 255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  sizeBytes: z.coerce.number().int().min(1),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
  pageCount: z.coerce.number().int().min(1).max(5000).optional(),
  thumbnailKey: z.string().max(500).optional(),
  note: longText(500),
});
export type AddVersionInput = z.infer<typeof addVersionSchema>;

export const DOCUMENT_SORTS = ['recent', 'title', 'expiry'] as const;
export type DocumentSort = (typeof DOCUMENT_SORTS)[number];

export const DOCUMENT_SORT_AR: Record<DocumentSort, string> = {
  recent: 'الأحدث رفعاً',
  title: 'العنوان',
  expiry: 'الأقرب انتهاءً',
};

export const listDocumentsQuerySchema = cursorPaginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  docType: z.enum(DOCUMENT_TYPES).optional(),
  caseId: uuidSchema.optional(),
  transactionId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  /** Only documents whose expiry has passed or is near. */
  expiringWithinDays: z.coerce.number().int().min(0).max(3650).optional(),
  sort: z.enum(DOCUMENT_SORTS).default('recent'),
});
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export const downloadQuerySchema = z.object({
  /** `inline` previews in the browser; `attachment` forces a save. */
  disposition: z.enum(['inline', 'attachment']).default('inline'),
  versionId: uuidSchema.optional(),
});
export type DownloadQuery = z.infer<typeof downloadQuerySchema>;

// ── Response shapes ─────────────────────────────────────────────────────────

export interface DocumentVersionSummary {
  id: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  pageCount: number | null;
  createdAt: string;
  uploadedBy: string | null;
}

export interface DocumentListItem {
  id: string;
  title: string;
  docType: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  pageCount: number | null;
  hasThumbnail: boolean;
  caseId: string | null;
  transactionId: string | null;
  caseNumber: string | null;
  clientId: string | null;
  clientName: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  versionCount: number;
  createdAt: string;
}

export interface DocumentDetail extends DocumentListItem {
  notes: string | null;
  version: number;
  uploadedBy: string | null;
  versions: DocumentVersionSummary[];
  tags: Array<{ id: string; label: string; colorToken: string }>;
}

export interface DownloadTicket {
  url: string;
  expiresInSeconds: number;
  fileName: string;
  mimeType: string;
}

/** Human file size in Arabic. Presentation only. */
export function formatFileSize(bytes: number | string): string {
  const value = typeof bytes === 'string' ? Number.parseInt(bytes, 10) : bytes;
  if (!Number.isFinite(value) || value <= 0) return '0 بايت';

  const units = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / Math.pow(1024, exponent);

  return `${exponent === 0 ? size : size.toFixed(1)} ${units[exponent]}`;
}
