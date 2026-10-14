import { z } from 'zod';
import { cursorPaginationSchema } from '../api/pagination';
import {
  dateSchema,
  longText,
  optionalText,
  requiredText,
  uuidSchema,
  versionSchema,
} from './common';

export const TRANSACTION_STATUSES = ['IN_PROGRESS', 'COMPLETED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export const TRANSACTION_STATUS_AR: Record<TransactionStatus, string> = {
  IN_PROGRESS: 'قيد الإنجاز',
  COMPLETED: 'اكتملت',
};

export const createTransactionSchema = z.object({
  type: requiredText('نوع المعاملة', 160),
  department: requiredText('الدائرة المختصة', 200),
  clientId: uuidSchema,
  addedAt: dateSchema,
  assignedLawyerId: uuidSchema,
  status: z.enum(TRANSACTION_STATUSES).default('IN_PROGRESS'),
  notes: longText(2000),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  version: versionSchema,
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const listTransactionsQuerySchema = cursorPaginationSchema.extend({
  search: optionalText(200),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  clientId: uuidSchema.optional(),
  assignedLawyerId: uuidSchema.optional(),
});
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export interface TransactionSummary {
  id: string;
  type: string;
  department: string;
  clientId: string;
  clientName: string;
  addedAt: string;
  assignedLawyerId: string;
  assignedLawyerName: string;
  status: TransactionStatus;
  notes: string | null;
  version: number;
  createdAt: string;
  canUpdate: boolean;
}
