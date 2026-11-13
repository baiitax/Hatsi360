/**
 * Hatsi360 — demo account journey, in a real browser.
 *
 * This is the verification the project was missing: no authenticated journey
 * had ever been run against the live Supabase instance. The demo accounts make
 * it possible.
 *
 * It clicks each demo button on /login exactly as a person would, and asserts
 * the browser actually lands in the right workspace and renders it.
 *
 * Run: node scripts/verify_demo_journey.mjs http://localhost:3103
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:3103';

const CASES = [
  {
    label: 'agent',
    buttonText: /Market agent/,
    expectUrl: /\/agent(\/home)?(\?|$)/,
    expectText: /Field|collect|market|task/i,
    // The agent app must not be an error boundary.
    mustNotMatch: /Application error|Unhandled Runtime/i,
  },
  {
    label: 'verification_officer',
    buttonText: /Verification officer/,
    expectUrl: /\/admin\/verification/,
    expectText: /verif|queue|review|observ/i,
    mustNotMatch: /Application error|Unhandled Runtime/i,
  },
  {
    label: 'admin',
    buttonText: /Administrator/,
    expectUrl: /\/admin\/overview/,
    expectText: /overview|control|admin|metric|observ/i,
    mustNotMatch: /Application error|Unhandled Runtime/i,
  },
];

let failures = 0;
const results = [];

const browser = await chromium.launch();
try {
  for (const c of CASES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
    });
    page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));

    const r = { label: c.label, steps: [] };
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // The panel must be there and describe itself as test-only.
      const panel = page.locator('text=Demo accounts').first();
      await panel.waitFor({ timeout: 15000 });
      r.steps.push(['panel rendered', 'OK']);

      const button = page.getByRole('button', { name: c.buttonText }).first();
      await button.waitFor({ timeout: 15000 });
      await button.click();

      // Wait for the server action to redirect us out of /login.
      await page.waitForURL(c.expectUrl, { timeout: 45000 });
      r.steps.push(['redirected', `OK -> ${new URL(page.url()).pathname}`]);

      // The workspace must actually render its own content, not a shell.
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      const body = (await page.locator('body').innerText()).slice(0, 4000);
      r.steps.push(['renders workspace content', c.expectText.test(body) ? 'OK' : `FAIL: no match for ${c.expectText}`]);
      if (!c.expectText.test(body)) failures += 1;

      r.steps.push(['no runtime error', c.mustNotMatch.test(body) ? `FAIL: ${c.mustNotMatch}` : 'OK']);
      if (c.mustNotMatch.test(body)) failures += 1;

      // Still signed in after the redirect?
      r.steps.push(['session cookie set', (await page.context().cookies()).some((x) => /sb-.*auth-token/.test(x.name)) ? 'OK' : 'FAIL: no auth cookie']);
      if (!(await page.context().cookies()).some((x) => /sb-.*auth-token/.test(x.name))) failures += 1;

      const realErrors = consoleErrors.filter((e) => !/favicon|404|Failed to load resource.*404/i.test(e));
      r.steps.push(['no console errors', realErrors.length === 0 ? 'OK' : `FAIL: ${realErrors.slice(0, 2).join(' | ')}`]);
      if (realErrors.length > 0) failures += 1;

      await page.screenshot({ path: `/tmp/demo-${c.label}.png`, fullPage: false });
    } catch (e) {
      failures += 1;
      r.steps.push(['journey', `FAIL: ${String(e).split('\n')[0].slice(0, 220)}`]);
      await page.screenshot({ path: `/tmp/demo-${c.label}-FAIL.png` }).catch(() => {});
    } finally {
      await context.close();
    }
    results.push(r);
  }
} finally {
  await browser.close();
}

for (const r of results) {
  console.log(`\n=== ${r.label} ===`);
  for (const [k, v] of r.steps) console.log(`  ${v.startsWith('OK') ? 'PASS' : 'FAIL'}  ${k}: ${v}`);
}
console.log(`\n${failures === 0 ? 'ALL JOURNEYS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
