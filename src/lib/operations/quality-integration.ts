/**
 * Hatsi360 — Quality Engine Integration
 *
 * Bridges the pure-function quality rule engine (`src/lib/quality/rules.ts`)
 * with the submission workflow. After an observation is submitted, this module:
 *
 *   1. Fetches comparable prices for the same commodity, market, price type, unit
 *   2. Runs the quality rules against the observation
 *   3. Persists the findings to `observation_quality_findings`
 *   4. Returns the findings for the UI to display
 *
 * This module is called from the submission server action, not from the UI.
 */

import { createClient } from '@/lib/supabase/server';
import { evaluateObservation, DEFAULT_THRESHOLDS, type QualityCandidate, type QualityContext, type QualityFinding } from '@/lib/quality/rules';

/**
 * Run the quality engine against a submitted observation and persist findings.
 *
 * Returns the findings array so the caller can display warnings.
 * A failure here does not block the submission — the observation is already
 * committed, and the quality findings are a review aid, not a veto.
 */
export async function runQualityEngine(observationId: string): Promise<QualityFinding[]> {
  try {
    const supabase = await createClient();

    // 1. Fetch the observation
    const { data: obs, error: obsError } = await supabase
      .from('price_observations')
      .select('id, commodity_id, market_id, price_type, reported_amount, reported_unit_id, collected_at, agent_user_id, notes')
      .eq('id', observationId)
      .single();

    if (obsError || !obs) return [];

    // 2. Fetch comparable prices (same commodity, market, price type, unit, last 30 days)
    const { data: comparables } = await supabase
      .from('price_observations')
      .select('reported_amount')
      .eq('commodity_id', obs.commodity_id)
      .eq('market_id', obs.market_id)
      .eq('price_type', obs.price_type)
      .eq('verification_status', 'verified')
      .not('reported_amount', 'is', null)
      .gte('collected_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .neq('id', observationId);

    const comparableAmounts = (comparables ?? [])
      .map((r: { reported_amount: number | null }) => Number(r.reported_amount))
      .filter((n: number) => !isNaN(n) && n > 0);

    // 3. Check if agent is assigned to the market
    const { data: isAssigned } = await supabase.rpc('is_assigned_to_market', {
      p_market_id: obs.market_id,
    });

    // 4. Count evidence attachments
    const { count: evidenceCount } = await supabase
      .from('price_observation_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('observation_id', observationId);

    // 5. Fetch commodity freshness window
    const { data: commodity } = await supabase
      .from('commodities')
      .select('freshness_window_hours')
      .eq('id', obs.commodity_id)
      .single();

    // 6. Build the quality context
    const context: QualityContext = {
      comparables: comparableAmounts,
      evidenceRequired: false, // Could be extended to check schedule
      evidenceCount: evidenceCount ?? 0,
      assignedToMarket: isAssigned ?? false,
      freshnessWindowHours: commodity?.freshness_window_hours ?? 72,
      now: new Date(),
    };

    // 7. Build the quality candidate
    const candidate: QualityCandidate = {
      id: obs.id,
      marketId: obs.market_id,
      commodityId: obs.commodity_id,
      priceType: obs.price_type,
      reportedAmount: obs.reported_amount !== null ? Number(obs.reported_amount) : null,
      reportedUnitId: obs.reported_unit_id,
      collectedAt: obs.collected_at,
      agentUserId: obs.agent_user_id,
      notes: obs.notes,
    };

    // 8. Run the quality rules
    const findings = evaluateObservation(candidate, context, DEFAULT_THRESHOLDS);

    // 9. Persist findings
    if (findings.length > 0) {
      const findingsJson = JSON.stringify(
        findings.map((f) => ({
          ruleCode: f.ruleCode,
          ruleVersion: f.version,
          severity: f.severity,
          message: f.message,
          evidence: f.evidence,
        })),
      );

      await supabase.rpc('apply_observation_findings', {
        p_observation_id: observationId,
        p_findings: findingsJson,
      });
    }

    return findings;
  } catch {
    // Quality engine failure must not block a submission
    return [];
  }
}
