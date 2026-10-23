import { describe, expect, it } from 'vitest';
import { reportsForRole, REPORTS } from '@/lib/reports';
import {
  ADMIN_NAV,
  applyBadges,
  navigationForRole as navigationForRoleFromOperations,
} from '@/lib/operations/navigation';

/**
 * The navigation and the report registry.
 *
 * Two rules are tested here: a module is only listed for the roles that may
 * open it, and every report has a documented scope and a role that may run
 * it. Nothing is listed that does not exist.
 */

describe('navigationForRole', () => {
  it('gives an agent no access to the control centre at all', () => {
    // The agent workspace is separate; the admin navigation is not used.
    const groups = navigationForRoleFromOperations('agent');
    expect(groups).toHaveLength(0);
  });

  it('gives a verification officer the review queue but not the settings', () => {
    const hrefs = navigationForRoleFromOperations('verification_officer')
      .flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs).toContain('/admin/verification');
    expect(hrefs).not.toContain('/admin/settings');
    expect(hrefs).not.toContain('/admin/agents');
  });

  it('gives an administrator every implemented module', () => {
    const hrefs = navigationForRoleFromOperations('admin').flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(hrefs).toContain('/admin/overview');
    expect(hrefs).toContain('/admin/agents');
    expect(hrefs).toContain('/admin/settings');
    expect(hrefs).toContain('/admin/system');
  });

  it('gives an analyst the analytics centre but not the agent management', () => {
    const hrefs = navigationForRoleFromOperations('analyst').flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(hrefs).toContain('/admin/analytics');
    expect(hrefs).not.toContain('/admin/agents');
  });

  it('never lists a module twice', () => {
    const hrefs = ADMIN_NAV.flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('gives every item a glyph and a label', () => {
    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        expect(item.label.length).toBeGreaterThan(2);
        expect(item.icon.length).toBeGreaterThan(0);
        expect(item.href.startsWith('/admin')).toBe(true);
      }
    }
  });
});

describe('applyBadges', () => {
  it('attaches the live counters to the right entries', () => {
    const groups = navigationForRoleFromOperations('admin');
    const rendered = applyBadges(groups, { pendingVerification: 7, openTasks: 3 });

    const verification = rendered
      .flatMap((group) => group.items)
      .find((item) => item.href === '/admin/verification');
    const tasks = rendered
      .flatMap((group) => group.items)
      .find((item) => item.href === '/admin/tasks');

    expect(verification?.badge).toBe(7);
    expect(tasks?.badge).toBe(3);
  });

  it('leaves an entry without a badge when the counter is unknown', () => {
    const rendered = applyBadges(navigationForRoleFromOperations('admin'), {});
    const verification = rendered
      .flatMap((group) => group.items)
      .find((item) => item.href === '/admin/verification');
    expect(verification?.badge).toBeUndefined();
  });
});

describe('the report registry', () => {
  it('has exactly twelve reports', () => {
    expect(REPORTS).toHaveLength(12);
  });

  it('gives every report a unique id, a label, a purpose and columns', () => {
    const ids = new Set<string>();
    for (const report of REPORTS) {
      expect(ids.has(report.id)).toBe(false);
      ids.add(report.id);
      expect(report.label.length).toBeGreaterThan(3);
      expect(report.description.length).toBeGreaterThan(10);
      expect(report.purpose.length).toBeGreaterThan(10);
      expect(report.columns.length).toBeGreaterThan(1);
      expect(report.roles.length).toBeGreaterThan(0);
    }
  });

  it('lets a market agent run no reports', () => {
    expect(reportsForRole('agent')).toHaveLength(0);
  });

  it('lets an analyst run the analytics reports', () => {
    const ids = reportsForRole('analyst').map((report) => report.id);
    expect(ids).toContain('agent_performance');
    expect(ids).toContain('commodity_movement');
  });
});
