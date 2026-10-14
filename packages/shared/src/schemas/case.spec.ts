import { describe, expect, it } from 'vitest';
import { createCaseSchema, updateCaseSchema } from './case';

const input = {
  serial: 8201,
  typeCode: 'ب',
  year: 2026,
  clientId: '11111111-1111-4111-8111-111111111111',
  courtId: '22222222-2222-4222-8222-222222222222',
  caseType: 'CIVIL',
  clientRole: 'PLAINTIFF',
  subject: 'دعوى مرتبطة بمحامٍ',
  openedAt: '2026-10-10',
};
describe('responsible lawyer on new case registration', () => {
  it('requires a selected profile on new requests', () => {
    expect(createCaseSchema.safeParse(input).success).toBe(false);
    expect(createCaseSchema.safeParse({ ...input, assignedLawyerIds: [] }).success).toBe(false);
    expect(
      createCaseSchema.safeParse({
        ...input,
        assignedLawyerIds: ['33333333-3333-4333-8333-333333333333'],
      }).success,
    ).toBe(true);
  });
  it('keeps older unassigned files editable', () => {
    expect(
      updateCaseSchema.safeParse({ ...input, assignedLawyerIds: [], version: 0 }).success,
    ).toBe(true);
  });
});
