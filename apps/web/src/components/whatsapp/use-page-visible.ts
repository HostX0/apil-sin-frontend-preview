'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (callback: () => void) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};
const snapshot = () => document.visibilityState === 'visible';
const serverSnapshot = () => true;

/** Poll only while the user can see this page. */
export function usePageVisible() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
