/**
 * Admin Intelligence — Evidence Sources Management
 *
 * View and manage external data sources that feed the commodity
 * intelligence system. Each source carries provenance metadata
 * that is attached to every data point it produces.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getAllSources, getRecentSyncEvents } from '@/lib/intelligence/service';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Evidence Sources — Intelligence',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SourcesManagementPage() {
  await requireStaff('/admin/intelligence/sources');

  const [sources, recentSyncs] = await Promise.all([
    getAllSources(),
    getRecentSyncEvents(undefined, 50),
  ]);

  return (
    <>
      <PageHeader
        title="Evidence Sources"
        description="Authoritative data sources for commodity intelligence. Every data point in the system is traceable to one of these sources."
        breadcrumbs={[
          { label: 'Intelligence', href: '/admin/intelligence' },
          { label: 'Sources' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => {
          const sourceSyncs = recentSyncs.filter((s) => s.source_id === source.id);
          const lastSync = sourceSyncs[0];

          return (
            <Panel
              key={source.id}
              title={source.name}
              actions={
                <Pill tone={source.is_active ? 'success' : 'neutral'}>
                  {source.is_active ? 'Active' : 'Inactive'}
                </Pill>
              }
            >
              <p className="text-sm text-neutral-500">{source.organization}</p>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-neutral-500">Code</dt>
                  <dd className="font-mono text-neutral-900">{source.code}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Type</dt>
                  <dd className="text-neutral-900">{source.source_type.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Reliability</dt>
                  <dd>
                    <Pill tone={source.reliability >= 0.9 ? 'success' : source.reliability >= 0.7 ? 'warning' : 'danger'}>
                      {Math.round(source.reliability * 100)}%
                    </Pill>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Frequency</dt>
                  <dd className="text-neutral-900">{source.update_frequency ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">License</dt>
                  <dd className="text-neutral-900">{source.license_type ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Access</dt>
                  <dd className="text-neutral-900">{source.access_method.replace('_', ' ')}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-neutral-500">Countries</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {source.country_codes.map((code) => (
                      <span key={code} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-mono text-neutral-700">
                        {code}
                      </span>
                    ))}
                    {source.country_codes.length === 0 && (
                      <span className="text-xs text-neutral-400">All countries</span>
                    )}
                  </dd>
                </div>
              </dl>

              {source.notes && (
                <p className="mt-3 text-xs text-neutral-500 border-t border-neutral-100 pt-3">
                  {source.notes}
                </p>
              )}

              {/* Last sync status */}
              {lastSync && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Pill tone={
                      lastSync.status === 'completed' ? 'success' :
                      lastSync.status === 'failed' ? 'danger' :
                      lastSync.status === 'partial' ? 'warning' :
                      'info'
                    }>
                      {lastSync.status}
                    </Pill>
                    <span className="text-neutral-500">
                      {new Date(lastSync.started_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-neutral-500">
                    {lastSync.records_inserted} inserted
                    {lastSync.records_skipped > 0 && `, ${lastSync.records_skipped} skipped`}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-neutral-400">
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Visit source →
                    </a>
                  )}
                </div>
                <form action={triggerSourceSync.bind(null, source.code)}>
                  <button
                    type="submit"
                    disabled={!source.is_active}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Sync Now
                  </button>
                </form>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Sync history */}
      {recentSyncs.length > 0 && (
        <div className="mt-6">
          <Panel title="Sync History">
            <div className="space-y-1">
              {recentSyncs.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b border-neutral-100 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Pill tone={
                      (event.status === 'completed' ? 'success' :
                      event.status === 'failed' ? 'danger' :
                      event.status === 'partial' ? 'warning' :
                      'info') as PillTone
                    }>
                      {event.status}
                    </Pill>
                    <span className="text-neutral-700">Source #{event.source_id}</span>
                    <span className="text-neutral-400">•</span>
                    <span className="text-neutral-500">{event.sync_type}</span>
                  </div>
                  <div className="text-right text-xs text-neutral-500">
                    <span>{new Date(event.started_at).toLocaleString()}</span>
                    <span className="ml-2">
                      {event.records_inserted} inserted, {event.records_skipped} skipped
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

async function triggerSourceSync(sourceCode: string) {
  'use server';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  try {
    await fetch(`${baseUrl}/api/v1/intelligence/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_code: sourceCode, sync_type: 'manual' }),
    });
  } catch {
    // Sync triggered asynchronously
  }
}
