import { z } from 'zod';
import { DEFAULT_CASE_NUMBER_TEMPLATE } from '../domain/case-number';
import { optionalEmailSchema, optionalIraqiMobileSchema, optionalText } from './common';

/**
 * Office identity and the settings registry — Phase 14.
 *
 * ## Why one JSON column and not a table per module
 *
 * Settings are read on nearly every request path that renders something (which
 * numerals, which paper size, which case-number template) and written a handful
 * of times per office per year. A table per module turns one row read into six
 * joins to serve a preference that changes annually.
 *
 * The cost of a JSON blob is usually that it becomes untyped mush. That is paid
 * for here by `officeSettingsSchema`: every field has a default, so **reading is
 * total** — `officeSettingsSchema.parse({})` returns a complete, valid settings
 * object. A release that adds a setting needs no data migration; existing
 * offices simply start returning the new default.
 */

// ── Office profile ──────────────────────────────────────────────────────────

export const officeProfileSchema = z.object({
  name: z
    .string({ required_error: 'اسم المكتب مطلوب.' })
    .trim()
    .min(2, 'اسم المكتب قصير جداً.')
    .max(160),
  lawyerName: optionalText(160),
  address: optionalText(400),
  phonePrimary: optionalIraqiMobileSchema,
  phoneSecondary: optionalIraqiMobileSchema,
  email: optionalEmailSchema,
});
export type OfficeProfileInput = z.infer<typeof officeProfileSchema>;

/** The three branding assets a generated document can carry. */
export const BRANDING_ASSETS = ['logo', 'stamp', 'signature'] as const;
export type BrandingAsset = (typeof BRANDING_ASSETS)[number];

export const BRANDING_ASSET_AR: Record<BrandingAsset, string> = {
  logo: 'شعار المكتب',
  stamp: 'الختم',
  signature: 'التوقيع',
};

export const BRANDING_ASSET_HINT_AR: Record<BrandingAsset, string> = {
  logo: 'يظهر في ترويسة كل مستند مطبوع. يُفضّل PNG بخلفية شفافة.',
  stamp: 'يظهر أسفل الوصولات والمخاطبات. يُفضّل PNG بخلفية شفافة.',
  signature: 'توقيع المحامي، يظهر بجانب الختم.',
};

/**
 * Branding images are small and are inlined into every rendered PDF, so the cap
 * is far below the document limit — a 4 MB logo would be embedded in each page
 * of every printout.
 */
export const MAX_BRANDING_BYTES = 1024 * 1024;
export const BRANDING_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const brandingUploadSchema = z.object({
  asset: z.enum(BRANDING_ASSETS),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(BRANDING_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_BRANDING_BYTES),
});
export type BrandingUploadInput = z.infer<typeof brandingUploadSchema>;

export const brandingConfirmSchema = z.object({
  asset: z.enum(BRANDING_ASSETS),
  objectKey: z.string().min(1).max(500),
});
export type BrandingConfirmInput = z.infer<typeof brandingConfirmSchema>;

export interface OfficeProfile {
  id: string;
  name: string;
  lawyerName: string | null;
  address: string | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  email: string | null;
  /** Presigned, short-lived. Null when the asset has not been uploaded. */
  logoUrl: string | null;
  stampUrl: string | null;
  signatureUrl: string | null;
  createdAt: string;
}

// ── Settings registry ───────────────────────────────────────────────────────

export const NUMERAL_STYLES = ['arabic', 'latin'] as const;
export type NumeralStyle = (typeof NUMERAL_STYLES)[number];

export const NUMERAL_STYLE_AR: Record<NumeralStyle, string> = {
  arabic: 'أرقام عربية (١٢٣)',
  latin: 'أرقام لاتينية (123)',
};

export const PAPER_SIZES = ['A4', 'LETTER'] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

export const DENSITY_AR: Record<Density, string> = {
  comfortable: 'مريح',
  compact: 'مضغوط',
};

/**
 * A case-number template must place all three components, or a case number
 * stops being a case number. Enforced here rather than in the UI so the API
 * cannot be talked into storing `{year}` alone.
 */
export const caseNumberTemplateSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .refine((value) => ['{serial}', '{typeCode}', '{year}'].every((token) => value.includes(token)), {
    message: 'يجب أن يحتوي القالب على {serial} و {typeCode} و {year}.',
  });

export const officeSettingsSchema = z.object({
  general: z
    .object({
      /** "دعوى راكدة" threshold. Mirrors Office.inactiveCaseDays, which the monitor reads. */
      inactiveCaseDays: z.number().int().min(7).max(365).default(60),
      /** Sunday in Iraq. Configurable because KRI offices sometimes run Mon–Fri. */
      weekStartsOn: z.number().int().min(0).max(6).default(0),
      weekendDays: z.array(z.number().int().min(0).max(6)).max(3).default([5, 6]),
    })
    .default({}),

  caseNumber: z
    .object({
      template: caseNumberTemplateSchema.default(DEFAULT_CASE_NUMBER_TEMPLATE),
      /** Office-editable type codes (رموز الدعاوى); empty means "use the seed list". */
      typeCodes: z
        .array(z.object({ code: z.string().trim().min(1).max(8), ar: z.string().trim().max(60) }))
        .max(40)
        .default([]),
    })
    .default({}),

  printing: z
    .object({
      paperSize: z.enum(PAPER_SIZES).default('A4'),
      showLogo: z.boolean().default(true),
      showStamp: z.boolean().default(true),
      showSignature: z.boolean().default(false),
      /** Printed at the foot of every generated document. */
      footerNoteAr: z.string().trim().max(300).default(''),
    })
    .default({}),

  finance: z
    .object({
      /** Prefix on the human receipt number, e.g. "و-" → و-000123. */
      receiptPrefix: z.string().trim().max(8).default(''),
      /** Receipt numbers are zero-padded to this width so they sort as text. */
      receiptNumberWidth: z.number().int().min(3).max(10).default(6),
      /** Warn when issuing a receipt would exceed the agreed fee. */
      warnOnOverpayment: z.boolean().default(true),
    })
    .default({}),

  localization: z
    .object({
      numerals: z.enum(NUMERAL_STYLES).default('latin'),
      /** D-06: Hijri is display-only. It is never a stored or queried date. */
      showHijri: z.boolean().default(true),
      density: z.enum(DENSITIES).default('comfortable'),
    })
    .default({}),

  notifications: z
    .object({
      /** Office-wide floor. A user may narrow their quiet hours, never widen past this. */
      quietFrom: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
      quietTo: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
      /** Sent to the office email in addition to each user's own channels. */
      digestEnabled: z.boolean().default(false),
    })
    .default({}),
});

export type OfficeSettings = z.infer<typeof officeSettingsSchema>;

/** The complete, valid settings object an office starts with. */
export const DEFAULT_OFFICE_SETTINGS: OfficeSettings = officeSettingsSchema.parse({});

/**
 * The receipt number as the office prints it.
 *
 * Kept here rather than in the finance schema because both sides of the wire
 * need it and it is driven entirely by settings: the API stamps `numberDisplay`
 * onto every receipt, and the print button uses the same function so the screen
 * and the paper can never disagree.
 */
export function formatReceiptNumber(
  number: number,
  settings: Pick<OfficeSettings['finance'], 'receiptPrefix' | 'receiptNumberWidth'>,
): string {
  return `${settings.receiptPrefix}${String(number).padStart(settings.receiptNumberWidth, '0')}`;
}

/**
 * A settings write is a patch, never a replacement.
 *
 * Two admins editing different sections of the settings screen must not undo
 * each other, and a client built against an older release must not blank a
 * section it does not know about by omitting it.
 */
export const officeSettingsPatchSchema = z
  .object({
    general: officeSettingsSchema.shape.general.removeDefault().partial().optional(),
    caseNumber: officeSettingsSchema.shape.caseNumber.removeDefault().partial().optional(),
    printing: officeSettingsSchema.shape.printing.removeDefault().partial().optional(),
    finance: officeSettingsSchema.shape.finance.removeDefault().partial().optional(),
    localization: officeSettingsSchema.shape.localization.removeDefault().partial().optional(),
    notifications: officeSettingsSchema.shape.notifications.removeDefault().partial().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'لا توجد تغييرات.',
  });

export type OfficeSettingsPatch = z.infer<typeof officeSettingsPatchSchema>;

/**
 * Merge a patch over the current settings, one section deep.
 *
 * Deliberately not a recursive deep-merge: the registry is exactly two levels,
 * and a generic deep-merge would silently do the wrong thing to `typeCodes`,
 * where the client's array must replace rather than concatenate.
 */
export function applySettingsPatch(
  current: OfficeSettings,
  patch: OfficeSettingsPatch,
): OfficeSettings {
  const merged: Record<string, unknown> = { ...current };

  for (const [section, values] of Object.entries(patch)) {
    if (!values) continue;
    merged[section] = {
      ...(current[section as keyof OfficeSettings] as Record<string, unknown>),
      ...(values as Record<string, unknown>),
    };
  }

  // Re-parsed, so a patch cannot produce a settings object the schema rejects.
  return officeSettingsSchema.parse(merged);
}
