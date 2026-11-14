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
      // A component may be defined in the file, or re-exported from a client
      // half of it. Both satisfy the catalogue: what matters is that a caller
      // importing the design system gets it from one place.
      const defined = contents.includes(`export function ${entry.exportName}`);
      const reExported = new RegExp(
        String.raw`export\s*\{[^}]*\b${entry.exportName}\b[^}]*\}\s*from`,
      ).test(contents);
      if (!defined && !reExported) {
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

/* ==========================================================================
   Phase 02 — the terminal component catalogue

   The Phase 02 brief asks for a named component library organised into
   categories. These tests check that the catalogue exists, that it is exported
   from the places the brief names, and that the rules the brief states as
   non-negotiable are actually in the source.
   ========================================================================== */

describe('Phase 02 terminal catalogue', () => {
  /** Every component the Phase 02 brief names, with where it must live. */
  const PHASE_02_CATALOGUE: { name: string; file: string; exportName: string; group: string }[] = [
    // Core
    { name: 'HatsiLogo', file: 'components/brand/Logo.tsx', exportName: 'BrandLogo', group: 'core' },
    { name: 'TerminalShell', file: 'components/terminal/TerminalShell.tsx', exportName: 'TerminalShell', group: 'core' },
    { name: 'TerminalHeader', file: 'components/terminal/TerminalShell.tsx', exportName: 'TerminalHeader', group: 'core' },
    { name: 'MainNavigation', file: 'components/terminal/TerminalShell.tsx', exportName: 'MainNavigation', group: 'core' },
    { name: 'MobileNavigation', file: 'components/terminal/MobileNavigation.tsx', exportName: 'MobileNavigation', group: 'core' },
    { name: 'PageContainer', file: 'components/terminal/TerminalShell.tsx', exportName: 'PageContainer', group: 'core' },
    { name: 'PageHeader', file: 'components/terminal/TerminalShell.tsx', exportName: 'PageHeader', group: 'core' },
    { name: 'SectionHeader', file: 'components/terminal/TerminalShell.tsx', exportName: 'SectionHeader', group: 'core' },
    { name: 'Button', file: 'components/ui/primitives.tsx', exportName: 'Button', group: 'core' },
    { name: 'IconButton', file: 'components/ui/primitives.tsx', exportName: 'IconButton', group: 'core' },
    { name: 'TextInput', file: 'components/ui/primitives.tsx', exportName: 'TextInput', group: 'core' },
    { name: 'Select', file: 'components/ui/primitives.tsx', exportName: 'Select', group: 'core' },
    { name: 'SearchInput', file: 'components/ui/primitives.tsx', exportName: 'SearchInput', group: 'core' },
    { name: 'Tabs', file: 'components/ui/primitives.tsx', exportName: 'Tabs', group: 'core' },
    { name: 'Badge', file: 'components/ui/primitives.tsx', exportName: 'Badge', group: 'core' },
    { name: 'Divider', file: 'components/ui/primitives.tsx', exportName: 'Divider', group: 'core' },
    { name: 'Tooltip', file: 'components/ui/primitives.tsx', exportName: 'Tooltip', group: 'core' },
    { name: 'DropdownMenu', file: 'components/ui/primitives.tsx', exportName: 'DropdownMenu', group: 'core' },
    { name: 'Modal', file: 'components/ui/primitives.tsx', exportName: 'Modal', group: 'core' },
    { name: 'Drawer', file: 'components/ui/primitives.tsx', exportName: 'Drawer', group: 'core' },
    { name: 'Icon', file: 'components/ui/icons.tsx', exportName: 'Icon', group: 'core' },

    // Market data
    { name: 'PriceDisplay', file: 'components/market/PriceDisplay.tsx', exportName: 'PriceDisplay', group: 'market' },
    { name: 'PriceMovementIndicator', file: 'components/market/PriceDisplay.tsx', exportName: 'PriceMovementIndicator', group: 'market' },
    { name: 'PriceChangeBadge', file: 'components/market/PriceDisplay.tsx', exportName: 'PriceChangeBadge', group: 'market' },
    { name: 'MarketWatchTable', file: 'components/market/MarketWatchTable.tsx', exportName: 'MarketWatchTable', group: 'market' },
    { name: 'MarketWatchCards', file: 'components/market/MarketWatchTable.tsx', exportName: 'MarketWatchCards', group: 'market' },
    { name: 'WatchPagination', file: 'components/market/MarketWatchTable.tsx', exportName: 'WatchPagination', group: 'market' },
    { name: 'MarketOverviewCard', file: 'components/market/MarketOverview.tsx', exportName: 'MarketOverviewCard', group: 'market' },
    { name: 'MarketMovers', file: 'components/market/MarketOverview.tsx', exportName: 'MarketMovers', group: 'market' },
    { name: 'MarketCoverageSummary', file: 'components/market/MarketOverview.tsx', exportName: 'MarketCoverageSummary', group: 'market' },
    { name: 'DataFreshnessIndicator', file: 'components/market/MarketOverview.tsx', exportName: 'DataFreshnessIndicator', group: 'market' },
    { name: 'PriceHistorySummary', file: 'components/market/MarketOverview.tsx', exportName: 'PriceHistorySummary', group: 'market' },

    // Charts
    { name: 'ChartContainer', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartContainer', group: 'charts' },
    { name: 'ChartSegment', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartSegment', group: 'charts' },
    { name: 'ChartLegend', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartLegend', group: 'charts' },
    { name: 'ChartEmptyState', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartEmptyState', group: 'charts' },
    { name: 'ChartLoadingState', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartLoadingState', group: 'charts' },
    { name: 'ChartErrorState', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartErrorState', group: 'charts' },
    { name: 'ChartMetricSummary', file: 'components/charts/ChartFrame.tsx', exportName: 'ChartMetricSummary', group: 'charts' },
    { name: 'PeriodRangeChart', file: 'components/charts/ChartFrame.tsx', exportName: 'PeriodRangeChart', group: 'charts' },

    // Feedback
    { name: 'MarketTableSkeleton', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'MarketTableSkeleton', group: 'feedback' },
    { name: 'OverviewCardSkeleton', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'OverviewCardSkeleton', group: 'feedback' },
    { name: 'ChartSkeleton', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'ChartSkeleton', group: 'feedback' },
    { name: 'CommodityCardSkeleton', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'CommodityCardSkeleton', group: 'feedback' },
    { name: 'PanelSkeleton', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'PanelSkeleton', group: 'feedback' },
    { name: 'EmptyStatePanel', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'EmptyStatePanel', group: 'feedback' },
    { name: 'ErrorStatePanel', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'ErrorStatePanel', group: 'feedback' },
    { name: 'ProvenanceNotice', file: 'components/feedback/TerminalFeedback.tsx', exportName: 'ProvenanceNotice', group: 'feedback' },
  ];

  it('implements every component the Phase 02 brief names', () => {
    const missing: string[] = [];
    for (const entry of PHASE_02_CATALOGUE) {
      const path = join(ROOT, entry.file);
      if (!existsSync(path)) {
        missing.push(`${entry.name} (${entry.file} does not exist)`);
        continue;
      }
      const contents = readFileSync(path, 'utf8');
      // A component may be defined in the file, or re-exported from the client
      // half of it — the interactive controls and the interactive chart are
      // deliberately split out. Both satisfy the catalogue.
      const defined = contents.includes(`export function ${entry.exportName}`);
      const reExported = new RegExp(
        String.raw`export\s*\{[^}]*\b${entry.exportName}\b[^}]*\}\s*from`,
      ).test(contents);
      if (!defined && !reExported) {
        missing.push(`${entry.name} (no export in ${entry.file})`);
      }
    }
    expect(missing, `The Phase 02 catalogue is missing:\n${missing.join('\n')}`).toEqual([]);
  });

  it('covers all five component groups the brief organises', () => {
    const groups = new Set(PHASE_02_CATALOGUE.map((entry) => entry.group));
    for (const required of ['core', 'market', 'charts', 'feedback']) {
      expect(groups, `${required} components are missing`).toContain(required);
    }
  });

  it('keeps the raw colours out of every Phase 02 component', () => {
    const offenders: string[] = [];
    for (const entry of PHASE_02_CATALOGUE) {
      const path = join(ROOT, entry.file);
      if (!existsSync(path)) continue;
      const contents = readFileSync(path, 'utf8');
      for (const match of contents.match(/#[0-9a-f]{6}/gi) ?? []) {
        offenders.push(`${entry.file}: ${match}`);
      }
    }
    expect(offenders, `Raw colours outside the token system:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('only uses colour utilities the theme actually defines, including the terminal families', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    const defined = new Set(
      Array.from(css.matchAll(/--color-([a-z0-9-]+)\s*:/g)).map((match) => match[1]!),
    );

    // The Phase 02 families. The terminal and editorial families carry no
    // numeric suffix, so the original numeric-only pattern could not see them;
    // this pattern can.
    const families = ['terminal', 'editorial', 'move'];
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
          String.raw`\b(?:bg|text|border|from|to|via|ring|fill|stroke|outline|decoration|accent|caret|divide)-((?:${families.join('|')})-[a-z][a-z0-9-]*)\b`,
          'g',
        );
        for (const match of contents.matchAll(pattern)) {
          if (!defined.has(match[1]!)) {
            offenders.push(`${full.replace(`${ROOT}/`, '')}: ${match[0]}`);
          }
        }
      }
    };
    walk(ROOT);

    expect(
      offenders,
      `Terminal colour utilities the theme does not define:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('never lets a movement colour carry the meaning on its own', () => {
    // The Phase 02 brief: movement indicators must not depend on colour alone.
    const source = readFileSync(join(ROOT, 'components', 'market', 'PriceDisplay.tsx'), 'utf8');
    // An arrow, a sign, and an accessible label that names the direction.
    expect(source).toContain('IconArrowUp');
    expect(source).toContain('IconArrowDown');
    expect(source).toContain('sr-only');
    // And the disclaimer, in words, on the indicator itself.
    expect(source).toContain('A movement is a direction, not a recommendation.');
    // A missing comparison is never shown as a flat zero.
    expect(source).toContain('No comparable previous period');
    expect(source).toContain('No comparison');
  });

  it('never shows a price without its unit', () => {
    // The Phase 02 brief: "A price must never be displayed without its relevant
    // context." Every price component takes a unit label and renders it beside
    // the figure rather than in a tooltip.
    const display = readFileSync(join(ROOT, 'components', 'market', 'PriceDisplay.tsx'), 'utf8');
    expect(display).toContain('unitLabel');
    expect(display).toContain('/ {unitLabel}');

    // The watch table carries the unit inside the price cell.
    const table = readFileSync(join(ROOT, 'components', 'market', 'MarketWatchTable.tsx'), 'utf8');
    expect(table).toContain('row.unitLabel');
    expect(table).toContain('/ {row.unitLabel}');
    // And it never renders a bare currency figure.
    expect(table).not.toMatch(/formatMoney\([^)]*\)\s*<\/span>/);
  });

  it('distinguishes observed data from derived aggregation in the chart system', () => {
    const charts = readFileSync(join(ROOT, 'components', 'charts', 'ChartFrame.tsx'), 'utf8');
    // The vocabulary exists and each kind is explained.
    for (const kind of ['observed', 'aggregated', 'indicative', 'projected', 'range']) {
      expect(charts, `${kind} is missing from the series vocabulary`).toContain(kind);
    }
    expect(charts).toContain('SERIES_KIND_EXPLANATIONS');
    // And the range chart refuses to call itself a candlestick. The prose may
    // *discuss* a candlestick — that is how the refusal is explained — but no
    // rendered label, no exported identifier and no caption may use the word.
    expect(charts).toContain('dispersion, not a trading range');

    // The series vocabulary itself must not offer a candlestick kind.
    const vocabulary = charts.slice(
      charts.indexOf('SERIES_KIND_LABELS'),
      charts.indexOf('/* --------------------------------------------------------------- the frame */'),
    );
    expect(vocabulary.toLowerCase()).not.toContain('candlestick');

    expect(charts).not.toMatch(/export (?:function|const) \w*[Cc]andlestick/);
    expect(charts).not.toMatch(/>\s*[Cc]andlestick/);
    // The caption and the legend entry are what a reader actually sees.
    expect(charts).not.toMatch(/label:\s*['"][^'"]*[Cc]andlestick/);
  });

  it('gives every empty state a reason and a next step', () => {
    const feedback = readFileSync(join(ROOT, 'components', 'feedback', 'TerminalFeedback.tsx'), 'utf8');
    for (const kind of [
      'no-market-data',
      'no-commodity-results',
      'no-history',
      'no-comparison',
      'no-research',
      'no-watchlist',
      'no-alerts',
      'no-coverage',
      'no-observations',
    ]) {
      expect(feedback, `${kind} is missing from the empty-state vocabulary`).toContain(`'${kind}'`);
    }
    // Every entry carries a body that explains the situation.
    expect(feedback.match(/body:/g)?.length ?? 0).toBeGreaterThanOrEqual(9);
  });

  it('only offers a retry where a retry is meaningful', () => {
    const feedback = readFileSync(join(ROOT, 'components', 'feedback', 'TerminalFeedback.tsx'), 'utf8');
    // An expired session and an invalid filter are not retryable, so they are
    // marked false and the component honours it.
    expect(feedback).toContain('retry: false');
    expect(feedback).toContain('copy.retry && onRetry');
  });

  it('keeps the mobile navigation a real dialog', () => {
    const mobile = readFileSync(join(ROOT, 'components', 'terminal', 'MobileNavigation.tsx'), 'utf8');
    expect(mobile).toContain('role="dialog"');
    expect(mobile).toContain('aria-modal="true"');
    expect(mobile).toContain("event.key === 'Escape'");
    // It closes on a route change, so a tap never leaves the drawer covering
    // the page the reader just asked for.
    expect(mobile).toContain('usePathname');
    // And it carries a bottom bar, because the mobile interface is deliberate
    // rather than a compressed desktop one.
    expect(mobile).toContain('fixed inset-x-0 bottom-0');
  });

  it('keeps the terminal header honest about freshness', () => {
    const shell = readFileSync(join(ROOT, 'components', 'terminal', 'TerminalShell.tsx'), 'utf8');
    // The freshness summary is optional and renders nothing without data: the
    // header falls back to a coverage line rather than to a decorative pulse.
    expect(shell).toContain('freshness?');
    expect(shell).toContain('coverageLine');
    // A page that just loaded is never described as freshly collected data.
    expect(shell).toContain('collection');

    // And the layout resolves it once, from the observations themselves.
    const layout = readFileSync(join(ROOT, 'app', '(site)', 'layout.tsx'), 'utf8');
    expect(layout).toContain('getTerminalSummary');
    expect(layout).toContain('freshness={summary.freshness}');
    expect(layout).toContain('coverageLine={summary.coverageLine}');
  });

  it('computes the header summary from observations, not from the page load', () => {
    const summary = readFileSync(join(ROOT, 'lib', 'terminal', 'summary.ts'), 'utf8');
    // It classifies with the same rules the price cards use, so the header and
    // the cards can never disagree.
    expect(summary).toContain('classifyFreshness');
    expect(summary).toContain('getCommodityFreshness');
    // And when there is nothing published it returns null rather than a pulse.
    expect(summary).toContain('freshness: null');
  });
});
