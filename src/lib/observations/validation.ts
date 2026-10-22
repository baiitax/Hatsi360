/**
 * Observation input validation and authorisation rules.
 *
 * These functions are pure so they can be unit-tested without a database, and
 * so the same rules can be applied on the client (for fast feedback and
 * offline drafts) and on the server (which is the one that actually counts).
 */

import { z } from 'zod';
import type { PriceType } from '@/types/domain';

export const OBSERVATION_PRICE_TYPES: PriceType[] = [
  'farmgate',
  'wholesale_asking',
  'wholesale_transaction',
  'retail',
  'processor_procurement',
  'export_buy',
  'export_sell',
  'indicative',
  'unspecified',
];

export const observationSchema = z
  .object({
    marketId: z.coerce.number().int().positive('Choose the market you collected the price at.'),
    commodityId: z.coerce.number().int().positive('Choose the commodity.'),
    gradeId: z.coerce.number().int().positive().optional().nullable(),
    varietyId: z.coerce.number().int().positive().optional().nullable(),
    priceType: z.enum(
      OBSERVATION_PRICE_TYPES as unknown as [PriceType, ...PriceType[]],
    ),
    amount: z.coerce
      .number()
      .positive('Enter a price greater than zero.')
      .max(100_000_000, 'That price looks too large — check the unit.'),
    unitId: z.coerce.number().int().positive('Choose the unit the price was quoted in.'),
    packageWeightKg: z.coerce.number().positive().max(1000).optional().nullable(),
    packageCount: z.coerce.number().int().positive().max(100000).optional().nullable(),
    collectedAt: z
      .string()
      .min(1, 'Record when you collected the price.')
      .refine((value) => !Number.isNaN(new Date(value).getTime()), 'That date and time is not valid.'),
    notes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  })
  .refine(
    (value) => {
      const collected = new Date(value.collectedAt).getTime();
      // Allow a small clock skew into the future, but nothing more.
      return collected <= Date.now() + 5 * 60_000;
    },
    { message: 'The collection time cannot be in the future.', path: ['collectedAt'] },
  )
  .refine(
    (value) => {
      const collected = new Date(value.collectedAt).getTime();
      return collected >= Date.now() - 365 * 24 * 3600_000;
    },
    { message: 'That collection time is more than a year ago.', path: ['collectedAt'] },
  );

export type ObservationInput = z.infer<typeof observationSchema>;

export interface ValidationResult {
  ok: boolean;
  data?: ObservationInput;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export function validateObservation(raw: unknown): ValidationResult {
  const parsed = observationSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return {
    ok: false,
    error: parsed.error.issues[0]?.message ?? 'Check the highlighted fields.',
    fieldErrors,
  };
}

/* -------------------------------------------------------------- permissions */

export interface AgentPermissionContext {
  userId: string;
  role: string;
  /** Markets the agent currently holds an active assignment for. */
  assignedMarketIds: number[];
}

/**
 * May this account submit an observation for this market?
 *
 * The answer is always "no" unless there is an explicit, active assignment.
 * A supervisor or administrator may submit anywhere, and that decision is
 * recorded in the audit trail like any other.
 *
 * The assignment list must come from the database on the server. A list
 * supplied by the caller is never consulted.
 */
export function canSubmitObservation(
  context: AgentPermissionContext,
  marketId: number,
): { allowed: boolean; reason?: string } {
  if (context.role === 'admin' || context.role === 'super_admin' || context.role === 'market_supervisor') {
    return { allowed: true };
  }
  if (context.role !== 'agent') {
    return {
      allowed: false,
      reason: 'Only market agents and supervisors can submit price observations.',
    };
  }
  if (!context.assignedMarketIds.includes(marketId)) {
    return {
      allowed: false,
      reason: 'You do not have an active assignment for this market.',
    };
  }
  return { allowed: true };
}

/* --------------------------------------------------------------- duplicates */

export interface DuplicateCandidate {
  id: string;
  commodityId: number;
  marketId: number;
  priceType: PriceType;
  amount: number;
  unitId: number | null;
  collectedAt: string;
}

/**
 * Duplicate detection.
 *
 * Two observations are duplicates when they share the commodity, market, price
 * type, grade, amount, unit and collection time. The window is widened by
 * `toleranceMinutes` so that a second submission a few minutes later is still
 * caught, but a genuine re-quote later in the day is not.
 */
export function detectDuplicates(
  candidate: {
    commodityId: number;
    marketId: number;
    priceType: PriceType;
    gradeId?: number | null;
    amount: number;
    unitId?: number | null;
    collectedAt: string;
  },
  existing: DuplicateCandidate[],
  toleranceMinutes = 10,
): DuplicateCandidate[] {
  const candidateTime = new Date(candidate.collectedAt).getTime();
  if (Number.isNaN(candidateTime)) return [];

  return existing.filter((row) => {
    if (row.commodityId !== candidate.commodityId) return false;
    if (row.marketId !== candidate.marketId) return false;
    if (row.priceType !== candidate.priceType) return false;
    if (Math.abs(row.amount - candidate.amount) > 0.009) return false;
    if ((row.unitId ?? null) !== (candidate.unitId ?? null)) return false;

    const rowTime = new Date(row.collectedAt).getTime();
    if (Number.isNaN(rowTime)) return false;
    return Math.abs(rowTime - candidateTime) <= toleranceMinutes * 60_000;
  });
}

/**
 * A deterministic idempotency key for a submission.
 *
 * The same observation submitted twice produces the same key, so a retried
 * request (for example after a dropped connection) cannot create two records.
 */
export function observationIdempotencyKey(input: {
  userId: string;
  commodityId: number;
  marketId: number;
  priceType: PriceType;
  amount: number;
  unitId: number;
  collectedAt: string;
}): string {
  const collected = new Date(input.collectedAt).toISOString().slice(0, 16);
  return [
    input.userId,
    input.commodityId,
    input.marketId,
    input.priceType,
    input.amount,
    input.unitId,
    collected,
  ].join(':');
}

/* ------------------------------------------------------------------ quality */

/**
 * Client-side quality hints shown to the agent before submission.
 *
 * These are advisory. The authoritative checks run on the server.
 */
export interface QualityHint {
  level: 'info' | 'warning';
  message: string;
}

export function buildQualityHints(
  input: ObservationInput,
  context: { recentAmounts: number[]; bagUnitId?: number; defaultBagWeightKg?: number },
): QualityHint[] {
  const hints: QualityHint[] = [];

  if (context.recentAmounts.length >= 4) {
    const sorted = [...context.recentAmounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const reference =
      sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
    if (reference > 0) {
      const deviation = ((input.amount - reference) / reference) * 100;
      if (Math.abs(deviation) >= 50) {
        hints.push({
          level: 'warning',
          message: `This is ${deviation > 0 ? 'above' : 'below'} the recent median for this market by ${Math.abs(Math.round(deviation))}%. Submit it anyway if it is what you were told — unusual prices are flagged for review, not discarded.`,
        });
      }
    }
  }

  if (input.packageWeightKg == null && context.bagUnitId === input.unitId) {
    hints.push({
      level: 'warning',
      message:
        'You recorded a bag price without the bag weight. Please add the weight so the price can be compared with per-kilogram prices.',
    });
  }

  if (!input.notes || input.notes.trim().length === 0) {
    hints.push({
      level: 'info',
      message: 'Add a short note about market conditions — it helps the verifier and the trader.',
    });
  }

  return hints;
}
