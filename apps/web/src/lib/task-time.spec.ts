import { describe, expect, it } from 'vitest';
import { baghdadTaskDateTimeInput, baghdadTaskDateTimeInstant } from './task-time';

describe('Baghdad task deadlines', () => {
  it('preserves the office date and time when an existing deadline is edited', () => {
    const instant = '2026-10-10T23:30:00.000Z';
    const input = baghdadTaskDateTimeInput(instant);
    expect(input).toBe('2026-10-11T02:30');
    expect(new Date(baghdadTaskDateTimeInstant(input)!).toISOString()).toBe(instant);
  });

  it('submits a new 9 am office deadline as 6 am UTC', () => {
    expect(new Date(baghdadTaskDateTimeInstant('2026-10-11T09:00')!).toISOString()).toBe(
      '2026-10-11T06:00:00.000Z',
    );
  });

  it('keeps a missing deadline optional', () => {
    expect(baghdadTaskDateTimeInstant('')).toBeUndefined();
    expect(baghdadTaskDateTimeInstant()).toBeUndefined();
  });
});
