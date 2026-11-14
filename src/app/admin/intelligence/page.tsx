/**
 * Admin Intelligence Dashboard
 *
 * Overview of the commodity intelligence system: data sources, ingestion
 * status, data coverage, and system health. This is the operational
 * centre for evidence-backed agricultural analysis.
 *
 * Uses the existing Hatsi360 ops design system (Panel, PageHeader, Pill, KpiCard).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getIntelligenceStats, getRecentSyncEvents, getActiveSources } from '@/lib/intelligence/service';
import { KpiCard } from '@/components/ops/KpiCard';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Intelligence Dashboard — Control Centre',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function IntelligenceDashboardPage() {
  await requireStaff('/admin/intelligence');

  const [stats, syncEvents, sources] = await Promise.all([
    getIntelligenceStats(),
    getRecentSyncEvents(),
    getActiveSources(),
  ]);

  return (
    <>
      <PageHeader
        title="Intelligence"
        description="Commodity fundamentals data — production, supply, demand, and trade flows from authoritative sources. Every data point carries provenance metadata."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Active Sources"
          value={stats.sources.active.toLocaleString()}
          detail={`${stats.sources.total} configured`}
        />
        <KpiCard
          label="Production Records"
          value={stats.production.records.toLocaleString()}
          detail={`${stats.production.commodities} commodities × ${stats.production.countries} countries`}
        />
        <KpiCard
          label="Trade Flows"
          value={stats.trade.records.toLocaleString()}
          detail={`${stats.trade.country_pairs} country pairs`}
        />
        <KpiCard
          label="Syncs (24h)"
          value={stats.sync_events.last_24h.toLocaleString()}
          detail={stats.sync_events.failed > 0 ? `${stats.sync_events.failed} failed` : 'All healthy'}
          tone={stats.sync_events.failed > 0 ? 'warn' : 'good'}
        />
      </div>

      {/* Data Coverage & Sources */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Evidence Sources */}
        <Panel title="Evidence Sources">
          <div className="space-y-3">
            {sources.length === 0 && (
              <p className="text-sm text-neutral-500">No evidence sources configured yet.</p>
            )}
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${source.is_active ? 'bg-green-500' : 'bg-neutral-300'}`} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{source.name}</p>
                    <p className="text-xs text-neutral-500">{source.organization}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="neutral">{source.source_type.replace('_', ' ')}</Pill>
                  <Pill tone={source.reliability >= 0.9 ? 'success' : source.reliability >= 0.7 ? 'warning' : 'danger'}>
                    {Math.round(source.reliability * 100)}%
                  </Pill>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <Link href="/admin/intelligence/sources" className="text-sm text-blue-600 hover:text-blue-800">
              Manage sources →
            </Link>
          </div>
        </Panel>

        {/* Recent Sync Events */}
        <Panel title="Recent Sync Events">
          <div className="space-y-2">
            {syncEvents.length === 0 && (
              <p className="text-sm text-neutral-500">No sync events recorded yet. Run a sync to begin populating intelligence data.</p>
            )}
            {syncEvents.slice(0, 8).map((event) => {
              const eventAny = event as unknown as Record<string, unknown>;
              const sourceName = eventAny.evidence_sources
                ? (eventAny.evidence_sources as Record<string, string>).name
                : `Source #${event.source_id}`;

              const statusTone: PillTone =
                event.status === 'completed' ? 'success' :
                event.status === 'failed' ? 'danger' :
                event.status === 'partial' ? 'warning' :
                'info';

              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Pill tone={statusTone}>{event.status}</Pill>
                    <div>
                      <p className="text-sm text-neutral-900">{sourceName}</p>
                      <p className="text-xs text-neutral-500">
                        {event.sync_type} • {new Date(event.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500">
                    <span className="text-neutral-700">{event.records_inserted}</span> inserted
                    {event.records_skipped > 0 && (
                      <> · <span className="text-amber-600">{event.records_skipped}</span> skipped</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Data Coverage Summary */}
      <div className="mt-6">
        <Panel title="Data Coverage">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CoverageBlock
              label="Production"
              records={stats.production.records}
              commodities={stats.production.commodities}
              countries={stats.production.countries}
              yearRange={stats.production.year_range}
            />
            <CoverageBlock
              label="Supply"
              records={stats.supply.records}
              commodities={stats.supply.commodities}
              countries={stats.supply.countries}
            />
            <CoverageBlock
              label="Demand"
              records={stats.demand.records}
              commodities={stats.demand.commodities}
              countries={stats.demand.countries}
            />
            <CoverageBlock
              label="Trade"
              records={stats.trade.records}
              commodities={stats.trade.commodities}
              countries={stats.trade.country_pairs}
              countryLabel="pairs"
            />
          </div>
        </Panel>
      </div>

      {/* Sync Actions */}
      <div className="mt-6">
        <Panel title="Data Ingestion">
          <p className="mb-3 text-sm text-neutral-500">
            Trigger data sync from external sources. Syncs run asynchronously and results appear in the dashboard.
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.filter(s => s.is_active).map((source) => (
              <form key={source.id} action={triggerSyncAction.bind(null, source.code)}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Sync {source.name}
                </button>
              </form>
            ))}
            <form action={triggerBatchSyncAction}>
              <button
                type="submit"
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Sync All Sources
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </>
  );
}

// ── Server Actions ──────────────────────────────────────────────────────────

async function triggerSyncAction(sourceCode: string) {
  'use server';
  // In production, this calls the ingestion API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  try {
    await fetch(`${baseUrl}/api/v1/intelligence/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_code: sourceCode, sync_type: 'manual' }),
    });
  } catch {
    // Sync triggered asynchronously — page will refresh to show results
  }
}

async function triggerBatchSyncAction() {
  'use server';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  try {
    await fetch(`${baseUrl}/api/v1/intelligence/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true }),
    });
  } catch {
    // Batch sync triggered asynchronously
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function CoverageBlock({
  label,
  records,
  commodities,
  countries,
  yearRange,
  countryLabel,
}: {
  label: string;
  records: number;
  commodities: number;
  countries: number;
  yearRange?: [number, number] | null;
  countryLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">
        {records.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        {commodities} commodities
      </p>
      <p className="text-xs text-neutral-500">
        {countries} {countryLabel ?? 'countries'}
      </p>
      {yearRange && (
        <p className="mt-1 text-xs text-neutral-400">
          {yearRange[0]}–{yearRange[1]}
        </p>
      )}
    </div>
  );
}
