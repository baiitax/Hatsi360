import { describe, expect, it } from 'vitest';
import { REPORTS, reportById, reportToCsv } from '@/lib/reports';
import {
  makeAgent,
  makeAssignment,
  makeMarket,
  makeObservation,
  makeSchedule,
  makeSnapshot,
  makeTask,
} from '../analytics/snapshot-fixture';

/**
 * The reports and their CSV rendering.
 *
 * An export must be exactly what the console shows, so the CSV is rendered
 * from the same rows. A value that contains a comma or a quote has to be
 * escaped properly or the file is not a CSV at all.
 */

describe('reportToCsv', () => {
  const report = {
    id: 'daily_prices' as const,
    label: 'Daily collected prices',
    description: 'x',
    purpose: 'x',
    roles: ['analyst' as const],
    columns: ['Commodity', 'Amount'],
    build: () => [] as string[][],
  };

  it('writes the header even when there are no rows', () => {
    const csv = reportToCsv(report, []);
    expect(csv.trim()).toBe('Commodity,Amount');
  });

  it('escapes a value that contains a comma', () => {
    const csv = reportToCsv(report, [['Paddy Rice, milled', '40000']]);
    expect(csv).toContain('"Paddy Rice, milled"');
  });

  it('escapes a value that contains a quote', () => {
    const csv = reportToCsv(report, [['Maize "grade 1"', '1']]);
    expect(csv).toContain('"Maize ""grade 1"""');
  });

  it('keeps a plain value unquoted', () => {
    const csv = reportToCsv(report, [['Maize', '40000']]);
    expect(csv).toContain('Maize,40000');
  });
});

describe('the report builders', () => {
  const snapshot = makeSnapshot({
    markets: [makeMarket({ id: 1 }), makeMarket({ id: 2, name: 'Mile 12' })],
    agents: [makeAgent({ id: 'agent-1', full_name: 'Amina Bello' })],
    assignments: [makeAssignment({ user_id: 'agent-1', market_id: 1 })],
    schedules: [makeSchedule({ market_id: 1, commodity_id: 10 })],
    tasks: [makeTask({ id: 1, status: 'completed' })],
    observations: [
      makeObservation({ id: 'a', commodity_id: 10, market_id: 1 }),
      makeObservation({ id: 'b', commodity_id: 11, market_id: 2, published_at: '2026-10-22T09:00:00.000Z' }),
    ],
    submissions: [
      makeObservation({ id: 'a', commodity_id: 10, market_id: 1 }),
      makeObservation({
        id: 'b',
        commodity_id: 11,
        market_id: 2,
        published_at: '2026-10-22T09:00:00.000Z',
      }),
    ],
  });

  it('builds a row for every observation in the daily prices report', () => {
    const report = reportById('daily_prices')!;
    const rows = report.build(snapshot);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.length).toBe(report.columns.length);
  });

  it('builds a row for every agent in the performance report', () => {
    const report = reportById('agent_performance')!;
    const rows = report.build(snapshot);
    expect(rows).toHaveLength(1);
    expect(rows[0]![0]).toBe('Amina Bello');
  });

  it('builds a row for every market in the coverage report', () => {
    const report = reportById('coverage_against_plan')!;
    const rows = report.build(snapshot);
    expect(rows).toHaveLength(1);
    expect(rows[0]![0]).toBe('Dawanau');
  });

  it('produces a CSV for every report without throwing', () => {
    for (const report of REPORTS) {
      const rows = report.build(snapshot);
      const csv = reportToCsv(report, rows);
      expect(csv.split('\n')[0]).toBe(report.columns.join(','));
    }
  });

  it('produces an empty, well-formed report when there is no data', () => {
    const empty = makeSnapshot();
    for (const report of REPORTS) {
      const rows = report.build(empty);
      const csv = reportToCsv(report, rows);
      expect(csv.split('\n')[0]).toBe(report.columns.join(','));
    }
  });
});
