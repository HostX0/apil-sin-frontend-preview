'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type BackupSummary,
  type ExportFormat,
  type ImportReport,
  type ImportRequest,
  type OfficeArchive,
} from '@/lib/ui-shared';
import { api } from '@/lib/api-client';
import { previewUnavailable } from '@/lib/preview-unavailable';

export const portabilityKeys = {
  backups: ['data', 'backups'] as const,
};

/** No office archive or customer records are available in this preview. */
export function useExportOffice() {
  return useMutation({
    mutationFn: async (_options: { format: ExportFormat; includeArchived: boolean }): Promise<{ fileName: string; sizeBytes: number }> => {
      throw previewUnavailable('Archive export is unavailable in this frontend preview.');
    },
  });
}

export function useBackups() {
  return useQuery({
    queryKey: portabilityKeys.backups,
    queryFn: () => api.get<BackupSummary[]>('/data/backups', { query: { limit: 20 } }),
  });
}

export function useRunBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BackupSummary>('/data/backups'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: portabilityKeys.backups }),
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: async (_key: string): Promise<string> => {
      throw previewUnavailable('Backup downloads are unavailable in this frontend preview.');
    },
  });
}

export function useImportArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { archive: OfficeArchive; request: ImportRequest }) =>
      api.post<ImportReport>('/data/import', input),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}
