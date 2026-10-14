import { z } from 'zod';
import {
  EXPENSE_CATEGORIES,
  FEE_MODELS,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type FeeModel,
  type PaymentMethod,
} from '../domain/enums';
import { cursorPaginationSchema } from '../api/pagination';
import {
  dateSchema,
  longText,
  moneyStringSchema,
  optionalDateSchema,
  optionalMoneyStringSchema,
  optionalText,
  requiredText,
  uuidSchema,
} from './common';

/**
 * Finance — Phase 9.
 *
 * Three invariants govern everything in this file, and each one is enforced by
 * the API rather than by convention:
 *
 *   1. Money is a `bigint` count of minor units and crosses the wire as a
 *      decimal string. Never a JSON number (ADR-004).
 *   2. A receipt is immutable once issued. Corrections are a void or a credit
 *      note — never an edit. An editable receipt is not evidence.
 *   3. Receipt numbers are gapless and unique per office, even under concurrent
 *      issuance.
 */

// ── Fee agreements ──────────────────────────────────────────────────────────

export const feeInstallmentSchema = z.object({
  label: requiredText('وصف القسط', 120),
  amount: moneyStringSchema,
  dueAt: optionalDateSchema,
});
export type FeeInstallmentInput = z.infer<typeof feeInstallmentSchema>;

export const createFeeAgreementSchema = z
  .object({
    caseId: uuidSchema,
    model: z.enum(FEE_MODELS),
    /** Required for FIXED and STAGED; omitted for PERCENTAGE. */
    totalAmount: optionalMoneyStringSchema,
    /** Basis points (1% = 100). Integer, never a float. */
    percentageBps: z.coerce.number().int().min(1).max(10_000).optional(),
    signedAt: optionalDateSchema,
    notes: longText(2000),
    documentId: uuidSchema.optional(),
    installments: z.array(feeInstallmentSchema).max(24).default([]),
  })
  .refine((value) => value.model === 'PERCENTAGE' || Boolean(value.totalAmount), {
    path: ['totalAmount'],
    message: 'قيمة الأتعاب مطلوبة.',
  })
  .refine((value) => value.model !== 'PERCENTAGE' || Boolean(value.percentageBps), {
    path: ['percentageBps'],
    message: 'النسبة المئوية مطلوبة.',
  })
  .refine((value) => value.model !== 'STAGED' || value.installments.length > 0, {
    path: ['installments'],
    message: 'يجب إضافة قسط واحد على الأقل للأتعاب المرحلية.',
  });
export type CreateFeeAgreementInput = z.infer<typeof createFeeAgreementSchema>;

// ── Receipts (invoices) ─────────────────────────────────────────────────────

export const issueReceiptSchema = z.object({
  clientId: uuidSchema,
  caseId: uuidSchema.optional(),
  amount: moneyStringSchema.refine((value) => BigInt(value) > 0n, {
    message: 'المبلغ يجب أن يكون أكبر من صفر.',
  }),
  description: requiredText('البيان', 300),
  issuedAt: dateSchema,
  /**
   * Required for money-affecting writes. A retried request with the same key
   * returns the original receipt instead of minting a second number — the
   * difference between a dropped connection and a duplicate charge.
   */
  idempotencyKey: z.string().min(8).max(120),
});
export type IssueReceiptInput = z.infer<typeof issueReceiptSchema>;

export const voidReceiptSchema = z.object({
  reason: requiredText('سبب الإلغاء', 300),
});
export type VoidReceiptInput = z.infer<typeof voidReceiptSchema>;

export const creditNoteSchema = z.object({
  /** How much to reverse. May be less than the original for a partial correction. */
  amount: moneyStringSchema.refine((value) => BigInt(value) > 0n, {
    message: 'المبلغ يجب أن يكون أكبر من صفر.',
  }),
  reason: requiredText('سبب سند التصحيح', 300),
  issuedAt: dateSchema,
  idempotencyKey: z.string().min(8).max(120),
});
export type CreditNoteInput = z.infer<typeof creditNoteSchema>;

// ── Payments ────────────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  invoiceId: uuidSchema,
  amount: moneyStringSchema.refine((value) => BigInt(value) > 0n, {
    message: 'المبلغ يجب أن يكون أكبر من صفر.',
  }),
  method: z.enum(PAYMENT_METHODS),
  paidAt: dateSchema,
  reference: optionalText(120),
  notes: longText(1000),
  idempotencyKey: z.string().min(8).max(120),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// ── Expenses ────────────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  /** Optional for older clients; new forms reuse this key after a dropped response. */
  idempotencyKey: z.string().min(8).max(120).optional(),
  caseId: uuidSchema.optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: moneyStringSchema.refine((value) => BigInt(value) > 0n, {
    message: 'المبلغ يجب أن يكون أكبر من صفر.',
  }),
  spentAt: dateSchema,
  description: requiredText('البيان', 300),
  /** Recoverable from the client as part of the cost of the case. */
  billable: z.boolean().default(true),
  receiptDocumentId: uuidSchema.optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.extend({
  version: z.coerce.number().int().min(0),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// ── Queries ─────────────────────────────────────────────────────────────────

export const listReceiptsQuerySchema = cursorPaginationSchema.extend({
  clientId: uuidSchema.optional(),
  caseId: uuidSchema.optional(),
  /** Only receipts still owing money. Drives the Outstanding Fees ledger. */
  outstandingOnly: z.coerce.boolean().optional(),
  includeVoided: z.coerce.boolean().optional(),
  from: optionalDateSchema,
  to: optionalDateSchema,
});
export type ListReceiptsQuery = z.infer<typeof listReceiptsQuerySchema>;

export const listExpensesQuerySchema = cursorPaginationSchema.extend({
  caseId: uuidSchema.optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  billableOnly: z.coerce.boolean().optional(),
  from: optionalDateSchema,
  to: optionalDateSchema,
});
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

// ── Response shapes ─────────────────────────────────────────────────────────

export interface PaymentSummary {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  reference: string | null;
  receivedBy: string | null;
}

export interface ReceiptSummary {
  id: string;
  /** The gapless sequence value. Sorts and compares; never shown on its own. */
  number: number;
  /**
   * The number as the office prints it — prefix and zero-padding applied
   * (Phase 14 settings). Computed on read, never stored: changing the prefix
   * must re-label the whole receipt book, not create two eras of numbering.
   */
  numberDisplay: string;
  clientId: string;
  clientName: string;
  caseId: string | null;
  caseNumber: string | null;
  amount: string;
  paidAmount: string;
  outstanding: string;
  description: string;
  status: 'ISSUED' | 'VOIDED';
  issuedAt: string;
  issuedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  /** Set on a credit note, pointing at the receipt it corrects. */
  correctsInvoiceId: string | null;
  isCreditNote: boolean;
  payments: PaymentSummary[];
}

export interface ExpenseSummary {
  id: string;
  caseId: string | null;
  caseNumber: string | null;
  category: ExpenseCategory;
  amount: string;
  spentAt: string;
  description: string;
  billable: boolean;
  paidBy: string | null;
  version: number;
}

export interface FeeAgreementSummary {
  id: string;
  caseId: string;
  model: FeeModel;
  totalAmount: string | null;
  percentageBps: number | null;
  signedAt: string | null;
  notes: string | null;
  installments: Array<{
    id: string;
    sequence: number;
    label: string;
    amount: string;
    dueAt: string | null;
  }>;
}

/**
 * One balance shape for every scope — case, client and office.
 *
 * Deliberately identical so the three views are provably the same calculation
 * rather than three implementations that happen to agree today.
 */
export interface Balance {
  /** Σ issued receipts, including negative credit notes. */
  invoiced: string;
  /** Σ payments received against them. */
  paid: string;
  /** invoiced − paid. Never derived any other way. */
  outstanding: string;
  expenses: string;
  billableExpenses: string;
  receiptCount: number;
}

export interface OfficeFinanceSummary extends Balance {
  /** Top debtors, for the Outstanding Fees ledger. */
  topOutstandingClients: Array<{
    clientId: string;
    clientName: string;
    outstanding: string;
  }>;
  expensesByCategory: Array<{ category: ExpenseCategory; total: string }>;
}

export const setCaseFeeSchema = z
  .object({
    totalAmount: moneyStringSchema.refine((value) => BigInt(value) >= 0n, {
      message: 'الأتعاب لا يمكن أن تكون سالبة.',
    }),
    agreementId: uuidSchema.optional(),
    version: z.coerce.number().int().min(0).optional(),
  })
  .refine((value) => Boolean(value.agreementId) === (value.version !== undefined), {
    path: ['version'],
    message: 'إصدار عقد الأتعاب مطلوب عند تعديله.',
  });
export type SetCaseFeeInput = z.infer<typeof setCaseFeeSchema>;

export const recordCasePaymentSchema = recordPaymentSchema.omit({ invoiceId: true });
export type RecordCasePaymentInput = z.infer<typeof recordCasePaymentSchema>;

export interface CaseFeeSummary {
  caseId: string;
  caseNumber: string;
  clientName: string;
  agreed: string;
  received: string;
  remaining: string;
  overpaid: string;
  hasUnpricedAgreement: boolean;
  hasAgreement: boolean;
  editableAgreement: { id: string; version: number } | null;
  payments: Array<
    PaymentSummary & { invoiceId: string; receiptNumber: number; notes: string | null }
  >;
}
