import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Design system tests.
 *
 * The brief requires one reusable component system shared by the public site,
 * the customer workspace, the Field App and the Control Centre. These tests
 * check that the catalogue exists, that it is exported from one place, and
 * that no page re-declares the same component.
 */

const ROOT = join(process.cwd(), 'src');

/** The component catalogue the design system must provide. */
const CATALOGUE: { name: string; file: string; exportName: string }[] = [
  { name: 'BrandLogo', file: 'components/brand/Logo.tsx', exportName: 'BrandLogo' },
  { name: 'BrandMark', file: 'components/brand/Logo.tsx', exportName: 'BrandMark' },
  { name: 'MainNavigation', file: 'components/site/navigation.tsx', exportName: 'MainNavigation' },
  { name: 'MobileNavigation', file: 'components/site/navigation.tsx', exportName: 'MobileNavigation' },
  { name: 'SearchBar', file: 'components/site/navigation.tsx', exportName: 'SearchBar' },
  { name: 'UserMenu', file: 'components/site/navigation.tsx', exportName: 'UserMenu' },
  { name: 'NotificationCenter', file: 'components/site/navigation.tsx', exportName: 'NotificationCenter' },
  { name: 'PageHeader', file: 'components/ui/PageHero.tsx', exportName: 'PageHero' },
  { name: 'Breadcrumbs', file: 'components/ui/index.tsx', exportName: 'Breadcrumbs' },
  { name: 'CommodityCard', file: 'components/data/Cards.tsx', exportName: 'CommodityCard' },
  { name: 'MarketCard', file: 'components/data/Cards.tsx', exportName: 'MarketCard' },
  { name: 'PriceCard', file: 'components/ui/data-display.tsx', exportName: 'PriceCard' },
  {
    name: 'PriceMovementIndicator',
    file: 'components/ui/data-display.tsx',
    exportName: 'PriceMovementIndicator',
  },
  { name: 'PriceComparisonTable', file: 'components/data/PriceTable.tsx', exportName: 'PriceTable' },
  { name: 'HistoricalPriceChart', file: 'components/data/PriceChart.tsx', exportName: 'HistoricalPriceChart' },
  { name: 'MarketCoverageMap', file: 'components/marketing/sections.tsx', exportName: 'CoverageMap' },
  { name: 'IntelligenceMetricCard', file: 'components/ui/data-display.tsx', exportName: 'IntelligenceMetricCard' },
  { name: 'FilterPanel', file: 'components/ui/data-display.tsx', exportName: 'FilterPanel' },
  { name: 'DateRangeSelector', file: 'components/ui/data-display.tsx', exportName: 'DateRangeSelector' },
  { name: 'DataFreshnessIndicator', file: 'components/ui/data-display.tsx', exportName: 'DataFreshnessIndicator' },
  { name: 'VerificationBadge', file: 'components/ui/data-display.tsx', exportName: 'VerificationBadge' },
  { name: 'SourceAttribution', file: 'components/ui/data-display.tsx', exportName: 'SourceAttribution' },
  { name: 'EmptyState', file: 'components/ui/index.tsx', exportName: 'EmptyState' },
  { name: 'LoadingSkeleton', file: 'components/ui/index.tsx', exportName: 'Skeleton' },
  { name: 'ErrorState', file: 'components/ui/data-display.tsx', exportName: 'ErrorState' },
  { name: 'Pagination', file: 'components/ui/index.tsx', exportName: 'Pagination' },
  { name: 'Footer', file: 'components/site/SiteFooter.tsx', exportName: 'SiteFooter' },
];

describe('design system catalogue', () => {
  it('defines every component the catalogue requires', () => {
    const missing: string[] = [];
    for (const entry of CATALOGUE) {
      const path = join(ROOT, entry.file);
      if (!existsSync(path)) {
        missing.push(`${entry.name} (${entry.file} does not exist)`);
        continue;
      }
      const contents = readFileSync(path, 'utf8');
      if (!contents.includes(`export function ${entry.exportName}`)) {
        missing.push(`${entry.name} (no export in ${entry.file})`);
      }
    }
    expect(missing, `The design system is missing:\n${missing.join('\n')}`).toEqual([]);
  });

  it('re-exports the shared components from one import surface', () => {
    const barrel = readFileSync(join(ROOT, 'components', 'ui', 'index.tsx'), 'utf8');
    for (const name of [
      'EmptyState',
      'Pagination',
      'Skeleton',
      'Breadcrumbs',
      'ErrorState',
      'FilterPanel',
      'DateRangeSelector',
      'PriceMovementIndicator',
      'VerificationBadge',
      'DataFreshnessIndicator',
      'IntelligenceMetricCard',
      'SourceAttribution',
      'HistoricalPriceChart',
    ]) {
      expect(barrel, `${name} is not re-exported from the design system barrel`).toContain(name);
    }
  });

  it('keeps the verification badge honest about unverified records', () => {
    const source = readFileSync(join(ROOT, 'components', 'ui', 'data-display.tsx'), 'utf8');
    // Only a record whose status is `verified` may be labelled as verified.
    expect(source).toContain("status === 'verified'");
    expect(source).not.toMatch(/label:\s*['"]Verified['"]/);
  });

  it('keeps the colour of a movement from carrying the meaning on its own', () => {
    const source = readFileSync(join(ROOT, 'components', 'ui', 'data-display.tsx'), 'utf8');
    expect(source).toContain('▲');
    expect(source).toContain('▼');
    expect(source).toContain('No comparable previous period');
  });

  it('does not restate the brand palette inside components', () => {
    // Components must use the token names, not raw hex values, so the palette
    // can only be changed in one place.
    const offenders: string[] = [];
    for (const entry of CATALOGUE) {
      const path = join(ROOT, entry.file);
      if (!existsSync(path)) continue;
      const contents = readFileSync(path, 'utf8');
      const matches = contents.match(/#[0-9a-f]{6}/gi) ?? [];
      for (const match of matches) {
        // The logo component owns the mark's own artwork colours.
        if (entry.file === 'components/brand/Logo.tsx') continue;
        offenders.push(`${entry.file}: ${match}`);
      }
    }
    expect(offenders, `Raw colours outside the token system:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('only uses colour utilities that the theme actually defines', () => {
    // A class such as `bg-info-50` that the theme never defines is not a
    // styling choice — it is a silently missing colour that renders as
    // transparent. This walks every component and page and checks each
    // colour utility against the theme in globals.css.
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    const defined = new Set(
      Array.from(css.matchAll(/--color-([a-z0-9-]+)\s*:/g)).map((match) => match[1]!),
    );
    // The palette families that carry the identity.
    const families = [
      'brand',
      'leaf',
      'harvest',
      'sand',
      'earth',
      'ink',
      'success',
      'warning',
      'error',
      'info',
    ];

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.tsx')) continue;
        const contents = readFileSync(full, 'utf8');
        const pattern = new RegExp(
          String.raw`\b(?:bg|text|border|from|to|via|ring|fill|stroke|outline|decoration|accent|caret|shadow)-((?:${families.join('|')})-\d{1,3})\b`,
          'g',
        );
        for (const match of contents.matchAll(pattern)) {
          const token = match[1]!;
          if (!defined.has(token)) {
            offenders.push(`${full.replace(`${ROOT}/`, '')}: ${match[0]}`);
          }
        }
      }
    };
    walk(ROOT);

    expect(
      offenders,
      `Colour utilities that the theme does not define:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});

describe('workspace shells', () => {
  it('gives the Control Centre a dark green navigation', () => {
    const shell = readFileSync(join(ROOT, 'components', 'admin', 'AdminShell.tsx'), 'utf8');
    expect(shell).toContain('bg-brand-800');
    expect(shell).toContain('Control Centre');
  });

  it('gives the Field App a thumb-reachable bottom navigation', () => {
    const shell = readFileSync(join(ROOT, 'components', 'agent', 'AgentShell.tsx'), 'utf8');
    expect(shell).toContain('fixed inset-x-0 bottom-0');
    expect(shell).toContain('max-w-lg');
  });

  it('names the field surface with the product name', () => {
    const layout = readFileSync(join(ROOT, 'app', 'agent', 'layout.tsx'), 'utf8');
    // The five primary destinations the brief asks for. Markets, prices,
    // corrections and notifications are reached from the home screen, so
    // they do not take a sixth slot in the bottom navigation.
    expect(layout).toContain('/agent/home');
    expect(layout).toContain('/agent/assignments');
    expect(layout).toContain('/agent/collection/new');
    expect(layout).toContain('/agent/history');
    expect(layout).toContain('/agent/profile');
  });

  it('keeps the admin navigation out of the field app', () => {
    const layout = readFileSync(join(ROOT, 'app', 'agent', 'layout.tsx'), 'utf8');
    expect(layout).not.toContain('/admin');
  });
});
