'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface EmployeeMailbox {
  email: string;
  name: string;
  protected: boolean;
  createdAt: string | null;
}

export interface MailboxesOverview {
  domain: string;
  webmailUrl: string;
  mailboxes: EmployeeMailbox[];
}

export const mailboxKeys = { all: ['mailboxes'] as const };

export function useMailboxes(enabled: boolean) {
  return useQuery({
    queryKey: mailboxKeys.all,
    queryFn: ({ signal }) => api.get<MailboxesOverview>('/mailboxes', { signal }),
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

// Keep passwords out of React Query's mutation cache and the offline outbox.
// Only the mailbox's public account details are returned or cached.
export function createEmployeeMailbox(input: {
  name: string;
  localPart: string;
  password: string;
}) {
  return api.post<EmployeeMailbox>('/mailboxes', input);
}

export function changeEmployeeMailboxPassword(localPart: string, password: string) {
  return api.patch<EmployeeMailbox>(`/mailboxes/${encodeURIComponent(localPart)}/password`, {
    password,
  });
}
