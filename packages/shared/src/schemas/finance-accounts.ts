import { z } from 'zod';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type PaymentMethod,
} from '../domain/enums';
import {
  dateSchema,
  dateKeySchema,
  longText,
  moneyStringSchema,
  optionalDateSchema,
  optionalText,
  requiredText,
  uuidSchema,
  versionSchema,
} from './common';

const accountFields = {
  title: requiredText('عنوان الملف المالي', 200),
  partyName: optionalText(200),
  totalAmount: moneyStringSchema.refine((value) => BigInt(value) >= 0n, {
    message: 'الأتعاب لا يمكن أن تكون سالبة.',
  }),
  notes: longText(2000),
  dueAt: optionalDateSchema,
};

export const createFinanceAccountSchema = z
  .object({
    ...accountFields,
    clientId: uuidSchema.optional(),
    transactionId: uuidSchema.optional(),
    idempotencyKey: z.string().min(8).max(120),
  })
  .strict();
export type CreateFinanceAccountInput = z.infer<typeof createFinanceAccountSchema>;

// Links belong to the file's identity and cannot be reassigned by editing fees.
export const updateFinanceAccountSchema = z
  .object({ ...accountFields, version: versionSchema })
  .strict();
export type UpdateFinanceAccountInput = z.infer<typeof updateFinanceAccountSchema>;

export const createFinanceMovementSchema = z
  .object({
    kind: z.enum(['PAYMENT', 'EXPENSE']),
    amount: moneyStringSchema.refine((value) => BigInt(value) > 0n, {
      message: 'المبلغ يجب أن يكون أكبر من صفر.',
    }),
    occurredAt: dateSchema,
    description: requiredText('البيان', 300),
    method: z.enum(PAYMENT_METHODS).optional(),
    reference: optionalText(120),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    billable: z.boolean().default(false),
    idempotencyKey: z.string().min(8).max(120),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === 'PAYMENT') {
      if (!value.method)
        ctx.addIssue({ code: 'custom', path: ['method'], message: 'اختر طريقة الاستلام.' });
      if (value.category || value.billable)
        ctx.addIssue({
          code: 'custom',
          path: ['category'],
          message: 'التصنيف والاسترداد من الموكل خاصان بالمصروف.',
        });
    } else {
      if (!value.category)
        ctx.addIssue({ code: 'custom', path: ['category'], message: 'اختر نوع المصروف.' });
      if (value.method || value.reference)
        ctx.addIssue({
          code: 'custom',
          path: ['method'],
          message: 'طريقة الاستلام والمرجع خاصان بالدفعة.',
        });
    }
  });
export type CreateFinanceMovementInput = z.infer<typeof createFinanceMovementSchema>;
export const voidFinanceMovementSchema = z
  .object({ reason: requiredText('سبب الإلغاء', 300) })
  .strict();
export type VoidFinanceMovementInput = z.infer<typeof voidFinanceMovementSchema>;
export const listFinanceAccountsQuerySchema = z
  .object({ clientId: uuidSchema.optional(), transactionId: uuidSchema.optional() })
  .strict();
export type ListFinanceAccountsQuery = z.infer<typeof listFinanceAccountsQuerySchema>;

const financialDaySchema = dateKeySchema.refine(
  (value) => {
    const day = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
  },
  { message: 'التاريخ غير صحيح.' },
);
export const financeActivityQuerySchema = z
  .object({
    from: financialDaySchema,
    to: financialDaySchema,
  })
  .strict()
  .refine((value) => value.from <= value.to, {
    path: ['to'],
    message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو في اليوم نفسه.',
  });
export type FinanceActivityQuery = z.infer<typeof financeActivityQuerySchema>;

export interface FinanceActivityItem {
  id: string;
  kind: 'PAYMENT' | 'EXPENSE';
  amount: string;
  occurredAt: string;
  description: string;
  partyName: string | null;
  contextLabel: string;
  accountId: string | null;
  caseId: string | null;
  movementId: string | null;
  invoiceId: string | null;
  billable: boolean;
}
export interface FinanceActivity {
  received: string;
  expenses: string;
  netReceived: string;
  items: FinanceActivityItem[];
}

export interface FinanceMovementSummary {
  id: string;
  kind: 'PAYMENT' | 'EXPENSE';
  amount: string;
  occurredAt: string;
  description: string;
  method: PaymentMethod | null;
  reference: string | null;
  category: ExpenseCategory | null;
  billable: boolean;
  receiptNumber: number | null;
  recordedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface AccountSummary {
  id: string;
  title: string;
  partyName: string | null;
  clientId: string | null;
  clientName: string | null;
  transactionId: string | null;
  transactionType: string | null;
  agreed: string;
  received: string;
  remaining: string;
  expenses: string;
  billableExpenses: string;
  version: number;
  notes: string | null;
  dueAt: string | null;
  movements: FinanceMovementSummary[];
}

export type FinanceAccountSummary = AccountSummary;

export interface FinanceWorkspaceSummary {
  agreed: string;
  received: string;
  remaining: string;
  expenses: string;
  billableExpenses: string;
  /** Cash received less recorded expenses; this is not accounting profit. */
  netReceived: string;
  legacyUnlinked: { agreed: string; received: string; remaining: string };
}
