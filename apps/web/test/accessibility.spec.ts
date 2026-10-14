import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import puppeteer, { type Browser } from 'puppeteer-core';

/**
 * Accessibility, against a real browser — Phase 16.
 *
 * Static analysis (eslint-plugin-jsx-a11y) catches structural mistakes in the
 * source. It cannot see what the browser actually computed: whether the focus
 * ring survives the theme, whether a colour pair clears 4.5:1 once the CSS
 * variables resolve, whether the RTL document exposes a coherent reading order.
 * Those need a rendering engine, so this suite drives one.
 *
 * Only the public routes that render without an API are covered — `/`, `/login`
 * and `/offline`. Everything under the application shell needs a session, which
 * needs a database. These routes still exercise the fonts, theme tokens, form
 * components, public landing sections and the RTL document.
 *
 * Skips loudly rather than passing vacuously when Chromium or a build is
 * missing. A green tick that proved nothing is worse than a red one.
 */

const require = createRequire(import.meta.url);
const WEB_ROOT = join(__dirname, '..');
const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;

/** Same resolution order as the PDF renderer, for the same reason. */
function findChromium(): string | null {
  const configured = process.env.CHROME_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;

  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const executablePath = findChromium();
const hasBuild = existsSync(join(WEB_ROOT, '.next', 'BUILD_ID'));
const runnable = Boolean(executablePath) && hasBuild;

if (!runnable) {
  console.warn(
    '\n⚠ Accessibility suite SKIPPED.\n' +
      (executablePath ? '' : '  · no Chromium found (set CHROME_EXECUTABLE_PATH)\n') +
      (hasBuild ? '' : '  · no production build (run `pnpm --filter @muhami/web build`)\n') +
      '  Nothing about accessibility has been verified by this run.\n',
  );
}

let server: ChildProcess | null = null;
let browser: Browser | null = null;
let axeSource = '';

async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/login`);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Next did not start on ${BASE} within ${timeoutMs}ms`);
}

beforeAll(async () => {
  if (!runnable) return;

  axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

  server = spawn('node', [require.resolve('next/dist/bin/next'), 'start', '--port', String(PORT)], {
    cwd: WEB_ROOT,
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'production' },
  });

  await waitForServer(90_000);

  browser = await puppeteer.launch({
    executablePath: executablePath!,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}, 120_000);

afterAll(async () => {
  await browser?.close().catch(() => undefined);
  server?.kill();
});

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ html: string; target: string[] }>;
}

async function audit(path: string, theme: 'light' | 'dark'): Promise<AxeViolation[]> {
  const page = await browser!.newPage();

  try {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    /**
     * The theme is chosen before the page loads, not toggled afterwards.
     *
     * Toggling `data-theme` at runtime re-resolves the custom properties
     * immediately, but a form control's *used* background is only recomputed on
     * the next paint. Auditing in that window measures contrast against a
     * background nobody ever sees, and the result flickers between runs. Setting
     * the stored preference first is also how a returning user arrives.
     */
    await page.evaluateOnNewDocument(`localStorage.setItem('muhami-theme', '${theme}')`);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Fonts must be settled before contrast is measured — a fallback face can
    // change the rendered weight and with it the computed colour ratio.
    await page.evaluate('document.fonts.ready');

    await page.evaluate(axeSource);

    const result = (await page.evaluate(`
      axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        resultTypes: ['violations'],
      })
    `)) as { violations: AxeViolation[] };

    return result.violations;
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Only serious and critical fail the build; minor findings are reported. */
function blocking(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
}

function describeViolations(violations: AxeViolation[]): string {
  return violations
    .map(
      (violation) =>
        `\n  [${violation.impact}] ${violation.id}: ${violation.help}\n` +
        violation.nodes
          .slice(0, 3)
          .map((node) => `      ${node.target.join(' ')} — ${node.html.slice(0, 120)}`)
          .join('\n'),
    )
    .join('\n');
}

describe.skipIf(!runnable)('accessibility', () => {
  for (const path of ['/', '/login', '/offline']) {
    for (const theme of ['light', 'dark'] as const) {
      it(`${path} has no serious or critical violations (${theme})`, async () => {
        const violations = await audit(path, theme);
        const serious = blocking(violations);

        if (violations.length > serious.length) {
          console.warn(
            `${path} (${theme}) — non-blocking findings:${describeViolations(
              violations.filter((violation) => !serious.includes(violation)),
            )}`,
          );
        }

        expect(serious, `${path} (${theme}):${describeViolations(serious)}`).toEqual([]);
      }, 60_000);
    }
  }

  it('declares Arabic and right-to-left on the document', async () => {
    const page = await browser!.newPage();

    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      const document = await page.evaluate(`
        ({ lang: document.documentElement.lang, dir: document.documentElement.dir })
      `);

      // Without these the screen reader reads Arabic with a Latin voice and the
      // browser lays the page out left-to-right.
      expect(document).toEqual({ lang: 'ar-IQ', dir: 'rtl' });
    } finally {
      await page.close().catch(() => undefined);
    }
  }, 30_000);

  it('gives every public interactive control a 44px touch target', async () => {
    for (const path of ['/', '/login']) {
      const page = await browser!.newPage();

      try {
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' });

        const undersized = (await page.evaluate(`
          Array.from(document.querySelectorAll('button, a[href], input, select, [role="switch"]'))
            .filter((element) => {
              const style = getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden') return false;

              // A skip link uses the standard sr-only clip until it receives
              // keyboard focus. Its 1px hidden box is not an available touch
              // target; the focused state restores the full-sized control.
              if (style.clip !== 'auto' || style.clipPath === 'inset(50%)') return false;

              const box = element.getBoundingClientRect();
              if (box.width === 0 && box.height === 0) return false;

              // WCAG 2.5.8 exempts a control that is inline in a sentence — a
              // link inside a paragraph cannot be 44px tall without breaking the
              // line it lives in, and the surrounding text is the affordance.
              if (style.display === 'inline') return false;

              // Checkboxes and radios are allowed to be small when their label is
              // the target; everything else must be tappable on its own.
              if (element.type === 'checkbox' || element.type === 'radio') return false;

              return box.height < 44 || box.width < 24;
            })
            .map((element) => element.outerHTML.slice(0, 100))
        `)) as string[];

        expect(undersized, `${path} undersized targets:\n${undersized.join('\n')}`).toEqual([]);
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  }, 30_000);

  it('keeps the public root public and protects the dashboard', async () => {
    const page = await browser!.newPage();

    try {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      expect(new URL(page.url()).pathname).toBe('/');

      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 10_000 });
      expect(new URL(page.url()).pathname).toBe('/login');
    } finally {
      await page.close().catch(() => undefined);
    }
  }, 30_000);

  /**
   * Pins a defect this suite found: with the OS set to dark and the app set to
   * light, form controls stayed dark. The browser had applied its automatic
   * dark treatment to them — the page never declared `color-scheme`, so the
   * browser assumed it should help, and it did not stop helping when the theme
   * changed. A light page with dark input fields, visible only to the subset of
   * users whose phone is in dark mode.
   */
  it('renders light form controls when a dark-mode device selects the light theme', async () => {
    const page = await browser!.newPage();

    try {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
      // The returning-user path: the light preference is already stored, so the
      // page is light from its first paint. Asserted this way rather than by
      // toggling at runtime, because a runtime toggle measures repaint timing
      // and this measures the product.
      await page.evaluateOnNewDocument(`localStorage.setItem('muhami-theme', 'light')`);
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });

      const rendered = (await page.evaluate(`
        (() => {
          const input = document.querySelector('input[type="email"]');
          const style = getComputedStyle(input);
          return { token: style.getPropertyValue('--color-surface').trim(), background: style.backgroundColor };
        })()
      `)) as { token: string; background: string };

      expect(rendered.token).toBe('255 255 255');
      expect(rendered.background, 'the token changed but the control did not repaint').toBe(
        'rgb(255, 255, 255)',
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  }, 30_000);

  it('keeps a visible focus indicator on keyboard navigation', async () => {
    const page = await browser!.newPage();

    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });

      await page.keyboard.press('Tab');

      const focused = (await page.evaluate(`
        (() => {
          const element = document.activeElement;
          if (!element || element === document.body) return null;
          const style = getComputedStyle(element);
          return {
            tag: element.tagName,
            outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
            ring: style.boxShadow !== 'none',
          };
        })()
      `)) as { tag: string; outline: boolean; ring: boolean } | null;

      expect(focused, 'Tab moved focus nowhere').not.toBeNull();
      // Either mechanism is fine; having neither means a keyboard user is lost.
      expect(focused!.outline || focused!.ring, `${focused!.tag} shows no focus indicator`).toBe(
        true,
      );
    } finally {
      await page.close().catch(() => undefined);
    }
  }, 30_000);
});
