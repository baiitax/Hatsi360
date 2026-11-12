import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  BRAND,
  CONTACT,
  INTELLIGENCE_TIERS,
  LEGAL_NAV,
  ORGANISATION,
  PALETTE,
  PRIMARY_NAV,
  SECONDARY_NAV,
} from '@/lib/brand';

/**
 * Brand consistency tests.
 *
 * These are the tests that keep GonaPulse from quietly drifting back into
 * Pluck Live. They cover four things:
 *
 *  1. The identity constants are what the brief says they are.
 *  2. The palette is accessible — a colour that cannot carry text is marked
 *     as graphics-only, and the marks are the ones that clear WCAG AA.
 *  3. No customer-facing source file calls the product "Pluck Live". The only
 *     permitted occurrences are historical references to the previous system
 *     and the brand module's own comment.
 *  4. Every navigation entry points at a route that actually exists.
 */

const ROOT = join(process.cwd(), 'src');

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
];

describe('GonaPulse identity', () => {
  it('uses the agreed primary identity', () => {
    expect(BRAND.name).toBe('GonaPulse');
    expect(BRAND.descriptor).toBe('Agricultural Market Intelligence');
    expect(BRAND.tagline).toBe('Know the market. Move with confidence.');
  });

  it('keeps the corporate endorsement subordinate', () => {
    expect(BRAND.endorsement).toBe('Powered by Pluck Agro');
    expect(BRAND.ownershipStatement).toContain('GonaPulse');
    expect(BRAND.ownershipStatement).toContain('Pluck Agro');
    // The endorsement must never claim legal structure we cannot verify.
    expect(BRAND.ownershipStatement).not.toMatch(/\b(subsidiary|division|registered|company|group)\b/i);
  });

  it('states the operating market as Northern Nigeria and the expansion as a plan', () => {
    expect(BRAND.operatingMarket).toBe('Northern Nigeria');
    expect(BRAND.expansion).toMatch(/nationwide/i);
    expect(BRAND.expansion).not.toMatch(/we (cover|operate|have)/i);
  });

  it('names every product surface distinctly from the corporate identity', () => {
    expect(BRAND.surfaces.portal).toContain('Access Portal');
    expect(BRAND.surfaces.fieldApp).toContain('Field App');
    expect(BRAND.surfaces.controlCentre).toContain('Control Centre');
    expect(BRAND.surfaces.customerWorkspace).toContain('Customer Workspace');
    for (const surface of Object.values(BRAND.surfaces)) {
      expect(surface).toContain('GonaPulse');
      expect(surface).not.toContain('Pluck Agro');
    }
  });

  it('publishes a contact address that is verifiable', () => {
    expect(CONTACT.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(CONTACT.phoneHref.startsWith('tel:')).toBe(true);
    expect(CONTACT.address.city).toBe('Kano');
  });

  it('exposes the organisation for structured data', () => {
    expect(ORGANISATION.name).toBe('GonaPulse');
    expect(ORGANISATION.endorsement).toBe(BRAND.endorsement);
    expect(ORGANISATION.logo).toMatch(/^\/brand\//);
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
        `${colour.name} (#${colour.hex}) records ${colour.contrastOnWhite} but measures ${measured.toFixed(1)}`,
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
    const primary = PALETTE.find((colour) => colour.name === 'Harvest');
    expect(primary).toBeDefined();
    expect(contrast(primary!.hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('no "Pluck Live" in customer-facing source', () => {
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

  it('does not use the old "PL" monogram anywhere', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      if (/>\s*PL\s*</.test(contents) || /'PL'|"PL"/.test(contents)) {
        offenders.push(relative(ROOT, file));
      }
    }
    expect(offenders, `The "PL" monogram must be replaced by the GonaPulse mark`).toEqual([]);
  });
});

describe('navigation integrity', () => {
  it('has no duplicate navigation entries', () => {
    const hrefs = [...PRIMARY_NAV, ...SECONDARY_NAV, ...LEGAL_NAV].map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('points every navigation entry at a real route', () => {
    const appDirectory = join(process.cwd(), 'src', 'app');

    function routeExists(href: string): boolean {
      const route = href.replace(/^\//, '');
      const candidates = [
        join(appDirectory, route, 'page.tsx'),
        join(appDirectory, `${route}.tsx`),
        join(appDirectory, route, 'route.ts'),
      ];
      return candidates.some((candidate) => {
        try {
          return statSync(candidate).isFile();
        } catch {
          return false;
        }
      });
    }

    const broken = [...PRIMARY_NAV, ...SECONDARY_NAV, ...LEGAL_NAV]
      .map((link) => link.href)
      .filter((href) => !routeExists(href));

    expect(broken, `These navigation entries point at routes that do not exist: ${broken.join(', ')}`)
      .toEqual([]);
  });

  it('keeps the legal navigation limited to pages that exist', () => {
    for (const link of LEGAL_NAV) {
      expect(link.href.startsWith('/')).toBe(true);
    }
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
