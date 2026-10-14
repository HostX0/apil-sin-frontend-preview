import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the browser-side logic that is worth testing on its own —
 * currently the outbox's failure classification, which decides whether a
 * lawyer's write is retried, parked, or thrown away.
 *
 * No jsdom: nothing here touches the DOM. The pieces that do (IndexedDB, the
 * service worker, push enrolment) are exercised in a real browser by the
 * Phase 16 end-to-end suite, because a jsdom stub of IndexedDB proves nothing
 * about the engines this app actually runs on.
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
