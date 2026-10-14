'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLawyerInput,
  DownloadTicket,
  LawyerAssetKind,
  LawyerDetail,
  LawyerSummary,
  ListLawyersQuery,
  UpdateLawyerInput,
  UploadTicket,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { previewUnavailable } from '@/lib/preview-unavailable';
import { uploadToStorage } from '@/lib/upload';

export const lawyerKeys = {
  all: ['lawyers'] as const,
  list: (filters: ListLawyersQuery) => ['lawyers', 'list', filters] as const,
  detail: (id: string) => ['lawyers', 'detail', id] as const,
};

export function useLawyers(filters: ListLawyersQuery = {}, enabled = true) {
  return useQuery({
    queryKey: lawyerKeys.list(filters),
    queryFn: () => api.get<LawyerSummary[]>('/lawyers', { query: filters }),
    enabled,
    staleTime: 60_000,
  });
}
export function useLawyer(id: string, enabled = true) {
  return useQuery({
    queryKey: lawyerKeys.detail(id),
    queryFn: () => api.get<LawyerDetail>(`/lawyers/${id}`),
    enabled: enabled && Boolean(id),
  });
}
export function useCreateLawyer() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLawyerInput) => api.post<LawyerDetail>('/lawyers', input),
    onSuccess: (lawyer) => {
      cache.setQueryData(lawyerKeys.detail(lawyer.id), lawyer);
      void cache.invalidateQueries({ queryKey: lawyerKeys.all });
    },
  });
}
export function useUpdateLawyer(id: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLawyerInput) => api.patch<LawyerDetail>(`/lawyers/${id}`, input),
    onSuccess: (lawyer) => {
      cache.setQueryData(lawyerKeys.detail(lawyer.id), lawyer);
      void cache.invalidateQueries({ queryKey: lawyerKeys.all });
    },
  });
}
export async function uploadLawyerAsset(
  id: string,
  kind: LawyerAssetKind,
  file: File,
  version: number,
): Promise<LawyerDetail> {
  const input = { fileName: file.name, mimeType: file.type, sizeBytes: file.size };
  const ticket = await api.post<UploadTicket>(`/lawyers/${id}/assets/${kind}/upload-init`, input);
  await uploadToStorage(ticket, file);
  return api.post<LawyerDetail>(`/lawyers/${id}/assets/${kind}`, {
    ...input,
    objectKey: ticket.objectKey,
    version,
  });
}
export async function downloadLawyerAsset(
  _id: string,
  _kind: LawyerAssetKind,
): Promise<DownloadTicket> {
  throw previewUnavailable('Lawyer document downloads are unavailable in this frontend preview.');
}
