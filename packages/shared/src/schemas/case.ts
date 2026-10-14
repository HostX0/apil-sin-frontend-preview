import { z } from 'zod';
import {
  CASE_STATUSES,
  CASE_TYPES,
  PARTY_ROLES,
  PRIORITIES,
  type CaseStatus,
  type CaseType,
  type PartyRole,
  type Priority,
} from '../domain/enums';
import { type TransitionRequirement } from '../domain/case-status-machine';
import { cursorPaginationSchema } from '../api/pagination';
import {
  dateSchema,
  longText,
  optionalDateSchema,
  optionalMoneyStringSchema,
  optionalText,
  requiredText,
  uuidSchema,
  versionSchema,
} from './common';

export const caseNumberPartsSchema = z.object({
  serial: z.coerce
    .number()
    .int()
    .min(1, 'رقم الدعوى مطلوب.')
    .max(9_999_999, 'رقم الدعوى كبير جداً.'),
  typeCode: requiredText('رمز الدعوى', 10),
  year: z.coerce.number().int().min(1950, 'السنة غير صحيحة.').max(2200, 'السنة غير صحيحة.'),
});

export const casePartySchema = z.object({
  id: uuidSchema.optional(),
  name: requiredText('اسم الخصم', 200),
  role: z.enum(PARTY_ROLES).default('DEFENDANT'),
  counselName: optionalText(200),
  address: optionalText(300),
  phone: optionalText(30),
  notes: optionalText(1000),
});
export type CasePartyInput = z.infer<typeof casePartySchema>;

const caseBaseShape = {
  ...caseNumberPartsSchema.shape,
  courtId: uuidSchema,
  caseType: z.enum(CASE_TYPES),
  clientId: uuidSchema,
  clientRole: z.enum(PARTY_ROLES),
  subject: requiredText('موضوع الدعوى', 500),
  openedAt: dateSchema,
  claimValue: optionalMoneyStringSchema,
  judgeName: optionalText(120),
  chamber: optionalText(80),
  priority: z.enum(PRIORITIES).default('NORMAL'),
  opponents: z.array(casePartySchema).max(20).default([]),
  assignedLawyerIds: z.array(uuidSchema).max(10).default([]),
  tagIds: z.array(uuidSchema).max(20).optional(),
};

export const createCaseSchema = z.object({
  ...caseBaseShape,
  assignedLawyerIds: z.array(uuidSchema).min(1, 'اختر المحامي المسؤول عن الدعوى.').max(10),
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export const updateCaseSchema = z.object({ ...caseBaseShape, version: versionSchema });
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;

// ── Status transitions ──────────────────────────────────────────────────────

export const changeCaseStatusSchema = z.object({
  toStatus: z.enum(CASE_STATUSES),
  effectiveAt: dateSchema,
  reason: optionalText(1000),
  nextHearingDate: optionalDateSchema,
  expectedJudgmentDate: optionalDateSchema,
  judgmentDate: optionalDateSchema,
  decisionDate: optionalDateSchema,
  appellateDecisionDate: optionalDateSchema,
  documentId: uuidSchema.optional(),
  acknowledgeWarnings: z.boolean().optional(),
});
export type ChangeCaseStatusInput = z.infer<typeof changeCaseStatusSchema>;

export type TransitionWarning = 'OUTSTANDING_BALANCE' | 'OPEN_HEARINGS' | 'OPEN_TASKS';

export const TRANSITION_WARNING_AR: Record<TransitionWarning, string> = {
  OUTSTANDING_BALANCE: 'توجد أتعاب مستحقة لم تُستوفَ على هذه الدعوى.',
  OPEN_HEARINGS: 'توجد جلسات مجدولة لم تُحسم بعد.',
  OPEN_TASKS: 'توجد مهام مفتوحة مرتبطة بالدعوى.',
};

export const TRANSITION_REQUIREMENT_AR: Record<TransitionRequirement, string> = {
  EFFECTIVE_DATE: 'تاريخ النفاذ',
  REASON: 'السبب',
  NEXT_HEARING_DATE: 'تاريخ الجلسة القادمة',
  EXPECTED_JUDGMENT_DATE: 'التاريخ المتوقع للحكم',
  JUDGMENT_DATE: 'تاريخ الحكم',
  JUDGMENT_RECORD: 'مستند الحكم',
  DECISION_DATE: 'تاريخ القرار',
  DECISION_RECORD: 'مستند القرار',
  APPELLATE_DECISION_DATE: 'تاريخ القرار الاستئنافي',
};

export interface AvailableTransition {
  to: CaseStatus;
  toAr: string;
  triggerAr: string;
  requires: TransitionRequirement[];
  warnings: TransitionWarning[];
}

// ── Power of attorney ───────────────────────────────────────────────────────

const poaObjectSchema = z.object({
  number: requiredText('رقم الوكالة', 50),
  issueDate: dateSchema,
  type: z.enum(['GENERAL', 'SPECIFIC']),
  issuer: optionalText(200),
  certified: z.boolean(),
  certificationDate: optionalDateSchema,
  scope: optionalText(500),
  expiresAt: optionalDateSchema,
  notes: longText(1000),
  documentId: uuidSchema.optional(),
});

type PoaDateValues = {
  issueDate?: string;
  certified?: boolean;
  certificationDate?: string | null;
  expiresAt?: string | null;
};

function validatePoaDates(value: PoaDateValues, ctx: z.RefinementCtx): void {
  if (value.certified === false && value.certificationDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['certificationDate'],
      message: 'لا يمكن إدخال تاريخ تصديق لوكالة غير مصدّقة.',
    });
  }
  if (
    value.issueDate &&
    value.certificationDate &&
    new Date(value.certificationDate).getTime() < new Date(value.issueDate).getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['certificationDate'],
      message: 'تاريخ التصديق لا يمكن أن يسبق تاريخ إصدار الوكالة.',
    });
  }
  if (
    value.issueDate &&
    value.expiresAt &&
    new Date(value.expiresAt).getTime() < new Date(value.issueDate).getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: 'تاريخ انتهاء الوكالة لا يمكن أن يسبق تاريخ إصدارها.',
    });
  }
}

export const createPoaSchema = poaObjectSchema.superRefine(validatePoaDates);
export type CreatePoaInput = z.infer<typeof createPoaSchema>;

/**
 * PATCH semantics need a real distinction between “not supplied” and “clear
 * this nullable field”. `optionalText()` intentionally turns an empty string
 * into undefined, which is right for create forms but made clearing an issuer,
 * expiry or linked document impossible. Nullable patch fields preserve that
 * intent explicitly.
 */
export const updatePoaSchema = poaObjectSchema
  .partial()
  .extend({
    certified: z.boolean(),
    issuer: z.string().trim().max(200).nullable().optional(),
    certificationDate: dateSchema.nullable().optional(),
    scope: z.string().trim().max(500).nullable().optional(),
    expiresAt: dateSchema.nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    documentId: uuidSchema.nullable().optional(),
  })
  .superRefine(validatePoaDates);
export type UpdatePoaInput = z.infer<typeof updatePoaSchema>;

// ── List / search ───────────────────────────────────────────────────────────

export const CASE_SORTS = ['activity', 'recent', 'nextHearing', 'number'] as const;
export type CaseSort = (typeof CASE_SORTS)[number];

export const CASE_SORT_AR: Record<CaseSort, string> = {
  activity: 'آخر نشاط',
  recent: 'الأحدث تسجيلاً',
  nextHearing: 'الجلسة القادمة',
  number: 'رقم الدعوى',
};

const commaSeparated = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((raw) =>
      raw
        ? raw
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(z.enum(values)).optional());

export const listCasesQuerySchema = cursorPaginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  caseType: commaSeparated(CASE_TYPES),
  status: commaSeparated(CASE_STATUSES),
  courtId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  assignedToMe: z.coerce.boolean().optional(),
  isFavorite: z.coerce.boolean().optional(),
  activeOnly: z.coerce.boolean().optional(),
  sort: z.enum(CASE_SORTS).default('activity'),
});
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;

// ── Response shapes ─────────────────────────────────────────────────────────

export interface CaseListItem {
  id: string;
  numberDisplay: string;
  caseType: CaseType;
  status: CaseStatus;
  priority: Priority;
  isFavorite: boolean;
  subject: string;
  clientId: string;
  clientName: string;
  opponentName: string | null;
  courtName: string;
  nextHearingAt: string | null;
  lastActivityAt: string;
}

export interface CaseParty {
  id: string;
  side: 'CLIENT' | 'OPPONENT' | 'OTHER';
  role: PartyRole;
  name: string;
  counselName: string | null;
  address: string | null;
  phone: string | null;
  clientId: string | null;
}

export interface PoaSummary {
  id: string;
  number: string;
  issueDate: string;
  type: 'GENERAL' | 'SPECIFIC';
  issuer: string | null;
  certified: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  certificationDate?: string | null;
  scope?: string | null;
  notes?: string | null;
  documentId?: string | null;
}

export interface CaseStatusHistoryEntry {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  effectiveAt: string;
  reason: string | null;
  documentId?: string | null;
  actorLabel: string | null;
  createdAt: string;
}

export interface CaseComplianceFlags {
  missingFeeAgreement: boolean;
  missingCertifiedPoa: boolean;
  outstandingBalance: string | null;
}

export interface CaseDetail extends CaseListItem {
  serial: number;
  typeCode: string;
  year: number;
  courtId: string;
  clientRole: PartyRole;
  openedAt: string;
  claimValue: string | null;
  judgeName: string | null;
  chamber: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  version: number;
  parties: CaseParty[];
  assignedLawyers: Array<{ id: string; fullName: string; isLead: boolean }>;
  powersOfAttorney: PoaSummary[];
  statusHistory: CaseStatusHistoryEntry[];
  tags: Array<{ id: string; label: string; colorToken: string }>;
  compliance: CaseComplianceFlags;
  counts: { hearings: number; documents: number; tasks: number; notes: number };
}
