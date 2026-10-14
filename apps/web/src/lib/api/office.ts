'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BrandingAsset,
  OfficeProfile,
  OfficeProfileInput,
  OfficeSettings,
  OfficeSettingsPatch,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { previewUnavailable } from '@/lib/preview-unavailable';

export const officeKeys = {
  all: ['office'] as const,
  profile: () => ['office', 'profile'] as const,
  settings: () => ['office', 'settings'] as const,
};

export function useOfficeProfile() {
  return useQuery({
    queryKey: officeKeys.profile(),
    queryFn: () => api.get<OfficeProfile>('/office'),
  });
}

export function useUpdateOfficeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OfficeProfileInput) => api.patch<OfficeProfile>('/office', input),
    onSuccess: (profile) => queryClient.setQueryData(officeKeys.profile(), profile),
  });
}

export function useOfficeSettings() {
  return useQuery({
    queryKey: officeKeys.settings(),
    queryFn: () => api.get<OfficeSettings>('/office/settings'),
    // Read on nearly every screen that formats something; refetching per mount
    // would be pure noise for a value that changes a few times a year.
    staleTime: 10 * 60_000,
  });
}

export function useUpdateOfficeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: OfficeSettingsPatch) =>
      api.patch<OfficeSettings>('/office/settings', patch),
    onSuccess: (settings) => queryClient.setQueryData(officeKeys.settings(), settings),
  });
}

/** Branding uploads cannot reach storage from the standalone preview. */
export function useUploadBranding() {
  return useMutation({
    mutationFn: async (_input: { asset: BrandingAsset; file: File }): Promise<OfficeProfile> => {
      throw previewUnavailable('Branding uploads are unavailable in this frontend preview.');
    },
  });
}

export function useRemoveBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: BrandingAsset) => api.delete<OfficeProfile>(`/office/branding/${asset}`),
    onSuccess: (profile) => queryClient.setQueryData(officeKeys.profile(), profile),
  });
}
