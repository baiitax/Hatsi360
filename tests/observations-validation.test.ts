import { describe, expect, it } from 'vitest';
import {
  buildQualityHints,
  canSubmitObservation,
  detectDuplicates,
  observationIdempotencyKey,
  validateObservation,
  type ObservationInput,
} from '@/lib/observations/validation';

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    marketId: 1,
    commodityId: 1,
    gradeId: null,
    varietyId: null,
    priceType: 'wholesale_transaction',
    amount: 40_550,
    unitId: 1,
    packageWeightKg: null,
    packageCount: null,
    collectedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    notes: 'Market busy, supply steady.',
    ...overrides,
  };
}

describe('observation validation', () => {
  it('accepts a well-formed observation', () => {
    const result = validateObservation(validInput());
    expect(result.ok).toBe(true);
    expect(result.data?.amount).toBe(40_550);
  });

  it('rejects a zero price', () => {
    const result = validateObservation(validInput({ amount: 0 }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/greater than zero/i);
  });

  it('rejects a negative price', () => {
    expect(validateObservation(validInput({ amount: -100 })).ok).toBe(false);
  });

  it('rejects a missing market', () => {
    const result = validateObservation(validInput({ marketId: 0 }));
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.marketId).toBeTruthy();
  });

  it('rejects a missing commodity', () => {
    const result = validateObservation(validInput({ commodityId: 0 }));
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.commodityId).toBeTruthy();
  });

  it('rejects an unknown price type', () => {
    expect(validateObservation(validInput({ priceType: 'made_up' })).ok).toBe(false);
  });

  it('rejects a collection time in the future', () => {
    const result = validateObservation(
      validInput({ collectedAt: new Date(Date.now() + 86_400_000).toISOString() }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/future/i);
  });

  it('allows a small amount of clock skew', () => {
    const result = validateObservation(
      validInput({ collectedAt: new Date(Date.now() + 2 * 60_000).toISOString() }),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a collection time more than a year old', () => {
    const result = validateObservation(
      validInput({ collectedAt: new Date(Date.now() - 400 * 86_400_000).toISOString() }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/year/i);
  });

  it('rejects a price that is implausibly large', () => {
    expect(validateObservation(validInput({ amount: 999_999_999 })).ok).toBe(false);
  });

  it('rejects an over-long note', () => {
    expect(validateObservation(validInput({ notes: 'x'.repeat(1200) })).ok).toBe(false);
  });
});

describe('submission permissions', () => {
  const agent = {
    userId: 'agent-1',
    role: 'agent',
    assignedMarketIds: [1, 2],
  };

  it('allows an agent to submit for an assigned market', () => {
    expect(canSubmitObservation(agent, 1).allowed).toBe(true);
  });

  it('refuses an agent submitting for a market they are not assigned to', () => {
    const result = canSubmitObservation(agent, 99);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/assignment/i);
  });

  it('refuses a user with no collection role', () => {
    const result = canSubmitObservation(
      { userId: 'user-1', role: 'public_user', assignedMarketIds: [1] },
      1,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/agents and supervisors/i);
  });

  it('allows a supervisor to submit anywhere', () => {
    expect(
      canSubmitObservation({ userId: 's-1', role: 'market_supervisor', assignedMarketIds: [] }, 42)
        .allowed,
    ).toBe(true);
  });

  it('allows an administrator to submit anywhere', () => {
    expect(
      canSubmitObservation({ userId: 'a-1', role: 'admin', assignedMarketIds: [] }, 42).allowed,
    ).toBe(true);
  });

  it('never trusts a caller-supplied market list', () => {
    // The check takes the market id being submitted and compares it against the
    // server-derived assignment list — there is no way to pass a different list.
    const result = canSubmitObservation(
      { userId: 'agent-1', role: 'agent', assignedMarketIds: [] },
      1,
    );
    expect(result.allowed).toBe(false);
  });
});

describe('duplicate detection', () => {
  const existing = [
    {
      id: 'obs-1',
      commodityId: 1,
      marketId: 1,
      priceType: 'wholesale_transaction' as const,
      amount: 40_550,
      unitId: 1,
      collectedAt: '2025-07-06T09:00:00.000Z',
    },
  ];

  it('flags an identical submission', () => {
    const duplicates = detectDuplicates(
      {
        commodityId: 1,
        marketId: 1,
        priceType: 'wholesale_transaction',
        amount: 40_550,
        unitId: 1,
        collectedAt: '2025-07-06T09:05:00.000Z',
      },
      existing,
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]!.id).toBe('obs-1');
  });

  it('does not flag the same amount for a different market', () => {
    const duplicates = detectDuplicates(
      {
        commodityId: 1,
        marketId: 2,
        priceType: 'wholesale_transaction',
        amount: 40_550,
        unitId: 1,
        collectedAt: '2025-07-06T09:05:00.000Z',
      },
      existing,
    );
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag a different amount', () => {
    const duplicates = detectDuplicates(
      {
        commodityId: 1,
        marketId: 1,
        priceType: 'wholesale_transaction',
        amount: 41_000,
        unitId: 1,
        collectedAt: '2025-07-06T09:05:00.000Z',
      },
      existing,
    );
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag a different unit', () => {
    const duplicates = detectDuplicates(
      {
        commodityId: 1,
        marketId: 1,
        priceType: 'wholesale_transaction',
        amount: 40_550,
        unitId: 2,
        collectedAt: '2025-07-06T09:05:00.000Z',
      },
      existing,
    );
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag a submission outside the tolerance window', () => {
    const duplicates = detectDuplicates(
      {
        commodityId: 1,
        marketId: 1,
        priceType: 'wholesale_transaction',
        amount: 40_550,
        unitId: 1,
        collectedAt: '2025-07-06T14:00:00.000Z',
      },
      existing,
    );
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag a different price type', () => {
    const duplicates = detectDuplicates(
      {
        commodityId: 1,
        marketId: 1,
        priceType: 'retail',
        amount: 40_550,
        unitId: 1,
        collectedAt: '2025-07-06T09:05:00.000Z',
      },
      existing,
    );
    expect(duplicates).toHaveLength(0);
  });
});

describe('idempotency keys', () => {
  const base = {
    userId: 'agent-1',
    commodityId: 1,
    marketId: 1,
    priceType: 'wholesale_transaction' as const,
    amount: 40_550,
    unitId: 1,
    collectedAt: '2025-07-06T09:00:00.000Z',
  };

  it('produces the same key for the same observation', () => {
    expect(observationIdempotencyKey(base)).toBe(observationIdempotencyKey(base));
  });

  it('produces a different key for a different amount', () => {
    expect(observationIdempotencyKey(base)).not.toBe(
      observationIdempotencyKey({ ...base, amount: 40_551 }),
    );
  });

  it('produces a different key for a different market', () => {
    expect(observationIdempotencyKey(base)).not.toBe(
      observationIdempotencyKey({ ...base, marketId: 2 }),
    );
  });

  it('produces a different key for a different agent', () => {
    expect(observationIdempotencyKey(base)).not.toBe(
      observationIdempotencyKey({ ...base, userId: 'agent-2' }),
    );
  });

  it('gives a different key to a genuinely different collection time', () => {
    // Seven minutes apart is a different observation, so it gets a different
    // key. The near-duplicate case is handled by detectDuplicates instead.
    expect(
      observationIdempotencyKey({ ...base, collectedAt: '2025-07-06T09:07:00.000Z' }),
    ).not.toBe(observationIdempotencyKey(base));
  });
});

describe('quality hints', () => {
  const input = validateObservation(validInput()).data as ObservationInput;

  it('asks for a note when none was written', () => {
    const hints = buildQualityHints({ ...input, notes: '' }, { recentAmounts: [] });
    expect(hints.some((h) => h.message.includes('market conditions'))).toBe(true);
  });

  it('warns when a bag price is recorded without a weight', () => {
    const hints = buildQualityHints(
      { ...input, unitId: 3, packageWeightKg: null },
      { recentAmounts: [], bagUnitId: 3 },
    );
    expect(hints.some((h) => h.message.includes('bag weight'))).toBe(true);
  });

  it('warns about a price far from the recent median', () => {
    const hints = buildQualityHints(
      { ...input, amount: 200_000 },
      { recentAmounts: [40_000, 40_100, 40_200, 40_300] },
    );
    expect(hints.some((h) => h.level === 'warning' && h.message.includes('median'))).toBe(true);
  });

  it('does not warn about a price close to the recent median', () => {
    const hints = buildQualityHints(
      { ...input, amount: 40_400 },
      { recentAmounts: [40_000, 40_100, 40_200, 40_300] },
    );
    expect(hints.some((h) => h.level === 'warning')).toBe(false);
  });
});
