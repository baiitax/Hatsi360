import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getApiUsageSummary, listApiApplications } from '@/lib/operations/commercial';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill, InlineEmpty } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'API management — Control Centre',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const TIER_TONE: Record<string, 'success' | 'info' | 'brand' | 'neutral'> = {
  free: 'neutral',
  standard: 'info',
  enterprise: 'brand',
};

function relativeTime(value: string | null): string {
  if (!value) return 'never';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * API management — registered consumers, their keys and their usage.
 *
 * The security rule that shapes this screen: `api_applications.key_hash`
 * stores a SHA-256 digest and the plaintext key is shown once, at creation,
 * and never again. So this page shows the `key_prefix` — enough to tell one
 * consumer's key from another's — and never a key. There is deliberately no
 * "reveal" button, because there is nothing to reveal.
 */
export default async function AdminApiManagementPage() {
  await requireStaff('/admin/api-management');

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="API management"
          description="Registered API consumers, their key prefixes, rate limits and usage."
          breadcrumbs={[
            { label: 'Control Centre', href: '/admin/overview' },
            { label: 'Commercial' },
            { label: 'API management' },
          ]}
        />
        <InlineEmpty
          title="No database is configured"
          description="API consumers are read from PostgreSQL. Without a configured database there are none to list."
        />
      </>
    );
  }

  const [page, usage] = await Promise.all([
    listApiApplications({ pageSize: 50 }),
    getApiUsageSummary(7),
  ]);

  const columns: Column<(typeof page.rows)[number]>[] = [
    {
      key: 'name',
      header: 'Application',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">{row.ownerName}</p>
        </div>
      ),
    },
    {
      key: 'key',
      header: 'Key prefix',
      cell: (row) => (
        <span className="font-mono text-xs text-ink-700" title="Only the prefix is stored; the full key is shown once at creation and never again">
          {row.keyPrefix}…
        </span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      cell: (row) => <Pill tone={TIER_TONE[row.tier] ?? 'neutral'}>{row.tier}</Pill>,
    },
    {
      key: 'scopes',
      header: 'Scopes',
      cell: (row) => (
        <span className="font-mono text-[11px] text-ink-600">
          {row.scopes.length === 0 ? 'none' : row.scopes.join(', ')}
        </span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate limit',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-700">{row.rateLimitPerMinute}/min</span>
      ),
    },
    {
      key: 'used',
      header: 'Last used',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-600">{relativeTime(row.lastUsedAt)}</span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      cell: (row) => (
        <Pill tone={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'active' : 'revoked'}</Pill>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="API management"
        description="Registered API consumers, their key prefixes, rate limits and recent usage."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Commercial' },
          { label: 'API management' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title={`Requests, last ${usage.windowDays} days`}>
          <p className="font-display text-3xl font-bold tabular-nums text-ink-900">{usage.total}</p>
          <p className="mt-1 text-xs text-ink-600">
            {usage.errors} returned a 4xx or 5xx status
          </p>
        </Panel>
        <Panel title="Consumers seen">
          <p className="font-display text-3xl font-bold tabular-nums text-ink-900">
            {usage.activeApplications}
          </p>
          <p className="mt-1 text-xs text-ink-600">of {page.total} registered</p>
        </Panel>
        <Panel title="Documented surface">
          <p className="text-sm leading-relaxed text-ink-700">
            Endpoints, parameters and the authentication model are published at{' '}
            <Link href="/api-docs" className="font-semibold text-brand-700 hover:underline">
              the API documentation
            </Link>
            .
          </p>
        </Panel>
      </div>

      {page.rows.length === 0 ? (
        <div className="mt-5">
          <InlineEmpty
            title="No API consumers are registered"
            description="No application has been issued a key. When one is created the prefix, tier, scopes and rate limit appear here; the secret itself is shown once at creation and is never stored."
          />
        </div>
      ) : (
        <div className="mt-5">
          <DataTable
            caption="Registered API applications"
            columns={columns}
            rows={page.rows}
            rowKey={(row) => row.id}
            empty="No API applications match this filter."
          />
        </div>
      )}

      {usage.byApplication.length > 0 ? (
        <div className="mt-8">
          <Panel title={`Busiest consumers, last ${usage.windowDays} days`}>
            <ul className="space-y-2">
              {usage.byApplication.slice(0, 10).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm text-ink-800">{entry.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-600">
                    {entry.requests.toLocaleString('en-NG')} requests
                    {entry.errors > 0 ? (
                      <span className="ml-2 text-error-700">{entry.errors} errors</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              Counted from <code className="font-mono">api_usage_logs</code> for the window shown.
              Requests are capped at 20,000 per window so a very busy consumer cannot make this
              screen slow; a larger figure means the true count is higher.
            </p>
          </Panel>
        </div>
      ) : null}

      <p className="mt-6 rounded-lg border border-ink-200 bg-white p-3 text-xs leading-relaxed text-ink-600">
        <strong className="font-semibold text-ink-800">Why no key is ever shown here.</strong> The
        schema stores a SHA-256 digest of each key, so there is nothing to display. The plaintext is
        returned once when the key is created and is not recoverable afterwards. A lost key is
        revoked and reissued, not retrieved.
      </p>
    </>
  );
}
