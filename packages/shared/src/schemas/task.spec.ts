import { describe, expect, it } from 'vitest';
import { createTaskSchema, updateTaskSchema } from './task';

describe('task deadline updates', () => {
  it('keeps an explicit deadline clear distinct from leaving the deadline unchanged', () => {
    expect(updateTaskSchema.parse({ version: 2, dueAt: null })).toEqual({
      version: 2,
      dueAt: null,
    });
    expect(updateTaskSchema.parse({ version: 2 })).not.toHaveProperty('dueAt');
  });

  it('accepts an office time with an explicit zone and rejects an invalid deadline', () => {
    expect(
      updateTaskSchema.safeParse({ version: 2, dueAt: '2026-10-11T09:00:00+03:00' }).success,
    ).toBe(true);
    expect(updateTaskSchema.safeParse({ version: 2, dueAt: 'ليس تاريخاً' }).success).toBe(false);
  });

  it('leaves a new task deadline optional without introducing a null create value', () => {
    expect(createTaskSchema.parse({ title: 'متابعة تبليغ' }).dueAt).toBeUndefined();
    expect(createTaskSchema.safeParse({ title: 'متابعة تبليغ', dueAt: null }).success).toBe(false);
  });
});

describe('task assignment updates', () => {
  it('distinguishes removing an assignment from leaving the current assignment unchanged', () => {
    expect(updateTaskSchema.parse({ version: 2, assigneeId: null })).toEqual({
      version: 2,
      assigneeId: null,
    });
    expect(updateTaskSchema.parse({ version: 2 })).not.toHaveProperty('assigneeId');
  });

  it('keeps a new task assignment optional and rejects a null or invalid create assignment', () => {
    expect(createTaskSchema.parse({ title: 'متابعة تبليغ' }).assigneeId).toBeUndefined();
    expect(createTaskSchema.safeParse({ title: 'متابعة تبليغ', assigneeId: null }).success).toBe(
      false,
    );
    expect(updateTaskSchema.safeParse({ version: 2, assigneeId: 'ليس معرّفاً' }).success).toBe(
      false,
    );
  });
});
