import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  ACCOUNT_NAV,
  BRAND,
  CONTACT,
  DESIGN_TOKENS,
  MARKET_NAV,
  MARKET_NAV_ROUTES,
  MOTION,
  TYPE_ROLES,
  Z_LAYERS,
  INTELLIGENCE_TIERS,
  LEGAL_NAV,
  ORGANISATION,
  PALETTE,
  PRIMARY_NAV,
  SECONDARY_NAV,
} from '@/lib/brand';
import { resolveRoute } from '@/lib/route-map';

/**
 * Brand consistency tests.
 *
 * These are the tests that keep Hatsi360 from quietly drifting back into an
 * earlier product identity. They cover five things:
 *
 *  1. The identity constants are what the brief says they are.
 *  2. The palette is accessible — a colour that cannot carry text is marked
 *     as graphics-only, and the marks are the ones that clear WCAG AA.
 *  3. The design tokens in the stylesheet and the tokens recorded in the brand
 *     module cannot drift apart.
 *  4. No customer-facing source file calls the product by an earlier name.
 *     The only permitted occurrences are historical references to the previous
 *     system and the brand module's own comment.
 *  5. Every navigation entry points at a route that actually exists.
 */

const ROOT = join(process.cwd(), 'src');
const PUBLIC = join(process.cwd(), 'public');

function walk(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

/**
 * The phrases that may legitimately name the previous system.
 *
 * A migration is a historical fact and hiding it would be dishonest, so the
 * previous name is allowed where it describes what the data *was*. It is not
 * allowed anywhere a reader would understand it as the product's name.
 */
const HISTORICAL_CONTEXT = [
  'previous Pluck Live system',
  'previous Pluck Live site',
  'earlier name',
  'Never "Pluck Live" in customer-facing copy',
  'The previous Pluck Live system displayed',
  'the previous version of the Pluck Live system',
  'The previous Pluck Live site displayed',
  'Migrated from the previous Pluck Live site',
];

describe('Hatsi360 identity', () => {
  it('uses the agreed primary identity', () => {
    expect(BRAND.name).toBe('Hatsi360');
    // Phase 02 redefined the product descriptor from "Agricultural Market
    // Intelligence" to "African Agricultural Market Intelligence". The
    // terminal's identity is regional and international at once, and the
    // descriptor is where that is stated. This assertion records the Phase 02
    // decision; it is not a drift.
    expect(BRAND.descriptor).toBe('African Agricultural Market Intelligence');
    expect(BRAND.category).toBe('African Agricultural Market Intelligence');
    expect(BRAND.commodityDescriptor).toBe('Agricultural Commodity Intelligence');
    expect(BRAND.tagline).toBe(
      'Know the harvest. Understand the market. Trade with confidence.',
    );
  });

  it('names the terminal Hatsi360 Markets without replacing the product name', () => {
    // `name` is the product and stays in the URLs, the footer and the artwork.
    // `productName` is the terminal's own wordmark in the header bar. The two
    // must never be conflated.
    expect(BRAND.productName).toBe('Hatsi360 Markets');
    expect(BRAND.productName).toContain(BRAND.name);
    expect(BRAND.productName).not.toContain('Pluck Agro');
  });

  it('keeps the corporate endorsement subordinate', () => {
    expect(BRAND.endorsement).toBe('Powered by Pluck Agro');
    expect(BRAND.ownershipStatement).toContain('Hatsi360');
    expect(BRAND.ownershipStatement).toContain('Pluck Agro');
    // The endorsement must never claim legal structure we cannot verify.
    expect(BRAND.ownershipStatement).not.toMatch(
      /\b(subsidiary|division|registered|company|group)\b/i,
    );
  });

  it('states the operating market as Northern Nigeria and the expansion as a plan', () => {
    expect(BRAND.operatingMarket).toBe('Northern Nigeria');
    expect(BRAND.expansion).toMatch(/nationwide/i);
    expect(BRAND.expansion).not.toMatch(/we (cover|operate|have)/i);
  });

  it('names every product surface distinctly from the corporate identity', () => {
    expect(BRAND.surfaces.portal).toContain('Access Portal');
    expect(BRAND.surfaces.fieldApp).toContain('Field');
    expect(BRAND.surfaces.controlCentre).toContain('Control Centre');
    expect(BRAND.surfaces.customerWorkspace).toContain('Customer Workspace');
    for (const surface of Object.values(BRAND.surfaces)) {
      expect(surface).toContain('Hatsi360');
      expect(surface).not.toContain('Pluck Agro');
    }
  });

  it('publishes a contact address that is verifiable', () => {
    expect(CONTACT.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(CONTACT.phoneHref.startsWith('tel:')).toBe(true);
    expect(CONTACT.address.city).toBe('Kano');
  });

  it('exposes the organisation for structured data', () => {
    expect(ORGANISATION.name).toBe('Hatsi360');
    expect(ORGANISATION.endorsement).toBe(BRAND.endorsement);
    expect(ORGANISATION.logo).toMatch(/^\/brand\//);
  });
});

describe('brand assets', () => {
  /**
   * The artwork is supplied by the product's owner. Every file the site
   * serves is derived from those two files by
   * `scripts/brand_assets.py`, so the list below is the whole system.
   */
  const required = [
    'hatsi360-logo-horizontal.png',
    'hatsi360-logo-horizontal-light.png',
    'hatsi360-logo-horizontal-mono.png',
    'hatsi360-logo-horizontal-mono-light.png',
    'hatsi360-lockup-compact.png',
    'hatsi360-lockup-compact-light.png',
    'hatsi360-lockup-compact-mono.png',
    'hatsi360-mark.png',
    'hatsi360-mark-light.png',
    'hatsi360-mark-mono.png',
    'hatsi360-mark-mono-light.png',
    'hatsi360-favicon-16.png',
    'hatsi360-favicon-32.png',
    'hatsi360-icon-192.png',
    'hatsi360-icon-512.png',
    'hatsi360-apple-touch-icon.png',
    'hatsi360-social-1200x630.png',
    'hatsi360-wordmark.png',
  ];

  it('ships every variant of the logo system', () => {
    for (const file of required) {
      expect(existsSync(join(PUBLIC, 'brand', file)), `${file} is missing`).toBe(true);
    }
  });

  it('serves no asset that the owner did not supply', () => {
    const served = readdirSync(join(PUBLIC, 'brand'));
    for (const file of served) {
      expect(required, `${file} is not part of the supplied artwork`).toContain(file);
    }
  });

  it('uses the supplied artwork in the logo component', () => {
    const logo = readFileSync(
      join(process.cwd(), 'src', 'components', 'brand', 'Logo.tsx'),
      'utf8',
    );
    for (const file of [
      'hatsi360-logo-horizontal.png',
      'hatsi360-lockup-compact.png',
      'hatsi360-mark.png',
    ]) {
      expect(logo, `${file} is not used by the logo component`).toContain(file);
    }
    // The mark is the owner's artwork, not a redrawn stand-in.
    expect(logo).not.toContain('linearGradient');
    expect(logo).not.toContain('KERNEL_COUNT');
  });

  it('names the product in the application icon', () => {
    const icon = join(process.cwd(), 'src', 'app', 'apple-icon.png');
    expect(existsSync(icon)).toBe(true);
    expect(statSync(icon).size).toBeGreaterThan(1000);
  });

  it('keeps the social card at the size a card reader expects', () => {
    const card = join(PUBLIC, 'brand', 'hatsi360-social-1200x630.png');
    expect(existsSync(card)).toBe(true);
    const bytes = readFileSync(card);
    // A PNG header carries the width and height at a fixed offset.
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });
});

describe('palette accessibility', () => {
  /** WCAG relative luminance. */
  function luminance(hex: string): number {
    const channels = [1, 3, 5].map((offset) => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrast(a: string, b: string): number {
    const first = luminance(a);
    const second = luminance(b);
    const [light, dark] = first > second ? [first, second] : [second, first];
    return (light + 0.05) / (dark + 0.05);
  }

  it('records a measured contrast ratio for every colour', () => {
    for (const colour of PALETTE) {
      if (colour.contrastOnWhite === null) continue;
      const measured = contrast(colour.hex, '#ffffff');
      expect(
        Math.abs(measured - colour.contrastOnWhite),
        `${colour.name} (#${colour.hex}) records ${colour.contrastOnWhite} but measures ${measured.toFixed(2)}`,
      ).toBeLessThan(0.15);
    }
  });

  it('only marks a colour text-safe when it clears WCAG AA on white', () => {
    for (const colour of PALETTE) {
      if (!colour.textSafe) continue;
      expect(
        contrast(colour.hex, '#ffffff'),
        `${colour.name} is marked text-safe but does not clear 4.5:1 on white`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('never marks a colour text-safe when it fails AA', () => {
    for (const colour of PALETTE) {
      if (colour.textSafe) continue;
      if (colour.contrastOnWhite === null) continue;
      expect(
        contrast(colour.hex, '#ffffff'),
        `${colour.name} is marked graphics-only but still clears 4.5:1`,
      ).toBeLessThan(4.5);
    }
  });

  it('keeps the primary brand colour strong enough to carry white text', () => {
    const primary = PALETTE.find((colour) => colour.name === 'Deep Harvest Green');
    expect(primary).toBeDefined();
    expect(contrast(primary!.hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('design tokens', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

  it('defines every recorded token in the stylesheet', () => {
    const missing: string[] = [];
    for (const [token, hex] of Object.entries(DESIGN_TOKENS)) {
      const declaration = `--color-${token}: ${hex.toLowerCase()};`;
      if (!css.toLowerCase().includes(declaration.toLowerCase())) missing.push(declaration);
    }
    expect(missing, `These tokens are not in globals.css:\n${missing.join('\n')}`).toEqual([]);
  });

  it('does not scatter the old palette hexes through the stylesheet', () => {
    // #0d2c1b was the previous primary brand colour and #c4841e the previous
    // gold. Both must be gone, or the old identity is still visible.
    expect(css.toLowerCase()).not.toContain('#0d2c1b');
    expect(css.toLowerCase()).not.toContain('#c4841e');
  });
});

describe('no earlier product identity in customer-facing source', () => {
  const files = walk(ROOT);

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('does not call the product "Pluck Live" anywhere in the source', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      let index = contents.indexOf('Pluck Live');
      while (index !== -1) {
        const raw = contents.slice(Math.max(0, index - 220), index + 160);
        // Collapse whitespace so a phrase that straddles a line break in the
        // source is still recognised.
        const context = raw.replace(/\s+/g, ' ');
        const historical = HISTORICAL_CONTEXT.some((phrase) =>
          context.includes(phrase.replace(/\s+/g, ' ')),
        );
        if (!historical) {
          offenders.push(`${relative(ROOT, file)}: ${context.replace(/\s+/g, ' ').trim()}`);
        }
        index = contents.indexOf('Pluck Live', index + 1);
      }
    }

    expect(
      offenders,
      `Customer-facing copy must not call the product "Pluck Live":\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('does not carry the previous working name anywhere in the source', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      if (/gona\s?pulse/i.test(contents)) offenders.push(relative(ROOT, file));
    }
    expect(
      offenders,
      `The previous working name must be gone from the source:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('does not use the old "PL" monogram anywhere', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      if (/>\s*PL\s*</.test(contents) || /'PL'|"PL"/.test(contents)) {
        offenders.push(relative(ROOT, file));
      }
    }
    expect(offenders, `The "PL" monogram must be replaced by the Hatsi360 mark`).toEqual([]);
  });
});

describe('navigation integrity', () => {
  it('has no duplicate navigation entries', () => {
    const hrefs = [...PRIMARY_NAV, ...SECONDARY_NAV, ...LEGAL_NAV].map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('points every navigation entry at a real route', () => {
    /**
     * Every route the application serves, discovered from the app directory.
     *
     * A route group — a folder in parentheses — changes the layout a page is
     * rendered in but never the URL it is served at, so the group is skipped
     * when the URL is worked out.
     */
    function servedRoutes(): Set<string> {
      const appDirectory = join(process.cwd(), 'src', 'app');
      const routes = new Set<string>();

      function walk(directory: string, prefix: string): void {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) {
            const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
            walk(path, isGroup ? prefix : `${prefix}/${entry.name}`);
          } else if (entry.name === 'page.tsx') {
            routes.add(prefix === '' ? '/' : prefix);
          }
        }
      }

      walk(appDirectory, '');
      return routes;
    }

    const routes = servedRoutes();
    const broken = [...PRIMARY_NAV, ...SECONDARY_NAV, ...LEGAL_NAV]
      .map((link) => link.href)
      .filter((href) => !routes.has(resolveRoute(href)));

    expect(broken, `These navigation entries point at routes that do not exist: ${broken.join(', ')}`)
      .toEqual([]);
  });

  it('keeps the legal navigation limited to pages that exist', () => {
    for (const link of LEGAL_NAV) {
      expect(link.href.startsWith('/')).toBe(true);
    }
  });

  it('uses the navigation vocabulary the brief asks for', () => {
    const labels = PRIMARY_NAV.map((link) => link.label);
    expect(labels).toContain('Commodities');
    expect(labels).toContain('Market Prices');
    expect(labels).toContain('Markets');
    expect(labels).toContain('Compare Prices');
    expect(labels).toContain('Market Insights');
    expect(labels).toContain('Reports');
    expect(labels).toContain('About');
  });
});

describe('the terminal module navigation', () => {
  /** Every route the application serves, discovered from the app directory. */
  function servedRoutes(): Set<string> {
    const appDirectory = join(process.cwd(), 'src', 'app');
    const routes = new Set<string>();
    const walk = (directory: string, prefix: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
          walk(path, isGroup ? prefix : `${prefix}/${entry.name}`);
        } else if (entry.name === 'page.tsx') {
          routes.add(prefix === '' ? '/' : prefix);
        }
      }
    };
    walk(appDirectory, '');
    return routes;
  }

  it('offers the six modules the Phase 02 brief asks for', () => {
    expect(MARKET_NAV.map((module) => module.label)).toEqual([
      'Markets',
      'Commodities',
      'Trade',
      'Charts',
      'Fundamentals',
      'Research',
    ]);
  });

  it('points every module and every destination at a route that exists', () => {
    const routes = servedRoutes();
    const broken: string[] = [];
    for (const module of MARKET_NAV) {
      if (!routes.has(resolveRoute(module.href))) broken.push(`${module.label} -> ${module.href}`);
      for (const item of module.items) {
        if (!routes.has(resolveRoute(item.href))) broken.push(`${item.label} -> ${item.href}`);
      }
    }
    expect(broken, `These navigation entries point at routes that do not exist: ${broken.join(', ')}`).toEqual([]);
  });

  it('keeps unbuilt destinations out of the navigation', () => {
    // A destination the platform intends to serve but does not yet is named in
    // `planned`. It must never be rendered as a link, because a link that 404s
    // is a broken promise. The check is exact-match on the label and on the
    // slugified label, so a planned "Market activity heatmap" cannot quietly
    // become `/market-activity-heatmap`.
    const plannedLabels = MARKET_NAV.flatMap((module) => module.planned ?? []);
    expect(plannedLabels.length, 'The roadmap must be visible somewhere').toBeGreaterThan(0);

    const liveLabels = MARKET_NAV.flatMap((module) => module.items.map((item) => item.label));
    for (const planned of plannedLabels) {
      expect(liveLabels, `"${planned}" is named as planned but is also a live destination`).not.toContain(planned);
      const slug = planned.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      expect(
        MARKET_NAV_ROUTES,
        `"${planned}" is named as planned but its slug is a live route`,
      ).not.toContain(`/${slug}`);
    }
  });

  it('gives every module a landing route and a summary', () => {
    for (const module of MARKET_NAV) {
      expect(module.href.startsWith('/'), `${module.label} needs an absolute href`).toBe(true);
      expect(module.summary.length, `${module.label} needs a summary`).toBeGreaterThan(10);
      expect(module.items.length, `${module.label} needs at least one destination`).toBeGreaterThan(0);
    }
  });

  it('points every account destination at a route that exists', () => {
    const routes = servedRoutes();
    const broken = ACCOUNT_NAV.map((link) => link.href).filter(
      (href) => !routes.has(resolveRoute(href)),
    );
    expect(broken, `These account destinations do not exist: ${broken.join(', ')}`).toEqual([]);
  });
});

describe('the terminal design vocabulary', () => {
  it('defines a typography role for every kind of figure the terminal shows', () => {
    const roles = TYPE_ROLES.map((role) => role.role);
    for (const required of ['Display', 'H1', 'H2', 'H3', 'Body', 'Label', 'Metadata', 'Numeric', 'Micro-label']) {
      expect(roles, `${required} is missing from the typography scale`).toContain(required);
    }
    // Every numeric role must render tabular figures. A price column that is
    // not tabular reflows while it is being read.
    for (const role of TYPE_ROLES.filter((entry) => entry.tabular)) {
      expect(role.role).toBeTruthy();
    }
    expect(TYPE_ROLES.filter((role) => role.tabular).length).toBeGreaterThan(0);
  });

  it('defines a named z-index for every layer the terminal stacks', () => {
    for (const layer of ['sticky', 'header', 'drawer', 'modal', 'tooltip', 'boot']) {
      expect(typeof Z_LAYERS[layer as keyof typeof Z_LAYERS], `${layer} has no z-index`).toBe('number');
    }
    // The order is the point: a header above sticky content, a drawer above a
    // header, a modal above a drawer, a tooltip above everything but the boot.
    expect(Z_LAYERS.header).toBeGreaterThan(Z_LAYERS.sticky);
    expect(Z_LAYERS.drawer).toBeGreaterThan(Z_LAYERS.header);
    expect(Z_LAYERS.modal).toBeGreaterThan(Z_LAYERS.drawer);
    expect(Z_LAYERS.tooltip).toBeGreaterThan(Z_LAYERS.modal);
    expect(Z_LAYERS.boot).toBeGreaterThan(Z_LAYERS.tooltip);
  });

  it('keeps the motion vocabulary short and slow enough to read past', () => {
    // A terminal is read repeatedly all day. Nothing may animate for longer
    // than the wait it represents.
    for (const [name, duration] of Object.entries(MOTION)) {
      if (typeof duration !== 'string' || !duration.endsWith('ms')) continue;
      const milliseconds = Number.parseInt(duration, 10);
      expect(milliseconds, `${name} is too slow for a working surface`).toBeLessThanOrEqual(250);
    }
  });

  it('mirrors the terminal tokens in the stylesheet', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    for (const token of ['terminal-bg', 'terminal-surface', 'terminal-border', 'move-up', 'move-down', 'editorial-bg']) {
      expect(css, `--color-${token} is not defined in globals.css`).toContain(`--color-${token}:`);
    }
    // Both environments must declare a colour scheme, or a form control inside
    // the terminal renders with the browser's light defaults.
    expect(css).toContain('color-scheme: dark');
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
});

describe('commercial tiers', () => {
  it('marks only the public tier as available', () => {
    const available = INTELLIGENCE_TIERS.filter((tier) => tier.available);
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('public');
    expect(available[0].entitlement).toBeNull();
  });

  it('gives every paid tier an entitlement key', () => {
    for (const tier of INTELLIGENCE_TIERS) {
      if (tier.id === 'public') continue;
      expect(tier.entitlement, `${tier.name} must map to an entitlement key`).toBeTruthy();
      expect(tier.available).toBe(false);
    }
  });

  it('does not publish a price for a tier that is not available', () => {
    for (const tier of INTELLIGENCE_TIERS) {
      if (tier.available) continue;
      expect(JSON.stringify(tier)).not.toMatch(/₦\s?\d/);
    }
  });
});
