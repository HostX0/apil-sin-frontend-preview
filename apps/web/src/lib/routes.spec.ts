import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DASHBOARD_PATH } from './routes';

const WEB_ROOT = join(__dirname, '..', '..');

function read(...segments: string[]): string {
  return readFileSync(join(WEB_ROOT, ...segments), 'utf8');
}

describe('isolated frontend preview routes', () => {
  it('routes the preview root to its dashboard', () => {
    expect(existsSync(join(WEB_ROOT, 'src', 'app', 'page.tsx'))).toBe(true);
    expect(existsSync(join(WEB_ROOT, 'src', 'app', '(app)', 'dashboard', 'page.tsx'))).toBe(true);
    expect(existsSync(join(WEB_ROOT, 'src', 'app', '(app)', 'page.tsx'))).toBe(false);
    expect(DASHBOARD_PATH).toBe('/dashboard');
    expect(read('src', 'app', 'page.tsx')).toContain("redirect('/dashboard')");
  });

  it('sends successful authentication to the dashboard, never the public root', () => {
    for (const page of [
      join('src', 'app', 'login', 'page.tsx'),
      join('src', 'app', 'register', 'page.tsx'),
    ]) {
      const source = read(page);
      expect(source).toContain('DASHBOARD_PATH');
      expect(source).not.toMatch(/router\.replace\(['"]\//);
    }
  });

  it('protects the dashboard inside the existing authenticated layout', () => {
    const layout = read('src', 'app', '(app)', 'layout.tsx');

    expect(layout).toContain("router.replace('/login')");
    expect(layout).toContain('if (!user) return null');
  });

  it('keeps every desktop-sidebar destination backed by a real page', () => {
    const sidebar = read('src', 'components', 'shell', 'console-sidebar.tsx');
    const hrefs = [...sidebar.matchAll(/href:\s*['"](\/[^'"?#]+)[^'"]*['"]/g)].map(
      (match) => match[1]!,
    );
    const routes = collectPageRoutes(join(WEB_ROOT, 'src', 'app'));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(routes, `${href} has no page`).toContain(href);
  });

  it('fixes public office registration off and defines no production API proxy', () => {
    const landing = read('src', 'app', 'page.tsx');
    const config = read('next.config.mjs');

    expect(landing).not.toContain('href="/register"');
    expect(config).toContain("NEXT_PUBLIC_REGISTRATION_ENABLED: 'false'");
    expect(config).toContain("NEXT_PUBLIC_API_URL: '/preview-api-disabled'");
    expect(config).not.toContain('async rewrites');
    expect(config).not.toContain('apilsin.com');
  });
});

function collectPageRoutes(appRoot: string): string[] {
  const routes: string[] = [];

  const visit = (directory: string) => {
    const entries = readdirSync(directory, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === 'page.tsx')) {
      const relative = directory
        .slice(appRoot.length)
        .replace(/\\/g, '/')
        .replace(/\/\([^/]+\)/g, '');
      routes.push(relative || '/');
    }

    for (const entry of entries) {
      if (entry.isDirectory()) visit(join(directory, entry.name));
    }
  };

  visit(appRoot);
  return routes;
}
