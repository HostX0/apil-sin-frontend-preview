import { describe, expect, it } from 'vitest';
import { createEventSchema, updateEventSchema } from './calendar';

const appointment = { title: 'مراجعة الموكل', type: 'APPOINTMENT', date: '2099-08-12' };

describe('appointment edit contract', () => {
  it('requires a non-negative integer version for edits without changing creation', () => {
    expect(createEventSchema.safeParse(appointment).success).toBe(true);
    expect(updateEventSchema.safeParse(appointment).success).toBe(false);
    expect(updateEventSchema.safeParse({ ...appointment, version: 0 }).success).toBe(true);
    for (const version of [-1, 0.5, '0'])
      expect(updateEventSchema.safeParse({ ...appointment, version }).success).toBe(false);
  });

  it('retains field validation when extending creation for an edit', () => {
    const invalidTime = updateEventSchema.safeParse({
      ...appointment,
      version: 2,
      time: '10:30',
      endTime: '10:00',
    });
    expect(invalidTime.success).toBe(false);
    if (!invalidTime.success) expect(invalidTime.error.issues[0]?.path).toEqual(['endTime']);
    expect(
      updateEventSchema.safeParse({ ...appointment, version: 2, recurrence: 'WEEKLY' }).success,
    ).toBe(false);
  });
});
