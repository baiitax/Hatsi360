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
 * A rule never changes a price. It explains why a reviewer should look at
 * one, and it carries the version of the rule that produced the finding so a
 * flag raised last month can still be explained.
 */

const NOW = new Date('2026-10-22T10:00:00.000Z');

const candidate: QualityCandidate = {
  id: 'obs-1',
  marketId: 1,
  commodityId: 10,
  priceType: 'wholesale_transaction',
  reportedAmount: 40000,
  reportedUnitId: 1,
  collectedAt: '2026-10-22T08:00:00.000Z',
  agentUserId: 'agent-1',
  notes: null,
};

const context: QualityContext = {
  comparables: [],
  evidenceRequired: false,
  evidenceCount: 0,
  assignedToMarket: true,
  freshnessWindowHours: 72,
  now: NOW,
};

describe('evaluateObservation', () => {
  it('raises nothing for a clean record', () => {
    expect(evaluateObservation(candidate, context)).toHaveLength(0);
  });

  it('blocks a record with no price', () => {
    const findings = evaluateObservation({ ...candidate, reportedAmount: null }, context);
    const finding = findings.find((entry) => entry.ruleCode === 'missing_mandatory_field');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('blocking');
  });

  it('blocks a price that is not positive', () => {
    const findings = evaluateObservation({ ...candidate, reportedAmount: 0 }, context);
    expect(findings.find((entry) => entry.ruleCode === 'invalid_price')).toBeDefined();
  });

  it('blocks a record collected at a market the agent does not cover', () => {
    const findings = evaluateObservation(candidate, {
      ...context,
      assignedToMarket: false,
    });
    const finding = findings.find((entry) => entry.ruleCode === 'market_not_assigned');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('blocking');
  });

  it('asks for a review when the unit was not recorded', () => {
    const findings = evaluateObservation({ ...candidate, reportedUnitId: null }, context);
    const finding = findings.find((entry) => entry.ruleCode === 'unrecognised_unit');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('review');
  });

  it('warns about a price far from the comparable median', () => {
    const findings = evaluateObservation(
      { ...candidate, reportedAmount: 90000 },
      { ...context, comparables: [40000, 41000, 42000] },
    );
    const finding = findings.find((entry) => entry.ruleCode === 'large_price_change');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('does not warn about a small change against a large median', () => {
    const findings = evaluateObservation(
      { ...candidate, reportedAmount: 41000 },
      { ...context, comparables: [40000, 41000, 42000] },
    );
    expect(findings.find((entry) => entry.ruleCode === 'large_price_change')).toBeUndefined();
  });

  it('raises nothing about a change when there is nothing to compare with', () => {
    const findings = evaluateObservation({ ...candidate, reportedAmount: 90000 }, context);
    expect(findings.find((entry) => entry.ruleCode === 'large_price_change')).toBeUndefined();
  });

  it('suspects a duplicate when the same amount already appears', () => {
    const findings = evaluateObservation(
      { ...candidate, reportedAmount: 40000 },
      { ...context, comparables: [40000] },
    );
    expect(findings.find((entry) => entry.ruleCode === 'duplicate_suspected')).toBeDefined();
  });

  it('asks for a review when required evidence is missing', () => {
    const findings = evaluateObservation(candidate, {
      ...context,
      evidenceRequired: true,
      evidenceCount: 0,
    });
    expect(findings.find((entry) => entry.ruleCode === 'missing_evidence')).toBeDefined();
  });

  it('does not ask for evidence that was attached', () => {
    const findings = evaluateObservation(candidate, {
      ...context,
      evidenceRequired: true,
      evidenceCount: 2,
    });
    expect(findings.find((entry) => entry.ruleCode === 'missing_evidence')).toBeUndefined();
  });

  it('flags a collection that is too old to be relevant', () => {
    const findings = evaluateObservation(
      { ...candidate, collectedAt: '2026-10-01T08:00:00.000Z' },
      context,
    );
    const finding = findings.find((entry) => entry.ruleCode === 'collection_timestamp_out_of_range');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('review');
  });

  it('flags a collection timestamp in the future', () => {
    const findings = evaluateObservation(
      { ...candidate, collectedAt: '2026-10-25T08:00:00.000Z' },
      context,
    );
    expect(
      findings.find((entry) => entry.ruleCode === 'collection_timestamp_out_of_range'),
    ).toBeDefined();
  });

  it('notes a record outside its freshness window as information only', () => {
    const findings = evaluateObservation(
      { ...candidate, collectedAt: '2026-10-01T08:00:00.000Z' },
      { ...context, freshnessWindowHours: 24 },
    );
    const finding = findings.find((entry) => entry.ruleCode === 'stale_observation');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('info');
  });

  it('records the rule version on every finding', () => {
    const findings = evaluateObservation({ ...candidate, reportedAmount: null }, context);
    for (const finding of findings) {
      expect(finding.version).toBeGreaterThan(0);
    }
  });
});

describe('medianOf', () => {
  it('returns zero for an empty set', () => {
    expect(medianOf([])).toBe(0);
  });

  it('takes the middle value of an odd set', () => {
    expect(medianOf([10, 20, 30])).toBe(20);
  });

  it('averages the middle pair of an even set', () => {
    expect(medianOf([10, 20, 30, 40])).toBe(25);
  });
});

describe('worstSeverity', () => {
  it('is null when there are no findings', () => {
    expect(worstSeverity([])).toBeNull();
  });

  it('picks the most serious finding', () => {
    const findings = evaluateObservation({ ...candidate, reportedAmount: null }, {
      ...context,
      evidenceRequired: true,
    });
    expect(worstSeverity(findings)).toBe('blocking');
  });
});

describe('ruleCatalogue', () => {
  it('lists every rule with a version and a severity', () => {
    const catalogue = ruleCatalogue();
    expect(catalogue.length).toBeGreaterThan(0);
    for (const rule of catalogue) {
      expect(rule.code).toMatch(/^[a-z_]+$/);
      expect(rule.version).toBeGreaterThan(0);
      expect(rule.description.length).toBeGreaterThan(10);
    }
  });
});

describe('flagCodeForFinding', () => {
  it('maps a finding onto a flag the database accepts', () => {
    const known = new Set([
      'duplicate_suspected',
      'price_outlier',
      'unit_conversion_unverified',
      'bag_weight_inconsistent',
      'timestamp_inconsistent',
      'missing_evidence',
      'conflicting_report',
      'stale',
    ]);
    const findings = evaluateObservation({ ...candidate, reportedAmount: null }, context);
    for (const finding of findings) {
      expect(known.has(flagCodeForFinding(finding))).toBe(true);
    }
  });
});

describe('thresholds', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_THRESHOLDS.largeChangeRatio).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.duplicateThreshold).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_THRESHOLDS.maxAgeHours).toBeGreaterThan(0);
  });
});
