import 'server-only';

import { createClient } from '@/lib/supabase/server';
import {
  evaluateObservation,
  flagCodeForFinding,
  type QualityCandidate,
  type QualityContext,
  type QualityFinding,
} from './rules';

/**
 * The quality evaluation service.
 *
 * This is the bridge between the rule engine — which is pure, deterministic
 * and unit-tested — and the database. It assembles the context a rule needs
 * (the comparable prices, whether evidence was required, whether the agent
 * covers the market) and then hands the findings to the database to record.
 *
 * The rules run **at submission**, not only when a reviewer opens the
 * record. That matters for two reasons: the agent gets told immediately when
 * something looks wrong, and the verification queue shows the findings before
 * a human spends time on it.
 *
 * A finding never blocks a submission. It marks the record for review.
 */

/** How far back the comparables for a candidate are gathered. */
const COMPARABLE_WINDOW_DAYS = 14;

export interface EvaluationInput {
  observationId: string;
  marketId: number;
  commodityId: number;
  priceType: string;
  reportedAmount: number | null;
  reportedUnitId: number | null;
  collectedAt: string;
  agentUserId: string | null;
  notes: string | null;
}

export interface EvaluationResult {
  findings: QualityFinding[];
  /** True when the findings were written to the database. */
  recorded: boolean;
  /** Set when the evaluation could not run at all. */
  error?: string;
}

/**
 * Evaluate one observation and record the findings.
 *
 * Failure to evaluate is never fatal: the observation is already safely
 * stored, and a reviewer will see it regardless. The error is reported so the
 * Control Centre can show that the automatic check did not run.
 */
export async function evaluateAndRecord(
  input: EvaluationInput,
): Promise<EvaluationResult> {
  const supabase = await createClient();

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - COMPARABLE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const candidate: QualityCandidate = {
    id: input.observationId,
    marketId: input.marketId,
    commodityId: input.commodityId,
    priceType: input.priceType,
    reportedAmount: input.reportedAmount,
    reportedUnitId: input.reportedUnitId,
    collectedAt: input.collectedAt,
    agentUserId: input.agentUserId,
    notes: input.notes,
  };

  const [comparablesResult, evidenceResult, scheduleResult] = await Promise.all([
    supabase
      .from('price_observations')
      .select('reported_amount')
      .eq('commodity_id', input.commodityId)
      .eq('market_id', input.marketId)
      .eq('price_type', input.priceType)
      .eq('reported_unit_id', input.reportedUnitId ?? 0)
      .gte('collected_at', windowStart)
      .not('id', 'eq', input.observationId),
    supabase
      .from('price_observation_evidence')
      .select('id', { count: 'exact', head: true })
      .eq('observation_id', input.observationId),
    supabase
      .from('market_collection_schedules')
      .select('evidence_required')
      .eq('market_id', input.marketId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const comparables = (comparablesResult.data ?? [])
    .map((row) => Number(row.reported_amount))
    .filter((amount) => Number.isFinite(amount));

  const context: QualityContext = {
    comparables,
    evidenceRequired: Boolean(scheduleResult.data?.evidence_required),
    evidenceCount: evidenceResult.count ?? 0,
    // The database refuses a submission at an unassigned market outright, so
    // reaching this point means the agent does cover the market.
    assignedToMarket: true,
    freshnessWindowHours: 72,
    now,
  };

  const findings = evaluateObservation(candidate, context);

  if (findings.length === 0) {
    return { findings, recorded: true };
  }

  const payload = findings.map((finding) => ({
    ruleCode: finding.ruleCode,
    ruleVersion: finding.version,
    severity: finding.severity,
    message: finding.message,
    evidence: finding.evidence,
  }));

  const { error } = await supabase.rpc('apply_observation_findings', {
    p_observation_id: input.observationId,
    p_findings: payload,
  });

  if (error) {
    return {
      findings,
      recorded: false,
      error: error.message,
    };
  }

  return { findings, recorded: true };
}

/**
 * A short, agent-facing summary of the findings.
 *
 * The wording is deliberately plain. A field agent on a phone should be able
 * to read it once and know what to do.
 */
export function summariseForAgent(findings: QualityFinding[]): string | null {
  if (findings.length === 0) return null;

  const blocking = findings.filter((finding) => finding.severity === 'blocking');
  if (blocking.length > 0) {
    return `This price was flagged for a reviewer: ${blocking[0]!.message}`;
  }

  const review = findings.find((finding) => finding.severity === 'review');
  if (review) {
    return `Your price was submitted. Note: ${review.message}`;
  }

  const warning = findings.find((finding) => finding.severity === 'warning');
  if (warning) {
    return `Your price was submitted and flagged for a reviewer: ${warning.message}`;
  }

  return null;
}

/** The flag codes a set of findings maps onto, for the observation list. */
export function flagCodesFor(findings: QualityFinding[]): string[] {
  return [...new Set(findings.map((finding) => flagCodeForFinding(finding)))];
}
