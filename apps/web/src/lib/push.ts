'use client';

import { useCallback, useState } from 'react';

export type PushState =
  'unsupported' | 'server-disabled' | 'denied' | 'unsubscribed' | 'subscribed';

/** Browser notification subscriptions are never created in the frontend preview. */
export function usePushSubscription() {
  const [error, setError] = useState<string | null>(null);
  const unavailable = useCallback(async () => {
    setError('Browser notifications are unavailable in this frontend preview.');
  }, []);
  const refresh = useCallback(async () => undefined, []);

  return {
    state: 'server-disabled' as PushState,
    busy: false,
    error,
    subscribe: unavailable,
    unsubscribe: unavailable,
    refresh,
  };
}
