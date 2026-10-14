import { z } from 'zod';
import {
  emailSchema,
  optionalIraqiMobileSchema,
  personNameSchema,
  requiredText,
  versionSchema,
} from './common';
import { type Permission } from '../auth/permissions';

/**
 * Password policy, shared by the registration form and the API.
 *
 * Length over composition: a 10-character minimum with a rejection list beats
 * the classic "one uppercase, one symbol" rule, which mostly produces
 * `Password1!` and a sticky note.
 */
const WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  '1234567890',
  '12345678',
  'qwertyuiop',
  'muhami1234',
  'iraq123456',
]);

export const passwordSchema = z
  .string({ required_error: 'كلمة المرور مطلوبة.' })
  .min(10, 'كلمة المرور يجب ألا تقل عن ١٠ خانات.')
  .max(128, 'كلمة المرور طويلة جداً.')
  .refine((value) => !WEAK_PASSWORDS.has(value.toLowerCase()), {
    message: 'كلمة المرور شائعة جداً. اختر كلمة مرور أقوى.',
  })
  .refine((value) => !/^(.)\1+$/.test(value), {
    message: 'كلمة المرور ضعيفة جداً.',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredText('كلمة المرور', 128),
  /** Older clients keep persistent login; explicit false uses browser-session cookies. */
  rememberMe: z.boolean().default(true),
  /** Optional device label so the sessions screen reads like a human wrote it. */
  deviceLabel: z.string().trim().max(120).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Office bootstrap: creates the office, the seed roles and the first OWNER. */
export const registerOfficeSchema = z.object({
  officeName: requiredText('اسم المكتب', 200),
  lawyerName: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: optionalIraqiMobileSchema,
});
export type RegisterOfficeInput = z.infer<typeof registerOfficeSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: requiredText('كلمة المرور الحالية', 128),
    newPassword: passwordSchema,
    confirmPassword: requiredText('تأكيد كلمة المرور', 128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين.',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية.',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: requiredText('الرمز', 200),
    newPassword: passwordSchema,
    confirmPassword: requiredText('تأكيد كلمة المرور', 128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين.',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── My account ─────────────────────────────────────────────────────────────

export const accountProfileSchema = z.object({
  fullName: personNameSchema,
  phone: optionalIraqiMobileSchema,
  version: versionSchema,
});
export type AccountProfileInput = z.infer<typeof accountProfileSchema>;

export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const avatarUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(AVATAR_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_AVATAR_BYTES),
});
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;

export const avatarConfirmSchema = z.object({
  objectKey: z.string().min(1).max(500),
  mimeType: z.enum(AVATAR_MIME_TYPES),
});
export type AvatarConfirmInput = z.infer<typeof avatarConfirmSchema>;

export interface AccountProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  version: number;
}

// `inviteUserSchema` was declared here in Phase 2 as a placeholder. It now lives
// in ./admin alongside the service that consumes it — this file is about
// authenticating, not administering.

/** The authenticated principal as returned by GET /auth/me. */
export interface AuthenticatedUser {
  id: string;
  officeId: string;
  officeName: string;
  email: string;
  fullName: string;
  roleId: string;
  roleKey: string;
  roleNameAr: string;
  permissions: Permission[];
  mustChangePassword: boolean;
  preferences: Record<string, unknown>;
}

export interface AuthTokens {
  accessToken: string;
  /** Seconds until the access token expires — the client refreshes ahead of this. */
  expiresIn: number;
}
