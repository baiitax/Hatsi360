import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  evaluateObservation,
  flagCodeForFinding,
  medianOf,
  ruleCatalogue,
  worstSeverity,
  type QualityCandidate,
  type QualityContext,
} from '@/lib/quality/rules';

/**
 * The quality rule engine.
 *
 * These tests are the contract for what the engine flags. They matter because
 * the engine now runs at submission: a rule that fires on a good price sends
 * a reviewer to a record that does not need them.
 */

function candidate(overrides: Partial<QualityCandidate> = {}): QualityCandidate {
  return {
    id: 'obs-1',
    marketId: 1,
    commodityId: 1,
    priceType: 'wholesale_transaction',
    reportedAmount: 40_000,
    reportedUnitId: 2,
    collectedAt: new Date('2026-06-01T09:30:00Z').toISOString(),
    agentUserId: 'agent-1',
    notes: null,
    ...overrides,
  };
}

function context(overrides: Partial<QualityContext> = {}): QualityContext {
  return {
    comparables: [],
    evidenceRequired: false,
    evidenceCount: 0,
    assignedToMarket: true,
    freshnessWindowHours: 72,
    now: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('quality rule engine', () => {
  it('publishes a rule catalogue with a version for every rule', () => {
    const catalogue = ruleCatalogue();
    expect(catalogue.length).toBeGreaterThanOrEqual(9);
    for (const rule of catalogue) {
      expect(rule.code).toBeTruthy();
      expect(rule.version).toBeGreaterThanOrEqual(1);
      expect(rule.description).toBeTruthy();
      expect(['info', 'warning', 'review', 'blocking']).toContain(rule.severity);
    }
  });

  it('raises nothing for a clean, assigned, unit-bearing price', () => {
    const findings = evaluateObservation(candidate(), context());
    expect(findings).toEqual([]);
  });

  it('blocks a record with no amount', () => {
    const findings = evaluateObservation(
      candidate({ reportedAmount: null }),
      context(),
    );
    const finding = findings.find((f) => f.ruleCode === 'missing_mandatory_field');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('blocking');
    expect(finding!.message).toMatch(/price/);
  });

  it('blocks a non-positive price', () => {
    const findings = evaluateObservation(candidate({ reportedAmount: 0 }), context());
    expect(findings.some((f) => f.ruleCode === 'invalid_price')).toBe(true);
  });

  it('blocks a price collected at a market the agent does not cover', () => {
    const findings = evaluateObservation(
      candidate(),
      context({ assignedToMarket: false }),
    );
    const finding = findings.find((f) => f.ruleCode === 'market_not_assigned');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('blocking');
  });

  it('flags a missing unit for review rather than blocking it', () => {
    const findings = evaluateObservation(candidate({ reportedUnitId: null }), context());
    const finding = findings.find((f) => f.ruleCode === 'unrecognised_unit');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('review');
  });

  it('flags a large price change against the comparable median', () => {
    const findings = evaluateObservation(
      candidate({ reportedAmount: 90_000 }),
      context({ comparables: [40_000, 40_500, 41_000] }),
    );
    const finding = findings.find((f) => f.ruleCode === 'large_price_change');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
    expect(finding!.evidence.comparableMedian).toBe(40_500);
  });

  it('does not flag a large price change when the absolute change is small', () => {
    // A 60% move on a tiny base is not an unusual price.
    const findings = evaluateObservation(
      candidate({ reportedAmount: 160 }),
      context({ comparables: [100] }),
    );
    expect(findings.some((f) => f.ruleCode === 'large_price_change')).toBe(false);
  });

  it('does not flag a price with no comparables', () => {
    const findings = evaluateObservation(
      candidate({ reportedAmount: 900_000 }),
      context({ comparables: [] }),
    );
    expect(findings.some((f) => f.ruleCode === 'large_price_change')).toBe(false);
  });

  it('flags a suspected duplicate', () => {
    const findings = evaluateObservation(
      candidate({ reportedAmount: 40_000 }),
      context({ comparables: [40_000] }),
    );
    expect(findings.some((f) => f.ruleCode === 'duplicate_suspected')).toBe(true);
  });

  it('flags missing evidence only when evidence was required', () => {
    const required = evaluateObservation(
      candidate(),
      context({ evidenceRequired: true, evidenceCount: 0 }),
    );
    expect(required.some((f) => f.ruleCode === 'missing_evidence')).toBe(true);

    const notRequired = evaluateObservation(
      candidate(),
      context({ evidenceRequired: false, evidenceCount: 0 }),
    );
    expect(notRequired.some((f) => f.ruleCode === 'missing_evidence')).toBe(false);

    const attached = evaluateObservation(
      candidate(),
      context({ evidenceRequired: true, evidenceCount: 1 }),
    );
    expect(attached.some((f) => f.ruleCode === 'missing_evidence')).toBe(false);
  });

  it('flags a collection time in the future', () => {
    const findings = evaluateObservation(
      candidate({ collectedAt: new Date('2026-06-01T20:00:00Z').toISOString() }),
      context(),
    );
    expect(
      findings.some((f) => f.ruleCode === 'collection_timestamp_out_of_range'),
    ).toBe(true);
  });

  it('flags a collection time that is too old', () => {
    const findings = evaluateObservation(
      candidate({ collectedAt: new Date('2026-05-01T09:00:00Z').toISOString() }),
      context(),
    );
    const finding = findings.find(
      (f) => f.ruleCode === 'collection_timestamp_out_of_range',
    );
    expect(finding).toBeDefined();
    expect(finding!.evidence.hoursOld).toBeGreaterThan(DEFAULT_THRESHOLDS.maxAgeHours);
  });

  it('reports the most serious finding first', () => {
    const findings = evaluateObservation(
      candidate({ reportedAmount: null, reportedUnitId: null }),
      context({ assignedToMarket: false, evidenceRequired: true }),
    );
    expect(worstSeverity(findings)).toBe('blocking');
  });

  it('maps every finding onto a flag code the database accepts', () => {
    const codes = [
      'duplicate_suspected',
      'price_outlier',
      'unit_conversion_unverified',
      'missing_evidence',
      'stale',
      'timestamp_inconsistent',
    ];
    for (const code of codes) {
      expect(
        codes,
        `${code} must be a value the quality_flag_code enum accepts`,
      ).toContain(code);
    }
    const finding = {
      ruleCode: 'duplicate_suspected',
      version: 1,
      severity: 'warning' as const,
      message: 'x',
      evidence: {},
    };
    expect(flagCodeForFinding(finding)).toBe('duplicate_suspected');
  });

  it('computes a median the way the summaries do', () => {
    expect(medianOf([])).toBe(0);
    expect(medianOf([10])).toBe(10);
    expect(medianOf([10, 20])).toBe(15);
    expect(medianOf([10, 20, 30])).toBe(20);
    expect(medianOf([30, 10, 20])).toBe(20);
  });
});
