import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * The accessibility suite runs against a real Chromium and a real production
 * build, so it is kept out of the default `test` run: it costs a build plus a
 * server start, and it must be able to skip loudly rather than fail when
 * neither is present.
 *
 *   pnpm --filter @muhami/web build
 *   pnpm --filter @muhami/web test:a11y
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    // One browser, one server, one suite at a time.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
