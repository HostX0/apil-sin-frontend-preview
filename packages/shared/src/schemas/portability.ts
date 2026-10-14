import { z } from 'zod';

/**
 * Data portability — Phase 17.
 *
 * ## Why this exists at all
 *
 * A law office's data is its practice. If the only way out of this system is a
 * database dump that needs an engineer, the office is captive — and an Iraqi
 * sole practitioner has no engineer. So the export is a single self-describing
 * file that a person can open, and the import can rebuild an office from it
 * with no access to the original server.
 *
 * It is also the disaster-recovery path. `pg_dump` is faster and more complete,
 * and the runbook says to use it for infrastructure recovery — but it restores
 * only onto the same PostgreSQL major version with the same extensions, and it
 * cannot move one office out of a shared database. This can.
 *
 * ## What the archive deliberately does not contain
 *
 *   • password hashes, refresh tokens, password-reset tokens — an export is a
 *     file that gets emailed and left on a desktop; it must not be a set of
 *     credentials. Imported users are created suspended with no password.
 *   • document *bytes*. They live in object storage and can be gigabytes;
 *     pushing them through the API would violate ADR-006 and produce a file
 *     nothing can open. The archive records every object key, and the runbook
 *     covers mirroring the bucket alongside it. An import with no matching
 *     bucket restores every document's metadata and marks its file missing,
 *     which is honest and recoverable — silently dropping the rows would not be.
 */

/**
 * Bumped whenever the archive shape changes incompatibly.
 *
 * The importer refuses a version it does not know rather than guessing. An
 * import that half-works is worse than one that declines.
 */
export const ARCHIVE_FORMAT_VERSION = 1;

export const EXPORT_FORMATS = ['json', 'csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_AR: Record<ExportFormat, string> = {
  json: 'أرشيف كامل (JSON)',
  csv: 'جداول للاستعراض (CSV)',
};

export const EXPORT_FORMAT_HINT_AR: Record<ExportFormat, string> = {
  json: 'كل بيانات المكتب في ملف واحد، قابل للاستيراد في نظام آخر أو لاستعادة المكتب.',
  csv: 'ملفات جداول منفصلة للموكّلين والدعاوى والجلسات والمالية، للفتح في Excel.',
};

export const exportRequestSchema = z.object({
  format: z.enum(EXPORT_FORMATS).default('json'),
  /** Archived cases and soft-deleted rows. Off by default: most exports are for migration. */
  includeArchived: z.coerce.boolean().default(false),
  includeDeleted: z.coerce.boolean().default(false),
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

/**
 * The archive header.
 *
 * Written first and read first. `counts` is what makes a restore verifiable:
 * the importer compares what it inserted against what the manifest promised and
 * reports any shortfall instead of declaring success.
 */
export interface ArchiveManifest {
  formatVersion: number;
  /** The app version that produced it, for support. */
  appVersion: string;
  exportedAt: string;
  office: {
    id: string;
    name: string;
    lawyerName: string | null;
  };
  counts: Record<string, number>;
  /** SHA-256 over the serialised `data` section. Detects truncation and edits. */
  checksum: string;
  notes: string[];
}

export interface OfficeArchive {
  manifest: ArchiveManifest;
  data: Record<string, unknown[]>;
}

// ── Import ──────────────────────────────────────────────────────────────────

export const IMPORT_MODES = ['NEW_OFFICE', 'INTO_EMPTY'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_MODE_AR: Record<ImportMode, string> = {
  NEW_OFFICE: 'إنشاء مكتب جديد من الأرشيف',
  INTO_EMPTY: 'استيراد إلى هذا المكتب (يجب أن يكون فارغاً)',
};

export const importRequestSchema = z.object({
  mode: z.enum(IMPORT_MODES),
  /**
   * Required for INTO_EMPTY. The client must echo the office name back, the
   * same way a destructive action asks you to type the name — an import into a
   * live office is not recoverable by pressing undo.
   */
  confirmOfficeName: z.string().trim().max(160).optional(),
});
export type ImportRequest = z.infer<typeof importRequestSchema>;

export interface ImportReport {
  officeId: string;
  mode: ImportMode;
  /** Per table: what the manifest promised versus what landed. */
  inserted: Record<string, number>;
  expected: Record<string, number>;
  /** Rows skipped with the reason, e.g. a case pointing at a missing client. */
  skipped: Array<{ table: string; count: number; reasonAr: string }>;
  /** Referenced files absent from this deployment (documents, lawyer assets, message attachments). */
  missingFiles: number;
  warningsAr: string[];
}

// ── Backups ─────────────────────────────────────────────────────────────────

export interface BackupSummary {
  id: string;
  objectKey: string;
  sizeBytes: number;
  createdAt: string;
  createdBy: string | null;
  counts: Record<string, number>;
}

export const listBackupsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListBackupsQuery = z.infer<typeof listBackupsQuerySchema>;

/** The Arabic label for each exported table, used by the UI and the CSV bundle. */
export const ARCHIVE_TABLE_AR: Record<string, string> = {
  lawyers: 'المحامون',
  transactions: 'المعاملات',
  financeAccounts: 'الملفات المالية',
  financeMovements: 'دفعات ومصاريف الملفات المالية',
  whatsAppAutomations: 'قوالب رسائل واتساب التلقائية',
  whatsAppMessages: 'سجل رسائل واتساب',
  office: 'المكتب',
  roles: 'الأدوار',
  users: 'المستخدمون',
  courts: 'المحاكم',
  clients: 'الموكّلون',
  cases: 'الدعاوى',
  caseParties: 'أطراف الدعاوى',
  caseAssignments: 'تكليفات المحامين',
  caseStatusHistory: 'سجل حالات الدعاوى',
  powersOfAttorney: 'الوكالات',
  hearings: 'الجلسات',
  calendarEvents: 'أحداث التقويم',
  tasks: 'المهام',
  documents: 'المستندات',
  feeAgreements: 'عقود الأتعاب',
  feeInstallments: 'أقساط الأتعاب',
  invoices: 'الوصولات',
  payments: 'الدفعات',
  expenses: 'المصروفات',
  notes: 'الملاحظات',
  tags: 'الوسوم',
  tagAssignments: 'ربط الوسوم',
  savedSearches: 'عمليات البحث المحفوظة',
  deadlineRules: 'قواعد المدد القانونية',
};
