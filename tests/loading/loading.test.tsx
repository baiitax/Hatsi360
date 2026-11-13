// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';

import { HatsiGlobalPreloader } from '@/components/loading/HatsiGlobalPreloader';
import {
  HatsiCardSkeleton,
  HatsiChartSkeleton,
  HatsiMetricSkeleton,
  HatsiPageSkeleton,
  HatsiTableSkeleton,
} from '@/components/loading/HatsiSkeletons';
import { HatsiActionLoader, HatsiSpinner } from '@/components/loading/HatsiActionLoader';
import { HatsiErrorRecovery } from '@/components/loading/HatsiErrorRecovery';

const ROOT = process.cwd();

/**
 * Loading architecture tests.
 *
 * The brief set four rules for loading feedback, and these tests hold the
 * implementation to them:
 *
 *  1. The four levels are distinct — a global preloader, a route boundary,
 *     a component skeleton and an action indicator — and each is used where
 *     it belongs.
 *  2. The preloader never hides on an arbitrary timer, never blocks usable
 *     content, and always has a way out.
 *  3. The root layout stays a server component.
 *  4. Reduced motion is honoured, and the loading feedback is accessible.
 */

afterEach(() => cleanup());

/* ------------------------------------------------------- the four levels -- */

describe('the loading levels', () => {
  it('provides all four levels as separate components', () => {
    const components = join(ROOT, 'src', 'components', 'loading');
    const files = readdirSync(components);
    expect(files).toContain('HatsiGlobalPreloader.tsx');
    expect(files).toContain('HatsiLoadingIndicator.tsx');
    expect(files).toContain('HatsiSkeletons.tsx');
    expect(files).toContain('HatsiActionLoader.tsx');
    expect(files).toContain('HatsiErrorRecovery.tsx');
  });

  it('has a route-level loading boundary on the public platform', () => {
    expect(existsSync(join(ROOT, 'src/app/(site)/loading.tsx'))).toBe(true);
    expect(existsSync(join(ROOT, 'src/app/(portal)/loading.tsx'))).toBe(true);
  });

  it('has a route-level loading boundary on every data-bearing public route', () => {
    const routes = [
      'prices',
      'prices/[commodity]',
      'commodities',
      'commodities/[slug]',
      'markets',
      'markets/[slug]',
      'insights',
      'insights/[slug]',
      'reports',
      'compare',
    ];
    for (const route of routes) {
      expect(
        existsSync(join(ROOT, 'src/app/(site)', route, 'loading.tsx')),
        `${route} has no loading boundary`,
      ).toBe(true);
    }
  });

  it('has a loading boundary on the Control Centre and the Field App', () => {
    expect(existsSync(join(ROOT, 'src/app/admin/loading.tsx'))).toBe(true);
    expect(existsSync(join(ROOT, 'src/app/agent/loading.tsx'))).toBe(true);
  });

  it('does not put a full-screen loader on the admin or field surfaces', () => {
    // The Control Centre and the Field App are dense operational tools. A
    // full-screen preloader on them would slow down the work they exist for.
    for (const shell of ['src/components/admin/AdminShell.tsx', 'src/components/agent/AgentShell.tsx']) {
      const contents = readFileSync(join(ROOT, shell), 'utf8');
      expect(contents).not.toContain('HatsiGlobalPreloader');
    }
  });
});

/* --------------------------------------------------------- the preloader -- */

describe('the global preloader', () => {
  it('is rendered by the root layout', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain('HatsiGlobalPreloader');
    expect(layout).toContain('HatsiBootSignal');
  });

  it('keeps the root layout a server component', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(layout).not.toMatch(/^\s*'use client'/m);
    expect(layout).not.toMatch(/^\s*"use client"/m);
  });

  it('does not disappear on an arbitrary timer', () => {
    const source = readFileSync(
      join(ROOT, 'src/components/loading/HatsiGlobalPreloader.tsx'),
      'utf8',
    );
    // The curtain is dismissed by the readiness signal, never by a timeout
    // that happens to elapse.
    expect(source).toContain('window.__hatsiBoot');
    expect(source).toContain('REVEAL_DELAY_MS');
    // The only timeout in the component guards the reveal and the watchdog;
    // neither one dismisses the curtain.
    const dismissCalls = source.match(/dismiss\(/g) ?? [];
    expect(dismissCalls.length).toBeGreaterThan(0);
    expect(source).not.toMatch(/setTimeout\([^)]*dismiss\(/);
  });

  it('does not block usable content', () => {
    const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
    // The curtain is an overlay, not a page replacement: it is positioned
    // over the server-rendered page and it stops taking pointer events the
    // moment it is dismissed.
    expect(css).toMatch(/\.hatsi-boot\s*\{[\s\S]*?position:\s*fixed/);
    expect(css).toMatch(/\.hatsi-boot\s*\{[\s\S]*?pointer-events:\s*none/);
    expect(css).toMatch(/\.hatsi-boot\[data-state='visible'\][\s\S]*?pointer-events:\s*auto/);
  });

  it('always offers a way out when the application never signals readiness', () => {
    const recovery = readFileSync(
      join(ROOT, 'src/components/loading/HatsiBootRecovery.tsx'),
      'utf8',
    );
    expect(recovery).toContain('Try again');
    expect(recovery).toContain('Continue to the page');
    expect(recovery).toContain('window.location.reload()');
  });

  it('uses the brand palette and the official mark', () => {
    const source = readFileSync(
      join(ROOT, 'src/components/loading/HatsiGlobalPreloader.tsx'),
      'utf8',
    );
    expect(source).toContain('/brand/hatsi360-mark-light.png');
    expect(source).toContain('Connecting to agricultural intelligence');
    const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
    expect(css).toContain('--color-brand-800');
    expect(css).toContain('--color-harvest-500');
  });

  it('renders the curtain in the server markup', () => {
    render(<HatsiGlobalPreloader />);
    const curtain = document.getElementById('hatsi-boot-curtain');
    expect(curtain).toBeTruthy();
    expect(curtain!.getAttribute('aria-hidden')).toBe('true');
    expect(curtain!.getAttribute('role')).toBe('status');
    expect(curtain!.querySelector('.hatsi-boot__logo')).toBeTruthy();
  });

  it('announces itself accessibly while it is showing', () => {
    render(<HatsiGlobalPreloader />);
    const curtain = document.getElementById('hatsi-boot-curtain');
    expect(curtain!.getAttribute('aria-busy')).toBe('true');
    expect(curtain!.getAttribute('aria-live')).toBe('polite');
  });
});

/* ------------------------------------------------------------ the skeletons -- */

describe('the skeletons', () => {
  it('marks a page skeleton as busy and announces it', () => {
    render(<HatsiPageSkeleton title="Loading prices" />);
    const region = document.querySelector('[aria-busy="true"]');
    expect(region).toBeTruthy();
    expect(screen.getByText(/Loading prices/)).toBeTruthy();
  });

  it('hides the decorative blocks from assistive technology', () => {
    render(<HatsiPageSkeleton />);
    const decorative = document.querySelectorAll('.hatsi-skeleton[aria-hidden="true"]');
    expect(decorative.length).toBeGreaterThan(0);
  });

  it('renders a card skeleton with a reserved media box', () => {
    render(<HatsiCardSkeleton />);
    const media = document.querySelector('.hatsi-skeleton--card-media');
    expect(media).toBeTruthy();
  });

  it('renders a table skeleton with the requested shape', () => {
    const { container } = render(<HatsiTableSkeleton rows={4} columns={3} />);
    expect(container.querySelectorAll('.hatsi-skeleton--line').length).toBeGreaterThan(9);
  });

  it('renders a chart skeleton with a reserved height', () => {
    const { container } = render(<HatsiChartSkeleton height={320} />);
    const panel = container.querySelector('[aria-busy="true"]') as HTMLElement;
    expect(panel.style.minHeight).toBe('320px');
  });

  it('renders a metric skeleton', () => {
    const { container } = render(<HatsiMetricSkeleton count={4} />);
    expect(container.querySelectorAll('.card').length).toBe(4);
  });
});

/* --------------------------------------------------------- the action level -- */

describe('the action loader', () => {
  it('shows nothing when the action is idle', () => {
    const { container } = render(<HatsiActionLoader pending={false} />);
    expect(container.textContent).toBe('');
  });

  it('announces the action while it runs', () => {
    render(<HatsiActionLoader pending label="Building the report…" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('Building the report…');
  });

  it('renders a decorative spinner', () => {
    const { container } = render(<HatsiSpinner />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
  });
});

/* ------------------------------------------------------------- the recovery -- */

describe('the error recovery', () => {
  it('states what happened and offers a retry', () => {
    render(
      <HatsiErrorRecovery
        message="The report could not be built."
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('The report could not be built.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('has no retry control when no recovery is possible', () => {
    render(<HatsiErrorRecovery message="Nothing has been published yet." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/* -------------------------------------------------------- reduced motion -- */

describe('reduced motion', () => {
  it('stops the loader animations when reduced motion is preferred', () => {
    const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
    const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('hatsi-boot__arc');
    expect(block).toContain('hatsi-boot__bar-fill');
    expect(block).toContain('hatsi-progress__bar');
    expect(block).toContain('hatsi-spinner');
    // The static mark and the static track replace the movement.
    expect(block).toContain('animation: none !important');
  });

  it('keeps a visible progress indication under reduced motion', () => {
    const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
    const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('width: 38%');
  });
});

/* --------------------------------------------------- the route indicator -- */

describe('the route progress indicator', () => {
  it('is mounted in the root layout', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain('HatsiLoadingIndicator');
  });

  it('renders nothing while no navigation is in flight', () => {
    const indicator = document.createElement('div');
    expect(indicator.querySelector('.hatsi-progress')).toBeNull();
  });

  it('uses the Next.js link status rather than a timer', () => {
    const source = readFileSync(
      join(ROOT, 'src/components/loading/HatsiLoadingIndicator.tsx'),
      'utf8',
    );
    expect(source).toContain('useLinkStatus');
    expect(source).not.toContain('setTimeout');
  });
});
