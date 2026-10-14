'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AccountProfile,
  AccountProfileInput,
  AuthenticatedUser,
  AvatarConfirmInput,
  AvatarUploadInput,
  UploadTicket,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { compressImage, uploadToStorage } from '@/lib/upload';

export const accountKeys = {
  profile: ['auth', 'profile'] as const,
};

export function useAccountProfile() {
  return useQuery({
    queryKey: accountKeys.profile,
    queryFn: () => api.get<AccountProfile>('/auth/profile'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateAccountProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AccountProfileInput) => api.patch<AccountProfile>('/auth/profile', input),
    onSuccess: (profile) => {
      queryClient.setQueryData(accountKeys.profile, profile);
      queryClient.setQueryData<AuthenticatedUser | null>(['auth', 'me'], (current) =>
        current ? { ...current, fullName: profile.fullName } : current,
      );
    },
  });
}

/** Direct-to-storage avatar upload: compress → presign → PUT → confirm. */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (source: File) => {
      const { blob } = await compressImage(source, 512, 0.84);
      const input: AvatarUploadInput = {
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: blob.size,
      };
      const ticket = await api.post<UploadTicket>('/auth/profile/avatar/upload-url', input);
      await uploadToStorage(ticket, blob);

      const confirm: AvatarConfirmInput = {
        objectKey: ticket.objectKey,
        mimeType: 'image/jpeg',
      };
      return api.post<AccountProfile>('/auth/profile/avatar/confirm', confirm);
    },
    onSuccess: (profile) => queryClient.setQueryData(accountKeys.profile, profile),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<AccountProfile>('/auth/profile/avatar'),
    onSuccess: (profile) => queryClient.setQueryData(accountKeys.profile, profile),
  });
}
