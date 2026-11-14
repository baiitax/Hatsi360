/**
 * Intelligence overview and fundamentals panels for the commodity profile.
 *
 * These panels sit inside the terminal shell and use the existing token system.
 * They present FAOSTAT data and field-reported fundamentals honestly, with no
 * fabrication and clear provenance.
 */

import Link from 'next/link';
import {
  IconArrowRight,
  IconChart,
  IconDatabase,
  IconLeaf,
  IconShieldCheck,
  IconTrendingUp,
  IconAlertTriangle,
} from '@/components/ui/icons';
import {
  type CommodityIntelligenceOverview,
  formatMt,
  describeSelfSufficiency,
  describeStockToUse,
} from '@/lib/intelligence/commodity-intelligence';
import type { FundamentalSignal } from '@/lib/trade/queries';

/* ====================================================== Intelligence Overview */

/**
 * Key intelligence metrics at a glance.
 *
 * Pulls from the FAOSTAT-derived `analytics_commodity_overview` table. Each
 * figure is the latest available and carries its year label. When no
 * intelligence data exists yet, the panel renders a "not yet available" state
 * with a link to track when it arrives.
 */
export function IntelligenceOverviewPanel({
  intelligence,
  commoditySlug,
  commodityName,
}: {
  intelligence: CommodityIntelligenceOverview | null;
  commoditySlug: string;
  commodityName: string;
}) {
  if (!intelligence) {
    return (
      <section aria-label="Commodity intelligence">
        <div className="terminal-panel p-4">
          <div className="flex items-start gap-3">
            <IconChart className="mt-0.5 size-5 shrink-0 text-terminal-text-muted" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="text-[0.8125rem] font-semibold text-terminal-text">
                Commodity intelligence
              </h3>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                Production, supply-demand, and trade intelligence for {commodityName} is not yet available.
                It will appear here once the FAOSTAT ingestion pipeline has processed this commodity.
              </p>
              <Link
                href={`/intelligence/${commoditySlug}`}
                className="mt-3 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-harvest-400 hover:text-harvest-300"
              >
                Check the intelligence hub
                <IconArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const selfSufficiency = describeSelfSufficiency(intelligence.selfSufficiencyPercent);
  const stockToUse = describeStockToUse(intelligence.stockToUsePercent);

  const toneForSelfSufficiency =
    selfSufficiency.tone === 'surplus'
      ? 'text-success-500'
      : selfSufficiency.tone === 'balanced'
        ? 'text-warning-500'
        : 'text-error-500';

  const toneForStockToUse =
    stockToUse.tone === 'comfortable'
      ? 'text-success-500'
      : stockToUse.tone === 'adequate'
        ? 'text-warning-500'
        : 'text-error-500';

  return (
    <section aria-label="Commodity intelligence">
      <div className="terminal-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[0.8125rem] font-semibold text-terminal-text">
              <IconChart className="size-4 text-harvest-400" aria-hidden="true" />
              Commodity intelligence
            </h3>
            <p className="mt-0.5 text-[0.6875rem] text-terminal-text-secondary">
              Sourced from FAOSTAT with {intelligence.totalEvidenceRecords} evidence record
              {intelligence.totalEvidenceRecords === 1 ? '' : 's'}
              {intelligence.latestProductionYear ? ` · ${intelligence.latestProductionYear} data` : ''}
            </p>
          </div>
          <Link
            href={`/intelligence/${intelligence.commoditySlug}`}
            className="inline-flex items-center gap-1 rounded-lg border border-terminal-border px-2.5 py-1.5 text-[0.6875rem] font-medium text-terminal-text transition-colors hover:border-harvest-500/40 hover:text-harvest-300"
          >
            Full intelligence
            <IconArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Key metrics grid */}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {intelligence.latestProductionMt !== null && (
            <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
              <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-terminal-text-muted">
                Production
              </dt>
              <dd className="mt-1 flex items-baseline gap-1">
                <span className="figure-num text-lg font-bold tabular-nums text-terminal-text">
                  {formatMt(intelligence.latestProductionMt)}
                </span>
                {intelligence.latestProductionYear && (
                  <span className="text-[0.625rem] text-terminal-text-muted">
                    {intelligence.latestProductionYear}
                  </span>
                )}
              </dd>
            </div>
          )}

          <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
            <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-terminal-text-muted">
              Self-sufficiency
            </dt>
            <dd className="mt-1 flex items-baseline gap-1">
              {intelligence.selfSufficiencyPercent !== null ? (
                <>
                  <span className={`figure-num text-lg font-bold tabular-nums ${toneForSelfSufficiency}`}>
                    {intelligence.selfSufficiencyPercent.toFixed(1)}%
                  </span>
                  <span className="text-[0.625rem] text-terminal-text-muted">
                    {selfSufficiency.label}
                  </span>
                </>
              ) : (
                <span className="text-[0.8125rem] text-terminal-text-muted">—</span>
              )}
            </dd>
          </div>

          <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
            <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-terminal-text-muted">
              Stock-to-use
            </dt>
            <dd className="mt-1 flex items-baseline gap-1">
              {intelligence.stockToUsePercent !== null ? (
                <>
                  <span className={`figure-num text-lg font-bold tabular-nums ${toneForStockToUse}`}>
                    {intelligence.stockToUsePercent.toFixed(1)}%
                  </span>
                  <span className="text-[0.625rem] text-terminal-text-muted">
                    {stockToUse.label}
                  </span>
                </>
              ) : (
                <span className="text-[0.8125rem] text-terminal-text-muted">—</span>
              )}
            </dd>
          </div>

          {intelligence.latestYieldMtPerHa !== null && (
            <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
              <dt className="text-[0.625rem] font-medium uppercase tracking-wide text-terminal-text-muted">
                Yield
              </dt>
              <dd className="mt-1 flex items-baseline gap-1">
                <span className="figure-num text-lg font-bold tabular-nums text-terminal-text">
                  {intelligence.latestYieldMtPerHa.toFixed(2)}
                </span>
                <span className="text-[0.625rem] text-terminal-text-muted">MT/ha</span>
              </dd>
            </div>
          )}
        </dl>

        {/* Trade summary */}
        {(intelligence.latestExportsMt !== null || intelligence.latestImportsMt !== null) && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-terminal-border pt-3 text-[0.75rem] text-terminal-text-secondary">
            {intelligence.latestImportsMt !== null && (
              <div>
                <span className="text-terminal-text-muted">Imports: </span>
                <span className="font-medium text-terminal-text">
                  {formatMt(intelligence.latestImportsMt)}
                </span>
              </div>
            )}
            {intelligence.latestExportsMt !== null && (
              <div>
                <span className="text-terminal-text-muted">Exports: </span>
                <span className="font-medium text-terminal-text">
                  {formatMt(intelligence.latestExportsMt)}
                </span>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-[0.625rem] leading-relaxed text-terminal-text-muted">
          Intelligence data is updated annually from external sources and may lag behind real-time
          market conditions. All figures carry provenance metadata and are never fabricated.
        </p>
      </div>
    </section>
  );
}

/* ====================================================== Fundamental Signals ===== */

/**
 * Field-reported fundamental signals for a commodity.
 *
 * These come from `observation_market_intelligence`, written by the Field app.
 * They are the platform's own fundamental data — supply levels, demand levels,
 * price direction, sentiment — gathered during field visits.
 */
export function FundamentalSignalsPanel({
  signals,
  commodityName,
}: {
  signals: FundamentalSignal[];
  commodityName: string;
}) {
  if (signals.length === 0) {
    return (
      <section aria-label="Fundamental signals">
        <div className="terminal-panel p-4">
          <div className="flex items-start gap-3">
            <IconLeaf className="mt-0.5 size-5 shrink-0 text-terminal-text-muted" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="text-[0.8125rem] font-semibold text-terminal-text">
                Fundamental signals
              </h3>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
                No field-reported fundamentals have been published for {commodityName} yet.
                As agents collect observations in the field, supply levels, demand signals
                and price direction will appear here.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Fundamental signals">
      <div className="terminal-panel p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[0.8125rem] font-semibold text-terminal-text">
              <IconLeaf className="size-4 text-leaf-400" aria-hidden="true" />
              Fundamental signals
            </h3>
            <p className="mt-0.5 text-[0.6875rem] text-terminal-text-secondary">
              Field-reported intelligence from {signals.length} observation
              {signals.length === 1 ? '' : 's'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-leaf-400">
            <IconShieldCheck className="size-2.5" aria-hidden="true" />
            Field-sourced
          </span>
        </div>

        {/* Most recent signal */}
        {signals.length > 0 && (
          <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
            <div className="mb-2 text-[0.625rem] font-medium uppercase tracking-wide text-terminal-text-muted">
              Latest signal
            </div>
            <FundamentalSignalRow signal={signals[0]!} />
          </div>
        )}

        {/* Earlier signals */}
        {signals.length > 1 && (
          <div className="mt-2 space-y-1">
            <div className="text-[0.625rem] font-medium uppercase tracking-wide text-terminal-text-muted">
              Earlier signals
            </div>
            {signals.slice(1, 6).map((signal, i) => (
              <div
                key={i}
                className="rounded-lg border border-terminal-border/50 bg-terminal-surface/50 p-2"
              >
                <FundamentalSignalRow signal={signal} compact />
              </div>
            ))}
            {signals.length > 6 && (
              <p className="text-[0.625rem] text-terminal-text-muted">
                +{signals.length - 6} more signal{signals.length - 6 === 1 ? '' : 's'}
              </p>
            )}
          </div>
        )}

        <p className="mt-3 text-[0.625rem] leading-relaxed text-terminal-text-muted">
          Fundamental signals are field-reported by agents during collection visits. They reflect
          conditions observed at specific markets on specific dates, not aggregated forecasts.
        </p>
      </div>
    </section>
  );
}

/** A single fundamental signal row with all its dimensions. */
function FundamentalSignalRow({
  signal,
  compact = false,
}: {
  signal: FundamentalSignal;
  compact?: boolean;
}) {
  const date = new Date(signal.collectedAt).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={compact ? 'text-[0.6875rem]' : 'text-[0.75rem]'}>
      <div className="flex flex-wrap items-center gap-2 text-terminal-text-secondary">
        <span className="font-medium text-terminal-text">{signal.marketName}</span>
        <span className="text-terminal-text-muted">·</span>
        <span>{date}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-2">
        {signal.supplyLevel && (
          <SignalPill label="Supply" value={signal.supplyLevel} />
        )}
        {signal.demandLevel && (
          <SignalPill label="Demand" value={signal.demandLevel} />
        )}
        {signal.priceDirection && (
          <SignalPill label="Price" value={signal.priceDirection} />
        )}
        {signal.sentiment && (
          <SignalPill label="Sentiment" value={signal.sentiment} />
        )}
      </div>

      {signal.availability && (
        <p className="mt-1 text-[0.6875rem] text-terminal-text-muted">
          <span className="font-medium text-terminal-text-secondary">Availability: </span>
          {signal.availability}
        </p>
      )}

      {signal.developments && (
        <p className="mt-1 text-[0.6875rem] text-terminal-text-secondary">
          {signal.developments}
        </p>
      )}
    </div>
  );
}

/** A coloured pill for a fundamental signal dimension. */
function SignalPill({ label, value }: { label: string; value: string }) {
  // Determine tone based on signal value
  let toneClass = 'bg-terminal-surface text-terminal-text-secondary border-terminal-border';

  const lowerValue = value.toLowerCase();
  if (
    lowerValue.includes('high') ||
    lowerValue.includes('up') ||
    lowerValue.includes('strong') ||
    lowerValue.includes('bullish')
  ) {
    toneClass = 'bg-success-500/10 text-success-500 border-success-500/20';
  } else if (
    lowerValue.includes('low') ||
    lowerValue.includes('down') ||
    lowerValue.includes('weak') ||
    lowerValue.includes('bearish')
  ) {
    toneClass = 'bg-error-500/10 text-error-500 border-error-500/20';
  } else if (lowerValue.includes('stable') || lowerValue.includes('neutral')) {
    toneClass = 'bg-warning-500/10 text-warning-500 border-warning-500/20';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.625rem] font-medium ${toneClass}`}
    >
      {label}:
      <span className="text-terminal-text">{value}</span>
    </span>
  );
}

/* ====================================================== Yield & Production ===== */

/**
 * Yield trend summary — used when production data exists but trends are limited.
 */
export function YieldSummary({
  yieldMtPerHa,
  year,
  commodityName,
}: {
  yieldMtPerHa: number;
  year: number | null;
  commodityName: string;
}) {
  return (
    <div className="terminal-panel p-3">
      <div className="flex items-center gap-2">
        <IconTrendingUp className="size-4 text-leaf-400" aria-hidden="true" />
        <div>
          <p className="text-[0.6875rem] font-semibold text-terminal-text">
            Yield: {yieldMtPerHa.toFixed(2)} MT/ha
          </p>
          <p className="text-[0.625rem] text-terminal-text-muted">
            {commodityName}
            {year ? ` · ${year} data` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Warning callout for data limitations.
 */
export function DataLimitationsCallout({ commodityName }: { commodityName: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning-500/20 bg-warning-500/5 p-3">
      <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-500" aria-hidden="true" />
      <p className="text-[0.6875rem] leading-relaxed text-terminal-text-secondary">
        <span className="font-medium text-terminal-text">Data limitations: </span>
        Intelligence data for {commodityName} may lag behind real-time market conditions. Production
        figures represent official statistics and may not capture informal or unreported production.
      </p>
    </div>
  );
}
