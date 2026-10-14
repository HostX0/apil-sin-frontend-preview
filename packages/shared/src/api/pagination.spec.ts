import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './pagination';

describe('cursor encoding', () => {
  it('round-trips ASCII', () => {
    const value = '2025-08-12T09:00:00.000Z|3f2c1a5e';
    expect(decodeCursor(encodeCursor(value))).toBe(value);
  });

  it('round-trips Arabic', () => {
    const value = 'أحمد كريم|١٢٣';
    expect(decodeCursor(encodeCursor(value))).toBe(value);
  });

  it('round-trips every input length modulo 3', () => {
    for (const value of ['a', 'ab', 'abc', 'abcd', 'abcde', 'abcdef']) {
      expect(decodeCursor(encodeCursor(value))).toBe(value);
    }
  });

  it('produces URL-safe output', () => {
    const encoded = encodeCursor('ÿÿÿ>?>?'.repeat(8));
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('rejects malformed cursors instead of throwing', () => {
    expect(decodeCursor('not valid base64!!')).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });
});
