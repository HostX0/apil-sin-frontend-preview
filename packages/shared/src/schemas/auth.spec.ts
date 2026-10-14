import { describe, expect, it } from 'vitest';
import {
  MAX_AVATAR_BYTES,
  accountProfileSchema,
  avatarConfirmSchema,
  avatarUploadSchema,
  loginSchema,
} from './auth';

describe('login persistence', () => {
  it('keeps older clients persistent by default and preserves an explicit session choice', () => {
    const credentials = { email: '  OWNER@example.iq ', password: 'existing-password' };
    expect(loginSchema.parse(credentials)).toMatchObject({
      email: 'owner@example.iq',
      rememberMe: true,
    });
    expect(loginSchema.parse({ ...credentials, rememberMe: false }).rememberMe).toBe(false);
    expect(loginSchema.parse({ ...credentials, rememberMe: true }).rememberMe).toBe(true);
  });

  it('rejects string values instead of treating the string false as a persistent choice', () => {
    expect(
      loginSchema.safeParse({
        email: 'owner@example.iq',
        password: 'existing-password',
        rememberMe: 'false',
      }).success,
    ).toBe(false);
  });
});

describe('account profile schemas', () => {
  it('normalises an optional Iraqi mobile and accepts an empty one', () => {
    expect(
      accountProfileSchema.parse({ fullName: 'محمد علي', phone: '07801234567', version: 2 }),
    ).toEqual({ fullName: 'محمد علي', phone: '+9647801234567', version: 2 });

    expect(accountProfileSchema.parse({ fullName: 'محمد علي', phone: '', version: 2 })).toEqual({
      fullName: 'محمد علي',
      phone: undefined,
      version: 2,
    });
  });

  it('limits avatar uploads to supported images no larger than two MiB', () => {
    expect(
      avatarUploadSchema.safeParse({
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: MAX_AVATAR_BYTES,
      }).success,
    ).toBe(true);
    expect(
      avatarUploadSchema.safeParse({
        fileName: 'avatar.gif',
        mimeType: 'image/gif',
        sizeBytes: 100,
      }).success,
    ).toBe(false);
    expect(
      avatarUploadSchema.safeParse({
        fileName: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: MAX_AVATAR_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it('requires the confirmed avatar to carry a supported media type', () => {
    expect(
      avatarConfirmSchema.safeParse({
        objectKey: 'office/avatars/user/id/avatar.webp',
        mimeType: 'image/webp',
      }).success,
    ).toBe(true);
    expect(
      avatarConfirmSchema.safeParse({
        objectKey: 'office/avatars/user/id/avatar.svg',
        mimeType: 'image/svg+xml',
      }).success,
    ).toBe(false);
  });
});
