import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APP_DESCRIPTION_AR,
  APP_NAME_AR,
  APP_NAME_EN,
  APP_SHORT_NAME_AR,
  APP_SLUG,
  APP_TAGLINE_AR,
  APP_TITLE_AR,
} from '@/lib/ui-shared';

/**
 * Three files carry the product name as a literal because they cannot import
 * one: `manifest.webmanifest` and `sw.js` are static assets with no module
 * system, and `package.json` is read by tooling before any code runs.
 *
 * This is the check that keeps them honest. Without it, the next rename leaves
 * the old name on the home-screen icon and in every push notification — the two
 * places a user sees most and a developer sees least.
 */

const WEB_ROOT = join(__dirname, '..', '..');

function read(...segments: string[]): string {
  return readFileSync(join(WEB_ROOT, ...segments), 'utf8');
}

describe('brand constants', () => {
  it('keeps the platform name English', () => {
    expect(APP_NAME_AR).toBe('DevsHub');
    expect(APP_SHORT_NAME_AR).toBe('DevsHub');
    expect(APP_NAME_EN).toBe('DevsHub');
  });
  it('composes the title from the name and the tagline', () => {
    expect(APP_TITLE_AR).toBe(`${APP_NAME_AR} — ${APP_TAGLINE_AR}`);
  });

  it('keeps the short name short enough for a home-screen label', () => {
    // iOS truncates around 12 characters; longer becomes an ellipsis.
    expect(APP_SHORT_NAME_AR.length).toBeLessThanOrEqual(14);
  });

  it('uses an ASCII slug, safe in a file name and a container tag', () => {
    expect(APP_SLUG).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('files that cannot import the brand', () => {
  it('the PWA manifest carries the current name', () => {
    const manifest = JSON.parse(read('public', 'manifest.webmanifest'));

    expect(manifest.name).toBe(APP_TITLE_AR);
    expect(manifest.short_name).toBe(APP_SHORT_NAME_AR);
  });

  it('the manifest declares English and LTR', () => {
    const manifest = JSON.parse(read('public', 'manifest.webmanifest'));

    // A rename is exactly when someone rewrites this file by hand and drops a
    // field that only matters to Arabic users.
    expect(manifest.lang).toBe('en');
    expect(manifest.dir).toBe('ltr');
  });

  it('opens the installed PWA on the authenticated dashboard', () => {
    const manifest = JSON.parse(read('public', 'manifest.webmanifest'));

    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.scope).toBe('/');
  });

  it('the preview worker never displays push notifications', () => {
    const worker = read('public', 'sw.js');
    expect(worker).not.toContain('showNotification');
    expect(worker).not.toMatch(/addEventListener\(['"]push['"]/);
  });

  it('the preview worker does not retain an offline shell or API cache', () => {
    const worker = read('public', 'sw.js');
    expect(worker).toContain('self.registration.unregister()');
    expect(worker).not.toContain('SHELL_ASSETS');
    expect(worker).not.toContain('caches.');
  });
});

describe('the old name is gone from user-visible strings', () => {
  /**
   * Scoped to the app's own source. "محامي" and "محامٍ" remain correct as the
   * *noun* — the LAWYER role, «اسم المحامي» on a letterhead — so this looks
   * only for the quoted-standalone forms that were the product name.
   */
  it('no page renders the previous product name as a title', () => {
    const suspects = [
      join('src', 'app', 'layout.tsx'),
      join('src', 'app', 'login', 'page.tsx'),
      join('src', 'components', 'shell', 'app-header.tsx'),
      join('src', 'components', 'shell', 'console-sidebar.tsx'),
    ];

    for (const file of suspects) {
      const source = read(file);
      expect(source, `${file} still hardcodes the old product name`).not.toMatch(/['"`]محامي['"`]/);
    }
  });

  it('the description still describes the product', () => {
    expect(APP_DESCRIPTION_AR).toContain('cases');
  });
});
