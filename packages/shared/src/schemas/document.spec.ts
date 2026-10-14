import { describe, expect, it } from 'vitest';
import { createDocumentSchema, updateDocumentSchema } from './document';

const baseCreate = {
  title: 'وكالة',
  docType: 'POWER_OF_ATTORNEY' as const,
  caseId: '11111111-1111-4111-8111-111111111111',
  objectKey: 'office/documents/object.pdf',
  fileName: 'object.pdf',
  mimeType: 'application/pdf' as const,
  sizeBytes: 100,
};

const baseUpdate = {
  title: 'وكالة',
  docType: 'POWER_OF_ATTORNEY' as const,
  caseId: '11111111-1111-4111-8111-111111111111',
  version: 0,
};

describe('document metadata invariants', () => {
  it('requires an attachment on create', () => {
    const result = createDocumentSchema.safeParse({ ...baseCreate, caseId: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.caseId).toContain(
        'يجب ربط المستند بدعوى أو معاملة أو موكّل.',
      );
    }
  });

  it('keeps the attachment requirement on update', () => {
    const result = updateDocumentSchema.safeParse({ ...baseUpdate, caseId: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.caseId).toContain(
        'يجب ربط المستند بدعوى أو معاملة أو موكّل.',
      );
    }
  });

  it('allows a client-only document', () => {
    const result = updateDocumentSchema.safeParse({
      ...baseUpdate,
      caseId: undefined,
      clientId: '22222222-2222-4222-8222-222222222222',
    });

    expect(result.success).toBe(true);
  });

  it('keeps a transaction-only document associated on creation and editing', () => {
    const transactionId = '33333333-3333-4333-8333-333333333333';
    const created = createDocumentSchema.parse({
      ...baseCreate,
      caseId: undefined,
      transactionId,
    });
    const updated = updateDocumentSchema.parse({
      ...baseUpdate,
      caseId: undefined,
      transactionId,
    });

    expect(created.transactionId).toBe(transactionId);
    expect(updated.transactionId).toBe(transactionId);
    expect(created.caseId).toBeUndefined();
    expect(updated.caseId).toBeUndefined();
  });

  it('rejects linking one document to both a case and a transaction', () => {
    const transactionId = '33333333-3333-4333-8333-333333333333';
    const results = [
      createDocumentSchema.safeParse({ ...baseCreate, transactionId }),
      updateDocumentSchema.safeParse({ ...baseUpdate, transactionId }),
    ];

    for (const result of results) {
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.transactionId).toContain(
          'اختر دعوى أو معاملة واحدة للمستند.',
        );
      }
    }
  });

  it('rejects an expiry before issue on create', () => {
    const result = createDocumentSchema.safeParse({
      ...baseCreate,
      issueDate: '2026-09-10',
      expiryDate: '2026-09-01',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.expiryDate).toContain(
        'تاريخ انتهاء المستند لا يمكن أن يسبق تاريخ إصداره.',
      );
    }
  });

  it('rejects an expiry before issue on update', () => {
    const result = updateDocumentSchema.safeParse({
      ...baseUpdate,
      issueDate: '2026-09-10',
      expiryDate: '2026-09-01',
    });

    expect(result.success).toBe(false);
  });
});
