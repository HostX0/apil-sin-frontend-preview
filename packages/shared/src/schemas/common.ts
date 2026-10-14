import { z } from 'zod';
import { normalizeArabic } from '../text/arabic';
import { parseIraqiMobile } from '../text/phone';

/**
 * Reusable field schemas with Arabic messages.
 *
 * These are consumed by the NestJS validation pipe AND by React Hook Form, so a
 * rule can never be enforced on one side and not the other.
 */

export const uuidSchema = z.string().uuid({ message: 'معرّف غير صالح.' });

export const requiredText = (label: string, max = 500) =>
  z
    .string({ required_error: `${label} مطلوب.`, invalid_type_error: `${label} غير صالح.` })
    .trim()
    .min(1, `${label} مطلوب.`)
    .max(max, `${label} يتجاوز الحد المسموح (${max} حرفاً).`);

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `النص يتجاوز الحد المسموح (${max} حرفاً).`)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const longText = (max = 5000) => optionalText(max);

/** Full name: at least two characters after normalisation, so "أ" is rejected. */
export const personNameSchema = requiredText('الاسم الكامل', 200).refine(
  (value) => normalizeArabic(value).replace(/\s/g, '').length >= 2,
  { message: 'الاسم قصير جداً.' },
);

/** Iraqi mobile — normalised to E.164 on parse, so the API never stores a variant. */
export const iraqiMobileSchema = z
  .string({ required_error: 'رقم الموبايل مطلوب.' })
  .trim()
  .transform((value, ctx) => {
    const parsed = parseIraqiMobile(value);
    if (!parsed.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          parsed.reason === 'EMPTY'
            ? 'رقم الموبايل مطلوب.'
            : 'رقم الموبايل غير صحيح. الصيغة المتوقعة: 07XXXXXXXXX',
      });
      return z.NEVER;
    }
    return parsed.e164;
  });

export const optionalIraqiMobileSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const parsed = parseIraqiMobile(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'رقم الهاتف غير صحيح.' });
      return z.NEVER;
    }
    return parsed.e164;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'صيغة البريد الإلكتروني غير صحيحة.' });

export const optionalEmailSchema = emailSchema
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Money crosses the wire as a decimal string of minor units (ADR-004). */
export const moneyStringSchema = z.string().superRefine((value, context) => {
  // Abort before money-specific refinements call BigInt on malformed input.
  if (!/^-?\d+$/.test(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'قيمة مالية غير صحيحة.',
      fatal: true,
    });
    return z.NEVER;
  }
  if (
    value.length > 20 ||
    BigInt(value) < -9223372036854775808n ||
    BigInt(value) > 9223372036854775807n
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'القيمة المالية كبيرة جداً.',
      fatal: true,
    });
    return z.NEVER;
  }
});

export const optionalMoneyStringSchema = moneyStringSchema.optional();

/** ISO date-time, or a bare date which is interpreted as Baghdad midnight. */
export const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'تاريخ غير صحيح.' });

export const optionalDateSchema = dateSchema
  .optional()
  .or(z.literal('').transform(() => undefined));

/** "2025-08-12" — the Baghdad calendar day key used by the calendar UI. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD.');

/** Optimistic concurrency token sent back on every update. */
export const versionSchema = z.coerce.number().int().min(0);

export const idParamSchema = z.object({ id: uuidSchema });
