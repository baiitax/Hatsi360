/**
 * A responsive check for the Hatsi360 Markets terminal.
 *
 * Renders the public surfaces at the widths the Phase 02 brief names and
 * measures three things that matter:
 *
 *   1. Nothing overflows the viewport horizontally — a price table that forces
 *      a sideways scroll on a 390px phone is a broken page, not a dense one.
 *   2. The desktop navigation is present at desktop widths and absent at
 *      phone widths, and the reverse for the bottom bar.
 *   3. The page is not empty: the main landmark holds real content.
 *
 * Run: node scripts/check-responsive.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';
const ROUTES = ['/', '/commodities', '/commodities/paddy-rice', '/trade', '/trade/fundamentals', '/insights', '/charts'];
const WIDTHS = [
  { w: 1440, h: 900, label: 'desktop-wide' },
  { w: 1366, h: 768, label: 'desktop' },
  { w: 1280, h: 800, label: 'desktop-small' },
  { w: 1024, h: 768, label: 'tablet-landscape' },
  { w: 768, h: 1024, label: 'tablet' },
  { w: 430, h: 932, label: 'phone-large' },
  { w: 390, h: 844, label: 'phone' },
  { w: 360, h: 800, label: 'phone-small' },
];

const browser = await chromium.launch({ channel: undefined, headless: true });
let failures = 0;

for (const { w, h, label } of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Let the streamed content land.
      await page.waitForTimeout(1200);

      const result = await page.evaluate(() => {
        const doc = document.documentElement;
        const main = document.querySelector('main');
        const desktopNav = document.querySelector('nav[aria-label="Market modules"]');
        const bottomBar = document.querySelector('nav[aria-label="Primary market destinations"]');
        const overflow = doc.scrollWidth - doc.clientWidth;
        // The widest table, so we can tell a deliberate scroll container from
        // a page that simply spills.
        const widest = [...document.querySelectorAll('table, .terminal-panel')]
          .map((el) => el.getBoundingClientRect().right)
          .reduce((a, b) => Math.max(a, b), 0);
        return {
          overflow,
          mainText: (main?.innerText ?? '').trim().length,
          desktopNavVisible: desktopNav
            ? getComputedStyle(desktopNav).display !== 'none'
            : null,
          bottomBarVisible: bottomBar
            ? getComputedStyle(bottomBar).display !== 'none'
            : null,
          widestRight: Math.round(widest),
          clientWidth: doc.clientWidth,
        };
      });

      const problems = [];
      if (result.overflow > 1) problems.push(`horizontal overflow ${result.overflow}px`);
      if (result.mainText < 40) problems.push(`main is nearly empty (${result.mainText} chars)`);
      if (w >= 1024 && result.desktopNavVisible === false) problems.push('desktop nav hidden at desktop width');
      if (w < 1024 && result.desktopNavVisible === true) problems.push('desktop nav shown at phone width');
      if (w < 1024 && result.bottomBarVisible !== true) problems.push('no bottom bar at phone width');
      if (w >= 1024 && result.bottomBarVisible === true) problems.push('bottom bar shown at desktop width');

      if (problems.length) {
        failures += 1;
        console.log(`FAIL ${label.padEnd(18)} ${route.padEnd(26)} ${problems.join('; ')}`);
      } else {
        console.log(`ok   ${label.padEnd(18)} ${route.padEnd(26)} main=${result.mainText} overflow=${result.overflow}`);
      }
    } catch (error) {
      failures += 1;
      console.log(`FAIL ${label.padEnd(18)} ${route.padEnd(26)} threw ${error.message.split('\n')[0]}`);
    }
  }
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'All viewport checks passed.' : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
