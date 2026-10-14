import { z } from 'zod';
import { cursorPaginationSchema } from '../api/pagination';
import { PERMISSIONS, type Permission } from '../auth/permissions';
import { USER_STATUSES, type UserStatus } from '../domain/enums';
import {
  emailSchema,
  optionalEmailSchema,
  optionalDateSchema,
  optionalText,
  requiredText,
  optionalIraqiMobileSchema,
  personNameSchema,
  uuidSchema,
  versionSchema,
} from './common';

/**
 * Users, roles and the audit log — Phase 14's admin console.
 *
 * The permission registry is already data (`@muhami/shared/auth/permissions`),
 * which is what makes custom roles a settings screen rather than a release.
 * Nothing here hard-codes a role name except the two invariants below, and both
 * are security boundaries rather than conveniences:
 *
 *   1. A role's permissions are validated against the registry on write. An
 *      unknown key is rejected, not stored — otherwise a typo becomes a
 *      permanently-denied permission that looks granted on the screen.
 *   2. The last active OWNER cannot be demoted, deactivated or deleted. An
 *      office with no owner has no way back in without database access.
 */

// ── Users ───────────────────────────────────────────────────────────────────

/** The office's active lawyers are also its case-assignment candidates. */
export const LAWYER_ROLE_KEYS = ['OWNER', 'LAWYER'] as const;

export const listLawyersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type ListLawyersQuery = Partial<z.infer<typeof listLawyersQuerySchema>>;

export interface LawyerSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  joinedAt: string | null;
  membershipNumber: string | null;
  photoUrl: string | null;
  isActive: boolean;
  version: number;
  /** Counts only cases visible to the current principal. */
  assignedCaseCount: number;
}

const lawyerProfileShape = {
  fullName: personNameSchema,
  phone: optionalIraqiMobileSchema,
  email: optionalEmailSchema,
  joinedAt: optionalDateSchema,
  membershipNumber: optionalText(100),
  notes: optionalText(2000),
  userId: uuidSchema.nullable().optional(),
};
export const createLawyerSchema = z.object(lawyerProfileShape);
export type CreateLawyerInput = z.infer<typeof createLawyerSchema>;
export const updateLawyerSchema = createLawyerSchema.extend({
  isActive: z.boolean(),
  version: versionSchema,
});
export type UpdateLawyerInput = z.infer<typeof updateLawyerSchema>;
export const LAWYER_ASSET_KINDS = ['photo', 'identity'] as const;
export type LawyerAssetKind = (typeof LAWYER_ASSET_KINDS)[number];
export const LAWYER_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const LAWYER_IDENTITY_MIME_TYPES = ['application/pdf', ...LAWYER_PHOTO_MIME_TYPES] as const;
export const MAX_LAWYER_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_LAWYER_IDENTITY_BYTES = 10 * 1024 * 1024;
export const lawyerAssetUploadSchema = z.object({
  fileName: requiredText('اسم الملف', 255),
  mimeType: z.enum(LAWYER_IDENTITY_MIME_TYPES),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1, 'الملف فارغ.')
    .max(MAX_LAWYER_IDENTITY_BYTES, 'حجم الملف أكبر من الحد المسموح.'),
});
export type LawyerAssetUploadInput = z.infer<typeof lawyerAssetUploadSchema>;
export const lawyerAssetConfirmSchema = lawyerAssetUploadSchema.extend({
  objectKey: requiredText('معرّف الملف', 1000),
  version: versionSchema,
});
export type LawyerAssetConfirmInput = z.infer<typeof lawyerAssetConfirmSchema>;
export interface LawyerAssetMetadata {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface LawyerDetail extends LawyerSummary {
  notes: string | null;
  photo: LawyerAssetMetadata | null;
  identity: LawyerAssetMetadata | null;
}

export const listUsersQuerySchema = cursorPaginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(USER_STATUSES).optional(),
  roleId: uuidSchema.optional(),
  includeDeleted: z.coerce.boolean().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const inviteUserSchema = z.object({
  fullName: personNameSchema,
  email: emailSchema,
  phone: optionalIraqiMobileSchema,
  roleId: uuidSchema,
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z.object({
  fullName: personNameSchema.optional(),
  phone: optionalIraqiMobileSchema,
  roleId: uuidSchema.optional(),
  version: z.coerce.number().int().min(0),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const setUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  version: z.coerce.number().int().min(0),
});
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  roleId: string;
  roleNameAr: string;
  roleKey: string;
  lastLoginAt: string | null;
  activeSessions: number;
  mustChangePassword: boolean;
  version: number;
  createdAt: string;
}

/**
 * The temporary password is returned exactly once, in the response to the
 * invite call, and never stored in readable form or emailed in plaintext by
 * default. The owner reads it out; the invitee must change it on first login.
 */
export interface InviteResult {
  user: UserSummary;
  temporaryPassword: string;
  /** False when SMTP is not configured — the UI must then show the password. */
  emailSent: boolean;
}

// ── Roles ───────────────────────────────────────────────────────────────────

/** A custom role key: uppercase ASCII, so it can never collide with a system key by accident. */
export const roleKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(32)
  .regex(/^[A-Z][A-Z0-9_]*$/, 'رمز الدور يجب أن يكون بأحرف لاتينية كبيرة.');

const permissionListSchema = z
  .array(z.enum(PERMISSIONS as unknown as [Permission, ...Permission[]]))
  .max(PERMISSIONS.length)
  // Duplicates are a client bug, not a user error — collapse rather than reject.
  .transform((values) => [...new Set(values)]);

export const createRoleSchema = z.object({
  key: roleKeySchema,
  nameAr: z.string().trim().min(2, 'اسم الدور مطلوب.').max(80),
  descriptionAr: z.string().trim().max(300).optional(),
  permissions: permissionListSchema,
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  nameAr: z.string().trim().min(2).max(80).optional(),
  descriptionAr: z.string().trim().max(300).optional(),
  permissions: permissionListSchema.optional(),
  version: z.coerce.number().int().min(0),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export interface RoleSummary {
  id: string;
  key: string;
  nameAr: string;
  descriptionAr: string | null;
  permissions: Permission[];
  isSystem: boolean;
  /** Drives "cannot delete a role that is in use". */
  userCount: number;
  version: number;
}

// ── Audit log ───────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'RESTORE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'PASSWORD_RESET',
  'PERMISSION_CHANGE',
  'SESSION_REVOKE',
  'EXPORT',
  'DOWNLOAD',
  'STATUS_CHANGE',
  'VOID',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_AR: Record<AuditAction, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  RESTORE: 'استرجاع',
  LOGIN: 'تسجيل دخول',
  LOGIN_FAILED: 'محاولة دخول فاشلة',
  LOGOUT: 'تسجيل خروج',
  PASSWORD_CHANGE: 'تغيير كلمة المرور',
  PASSWORD_RESET: 'إعادة تعيين كلمة المرور',
  PERMISSION_CHANGE: 'تغيير صلاحيات',
  SESSION_REVOKE: 'إنهاء جلسة',
  EXPORT: 'تصدير',
  DOWNLOAD: 'تنزيل',
  STATUS_CHANGE: 'تغيير حالة',
  VOID: 'إلغاء',
};

/** Entity type names as written by the audit extension, with Arabic labels for the screen. */
export const AUDIT_ENTITY_AR: Record<string, string> = {
  Office: 'المكتب',
  User: 'مستخدم',
  Role: 'دور',
  Session: 'جلسة',
  Client: 'موكّل',
  Case: 'دعوى',
  CaseParty: 'طرف في دعوى',
  PowerOfAttorney: 'وكالة',
  Hearing: 'جلسة محكمة',
  CalendarEvent: 'حدث',
  Task: 'مهمة',
  Document: 'مستند',
  FeeAgreement: 'عقد أتعاب',
  Invoice: 'وصل قبض',
  Payment: 'دفعة',
  Expense: 'مصروف',
  Note: 'ملاحظة',
  Court: 'محكمة',
  SavedSearch: 'بحث محفوظ',
};

export const listAuditQuerySchema = cursorPaginationSchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  actorId: uuidSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export interface AuditEntryItem {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  summaryAr: string | null;
  actorId: string | null;
  actorLabel: string | null;
  ip: string | null;
  /** Field-level diff, already redacted server-side. */
  changes: Array<{ field: string; before: string | null; after: string | null }>;
  createdAt: string;
}

// ── Sessions (the "my devices" screen) ──────────────────────────────────────

export interface SessionSummary {
  id: string;
  deviceLabel: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  /** True for the session making the request — it is labelled, not hidden. */
  current: boolean;
}
