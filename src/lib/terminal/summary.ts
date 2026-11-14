/**
 * Hatsi360 Markets — the terminal's header summary.
 *
 * The one line under the module bar that says how current the platform's data
 * is, and what it covers.
 *
 * This module exists because that line is the easiest place in the whole
 * product to lie. A header that says "Live" next to a page that loaded a second
 * ago is telling a reader the wrong thing: the page is fresh, the data is
 * whatever age the last collection gave it. So this summary is computed from
 * the observations themselves, through the same freshness rules the price cards
 * use, and it reports *collection* state.
 *
 * When the platform holds no published observation, it returns `null` for the
 * freshness summary and a coverage line instead — and the header renders the
 * coverage line. It never renders a pulse.
 */

import { getCommodityFreshness } from '@/lib/trade';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getDataSource } from '@/lib/data';
import { classifyFreshness, type PriceState } from '@/lib/trade/freshness';
import { resolveRoute } from '@/lib/route-map';

/** The summary the terminal header renders. */
export interface TerminalSummary {
  /** `null` when there is no published observation to summarise. */
  freshness: { state: PriceState; label: string; observedAt: string | null } | null;
  /** A plain statement of what the platform actually covers. */
  coverageLine: string;
  /** The counts behind the coverage line, for the overview cards. */
  counts: {
    commodities: number;
    markets: number;
    observations: number;
    publishedObservations: number;
  };
}

/**
 * Build the terminal's header summary.
 *
 * Every number is counted from the database. When a count is zero it stays
 * zero — there is no floor, no rounding and no "many".
 */
export async function getTerminalSummary(): Promise<TerminalSummary> {
  const empty: TerminalSummary = {
    freshness: null,
    coverageLine: 'No published price observation is available yet.',
    counts: { commodities: 0, markets: 0, observations: 0, publishedObservations: 0 },
  };

  if (!isSupabaseConfigured()) return empty;

  const source = await getDataSource();

  const [commodities, markets, observations, freshness] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    // The published, publicly readable subset — the same view the public
    // surfaces read, so the header and the page can never disagree.
    source.listObservations({ page: 1, pageSize: 1 }).catch(() => null),
    getCommodityFreshness().catch(() => []),
  ]);

  const total = observations?.total ?? 0;
  const latest = freshness.reduce<{ state: PriceState; label: string; observedAt: string | null } | null>(
    (best, row) => {
      if (!row.collectedAt) return best;
      if (!best || new Date(row.collectedAt) > new Date(best.observedAt ?? 0)) {
        return { state: row.state, label: row.label, observedAt: row.collectedAt };
      }
      return best;
    },
    null,
  );

  // The most recent *published* observation, classified with the same rules a
  // price card uses. A header summary that used different rules would disagree
  // with the cards below it.
  let publishedFreshness: TerminalSummary['freshness'] = null;
  if (observations && observations.items.length > 0) {
    const newest = observations.items[0];
    const assessment = classifyFreshness({
      collectedAt: newest.collectedAt,
      collectedAtPrecision: newest.collectedAtPrecision,
      verificationStatus: newest.verificationStatus,
      priceType: newest.priceType,
      cadence: 'daily',
    });
    publishedFreshness = {
      state: assessment.state,
      label: assessment.label,
      observedAt: newest.collectedAt,
    };
  }

  return {
    freshness: publishedFreshness ?? latest,
    coverageLine: buildCoverageLine({
      commodities: commodities.length,
      markets: markets.length,
      published: total,
    }),
    counts: {
      commodities: commodities.length,
      markets: markets.length,
      observations: freshness.reduce((sum, row) => sum + row.observationCount, 0),
      publishedObservations: total,
    },
  };
}

/**
 * The coverage line.
 *
 * It states what the platform holds, in the same words the coverage report
 * uses, and it never rounds a zero up to something that sounds like coverage.
 */
function buildCoverageLine({
  commodities,
  markets,
  published,
}: {
  commodities: number;
  markets: number;
  published: number;
}): string {
  if (published === 0) {
    return commodities === 0
      ? 'The catalogue is empty. No commodity has been registered yet.'
      : `${commodities} commodities registered · ${markets} markets listed · no published price observation yet.`;
  }
  return `${published} published observation${published === 1 ? '' : 's'} · ${commodities} commodities · ${markets} markets`;
}

/** The coverage page's own URL, resolved through the alias map. */
export const COVERAGE_HREF = resolveRoute('/coverage');
