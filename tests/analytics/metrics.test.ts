import { describe, expect, it } from 'vitest';
import {
  agentPerformance,
  collectionTrends,
  commodityCoverage,
  consecutiveReportingDays,
  liveOperationsFeed,
  marketCoverage,
  overviewMetrics,
} from '@/lib/analytics/metrics';
import {
  makeAgent,
  makeAssignment,
  makeMarket,
  makeObservation,
  makeSchedule,
  makeSnapshot,
  makeTask,
} from './snapshot-fixture';

/**
 * The metric tests.
 *
 * Each one pins a rule the console depends on: a missing value is null and
 * not zero, a cancelled task is excluded from every denominator, a zero
 * denominator never becomes a percentage, and the comparison is made against
 * the equivalent previous period rather than against a moving target.
 */

function metricValue(metrics: ReturnType<typeof overviewMetrics>, id: string) {
  const metric = metrics.find((entry) => entry.id === id);
  if (!metric) throw new Error(`No metric called ${id}`);
  return metric;
}

describe('overviewMetrics', () => {
  it('counts the markets that produced a price today', () => {
    const snapshot = makeSnapshot({
      markets: [makeMarket({ id: 1 }), makeMarket({ id: 2, name: 'Mile 12' })],
      observations: [
        makeObservation({ id: 'a', market_id: 1, collected_at: '2026-10-22T07:00:00.000Z' }),
        makeObservation({ id: 'b', market_id: 1, collected_at: '2026-10-21T07:00:00.000Z' }),
      ],
    });

    expect(metricValue(overviewMetrics(snapshot), 'markets_observed_today').value).toBe(1);
  });

  it('reports a missing count as null, never as zero', () => {
    const snapshot = makeSnapshot({ counts: { marketsTotal: null } });
    expect(metricValue(overviewMetrics(snapshot), 'markets_total').value).toBeNull();
  });

  it('compares the current period with the equivalent previous period', () => {
    const snapshot = makeSnapshot({
      observations: [
        makeObservation({ id: 'a', collected_at: '2026-10-22T07:00:00.000Z' }),
        makeObservation({
          id: 'b',
          collected_at: '2026-10-15T07:00:00.000Z',
          submitted_at: '2026-10-15T08:00:00.000Z',
        }),
      ],
    });

    const metric = metricValue(overviewMetrics(snapshot), 'observations_in_period');
    expect(metric.value).toBe(1);
    expect(metric.comparison.previous).toBe(1);
    expect(metric.comparison.changePercent).toBe(0);
  });

  it('leaves the comparison undefined when the previous period had nothing', () => {
    const snapshot = makeSnapshot({
      observations: [
        makeObservation({ id: 'a', collected_at: '2026-10-22T07:00:00.000Z' }),
      ],
    });

    const metric = metricValue(overviewMetrics(snapshot), 'observations_in_period');
    expect(metric.value).toBe(1);
    expect(metric.comparison.previous).toBe(0);
    // A jump from zero is not "100% more" — the denominator was zero.
    expect(metric.comparison.changePercent).toBeNull();
  });

  it('counts the markets that have no agent', () => {
    const snapshot = makeSnapshot({
      markets: [makeMarket({ id: 1 }), makeMarket({ id: 2, name: 'Mile 12' })],
      assignments: [makeAssignment({ market_id: 1 })],
    });

    expect(metricValue(overviewMetrics(snapshot), 'markets_without_agent').value).toBe(1);
  });
});

describe('agentPerformance', () => {
  it('excludes a cancelled task from the completion denominator', () => {
    const snapshot = makeSnapshot({
      agents: [makeAgent()],
      tasks: [
        makeTask({ id: 1, status: 'completed' }),
        makeTask({ id: 2, status: 'cancelled' }),
      ],
    });

    const [row] = agentPerformance(snapshot);
    expect(row!.tasksEligible).toBe(1);
    expect(row!.tasksCompleted).toBe(1);
    expect(row!.taskCompletionRate).toBe(100);
  });

  it('reports a null completion rate when there is no eligible task', () => {
    const snapshot = makeSnapshot({ agents: [makeAgent()], tasks: [] });
    const [row] = agentPerformance(snapshot);
    expect(row!.tasksEligible).toBe(0);
    expect(row!.taskCompletionRate).toBeNull();
  });

  it('counts the acceptance rate against the reviewed submissions only', () => {
    const snapshot = makeSnapshot({
      agents: [makeAgent()],
      submissions: [
        makeObservation({ id: 'a', verification_status: 'verified' }),
        makeObservation({ id: 'b', verification_status: 'verified' }),
        makeObservation({ id: 'c', verification_status: 'rejected' }),
        makeObservation({ id: 'd', verification_status: 'submitted' }),
      ],
    });

    const [row] = agentPerformance(snapshot);
    // 2 accepted out of 3 reviewed; the one still in the queue is not counted.
    expect(row!.verificationAcceptanceRate).toBe(66.7);
    expect(row!.observationsSubmitted).toBe(4);
  });

  it('measures the time from starting a task to submitting it', () => {
    const snapshot = makeSnapshot({
      agents: [makeAgent()],
      tasks: [
        makeTask({
          started_at: '2026-10-22T08:00:00.000Z',
          submitted_at: '2026-10-22T10:30:00.000Z',
        }),
      ],
    });

    const [row] = agentPerformance(snapshot);
    expect(row!.avgHoursToSubmission).toBe(2.5);
  });

  it('reports no average time when no task has both a start and a submission', () => {
    const snapshot = makeSnapshot({ agents: [makeAgent()], tasks: [makeTask()] });
    const [row] = agentPerformance(snapshot);
    expect(row!.avgHoursToSubmission).toBeNull();
  });

  it('does not let one agent see another agent’s submissions', () => {
    const snapshot = makeSnapshot({
      agents: [makeAgent({ id: 'agent-1' }), makeAgent({ id: 'agent-2', full_name: 'Bello' })],
      submissions: [
        makeObservation({ id: 'a', agent_user_id: 'agent-1' }),
        makeObservation({ id: 'b', agent_user_id: 'agent-2' }),
        makeObservation({ id: 'c', agent_user_id: 'agent-2' }),
      ],
    });

    const rows = agentPerformance(snapshot);
    const first = rows.find((row) => row.agentId === 'agent-1');
    const second = rows.find((row) => row.agentId === 'agent-2');
    expect(first!.observationsSubmitted).toBe(1);
    expect(second!.observationsSubmitted).toBe(2);
  });
});

describe('consecutiveReportingDays', () => {
  it('counts an unbroken run of reporting days', () => {
    expect(
      consecutiveReportingDays(
        ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'],
        ['2026-10-20', '2026-10-21', '2026-10-22'],
      ),
    ).toBe(3);
  });

  it('is zero when nothing was reported', () => {
    expect(consecutiveReportingDays(['2026-10-21'], [])).toBe(0);
  });

  it('is zero when there was no eligible work', () => {
    expect(consecutiveReportingDays([], ['2026-10-21'])).toBe(0);
  });

  it('skips a day with no eligible task rather than breaking the run', () => {
    expect(
      consecutiveReportingDays(
        ['2026-10-19', '2026-10-21', '2026-10-22'],
        ['2026-10-19', '2026-10-21', '2026-10-22'],
      ),
    ).toBe(3);
  });
});

describe('marketCoverage', () => {
  it('measures coverage against the expected commodities, not against nothing', () => {
    const snapshot = makeSnapshot({
      markets: [makeMarket()],
      schedules: [makeSchedule({ commodity_id: 10 }), makeSchedule({ id: 2, commodity_id: 11 })],
      tasks: [makeTask({ expected_commodity_ids: [10, 11] })],
      observations: [makeObservation({ id: 'a', commodity_id: 10 })],
    });

    const [row] = marketCoverage(snapshot);
    expect(row!.expected).toBe(2);
    expect(row!.collected).toBe(1);
    expect(row!.coverageRate).toBe(50);
  });

  it('reports a null coverage rate when nothing was expected', () => {
    const snapshot = makeSnapshot({ markets: [makeMarket()], schedules: [], tasks: [] });
    const [row] = marketCoverage(snapshot);
    expect(row!.coverageRate).toBeNull();
  });

  it('lists the commodities that are expected but were not reported', () => {
    const snapshot = makeSnapshot({
      markets: [makeMarket()],
      schedules: [makeSchedule({ commodity_id: 10 }), makeSchedule({ id: 2, commodity_id: 11 })],
      observations: [makeObservation({ id: 'a', commodity_id: 10 })],
    });

    const [row] = marketCoverage(snapshot);
    expect(row!.missingCommodities).toBe(1);
  });
});

describe('collectionTrends', () => {
  it('produces one point per day in the window', () => {
    const snapshot = makeSnapshot({ days: 7 });
    const trends = collectionTrends(snapshot);
    expect(trends).toHaveLength(7);
    expect(trends[0]!.date).toBe('2026-10-16');
    expect(trends.at(-1)!.date).toBe('2026-10-22');
  });

  it('separates collected from submitted', () => {
    const snapshot = makeSnapshot({
      observations: [makeObservation({ id: 'a', collected_at: '2026-10-20T07:00:00.000Z' })],
      submissions: [
        makeObservation({
          id: 'b',
          collected_at: '2026-10-20T07:00:00.000Z',
          submitted_at: '2026-10-22T07:00:00.000Z',
        }),
      ],
    });

    const trends = collectionTrends(snapshot);
    const collectedDay = trends.find((point) => point.date === '2026-10-20');
    const submittedDay = trends.find((point) => point.date === '2026-10-22');
    expect(collectedDay!.collected).toBe(1);
    expect(collectedDay!.submitted).toBe(0);
    expect(submittedDay!.submitted).toBe(1);
    expect(submittedDay!.collected).toBe(0);
  });

  it('reports no median verification time when nothing has been verified', () => {
    const snapshot = makeSnapshot({
      submissions: [makeObservation({ id: 'a', verified_at: null })],
    });
    const trends = collectionTrends(snapshot);
    expect(trends.find((point) => point.date === '2026-10-22')!.medianHoursToVerification).toBeNull();
  });
});

describe('liveOperationsFeed', () => {
  it('puts the most serious event first', () => {
    const snapshot = makeSnapshot({
      markets: [makeMarket({ id: 1 }), makeMarket({ id: 2, name: 'Mile 12' })],
      assignments: [makeAssignment({ market_id: 1 })],
      agents: [makeAgent()],
      submissions: [makeObservation({ id: 'a', verification_status: 'submitted' })],
    });

    const feed = liveOperationsFeed(snapshot);
    expect(feed.length).toBeGreaterThan(0);
    // The market with no agent is the critical item.
    expect(feed[0]!.kind).toBe('Market without an agent');
  });

  it('is empty when there is genuinely nothing to do', () => {
    const snapshot = makeSnapshot({
      markets: [makeMarket()],
      assignments: [makeAssignment()],
      agents: [makeAgent()],
    });
    expect(liveOperationsFeed(snapshot)).toHaveLength(0);
  });
});

describe('commodityCoverage', () => {
  it('groups the observations by commodity', () => {
    const snapshot = makeSnapshot({
      observations: [
        makeObservation({ id: 'a', commodity_id: 10, market_id: 1 }),
        makeObservation({ id: 'b', commodity_id: 10, market_id: 2 }),
        makeObservation({ id: 'c', commodity_id: 11, market_id: 1 }),
      ],
    });

    const rows = commodityCoverage(snapshot);
    expect(rows[0]!.commodityId).toBe(10);
    expect(rows[0]!.observations).toBe(2);
    expect(rows[0]!.markets).toBe(2);
    expect(rows[1]!.commodityId).toBe(11);
  });

  it('is empty when nothing was collected', () => {
    expect(commodityCoverage(makeSnapshot())).toHaveLength(0);
  });
});
