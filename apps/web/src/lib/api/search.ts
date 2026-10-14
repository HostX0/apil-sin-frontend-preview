'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type {
  CreateSavedSearchInput,
  GlobalSearchResult,
  ListSavedSearchesQuery,
  SavedSearchSummary,
} from '@muhami/shared';
import { api } from '@/lib/api-client';
import { RECENT_SEARCHES_CLEARED, RECENT_SEARCHES_KEY } from '@/lib/local-session';

export const searchKeys = {
  global: (q: string) => ['search', 'global', q] as const,
  saved: (scope?: string) => ['search', 'saved', scope ?? 'all'] as const,
};

export function useGlobalSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: searchKeys.global(query),
    queryFn: () => api.get<GlobalSearchResult>('/search', { query: { q: query, limit: 5 } }),
    enabled: enabled && query.trim().length >= 2,
    // Results are cheap to re-fetch and stale ones are misleading in a palette
    // the user opened to find something that changed a second ago.
    staleTime: 10_000,
    placeholderData: (previous) => previous,
  });
}

export function useSavedSearches(query: ListSavedSearchesQuery = {}) {
  return useQuery({
    queryKey: searchKeys.saved(query.scope),
    queryFn: () => api.get<SavedSearchSummary[]>('/saved-searches', { query }),
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedSearchInput) =>
      api.post<SavedSearchSummary>('/saved-searches', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['search', 'saved'] }),
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/saved-searches/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['search', 'saved'] }),
  });
}

// ── Recent searches ─────────────────────────────────────────────────────────

const RECENT_KEY = RECENT_SEARCHES_KEY;
const RECENT_LIMIT = 8;

/**
 * Recent searches live in localStorage, not on the server.
 *
 * Search terms may contain confidential names. Auth transitions remove the
 * saved history and notify mounted search controls immediately.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecent(JSON.parse(stored) as string[]);
    } catch {
      // Corrupt or unavailable storage is not worth surfacing.
    }
    const cleared = () => setRecent([]);
    window.addEventListener(RECENT_SEARCHES_CLEARED, cleared);
    return () => window.removeEventListener(RECENT_SEARCHES_CLEARED, cleared);
  }, []);

  const remember = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;

    setRecent((current) => {
      const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, RECENT_LIMIT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { recent, remember, clear };
}
