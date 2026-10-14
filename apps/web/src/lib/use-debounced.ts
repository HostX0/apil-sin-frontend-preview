'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a value.
 *
 * 300 ms is tuned for search-as-you-type on Iraqi mobile data: short enough to
 * feel live, long enough that a five-letter Arabic name is one request rather
 * than five.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
