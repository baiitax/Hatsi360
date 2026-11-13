import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { getOverview } from '@/lib/analytics/queries';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Live operations — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * Live operations.
 *
 * The queue of work that needs a human decision right now: submissions
 * waiting for verification, corrections an agent owes us, and tasks that were
 * due today and have not been collected. Every item links to the screen where
 * the decision is made.
 */
export default async function LiveOperationsPage() {
  await requireStaff('/admin/operations');
  const { snapshot, feed } = await getOverview(1);

  const critical = feed.filter((event) => event.severity === 'critical');
  const warning = feed.filter((event) => event.severity === 'warning');
  const info = feed.filter((event) => event.severity === 'info');

  return (
    <>
      <PageHeader
        title="Live operations"
        description={
          <>
            The operational queue, read from the database at the moment this page rendered. Each
            item links to the screen where the decision is taken.
          </>
        }
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Live operations' },
        ]}
        actions={
          <Link
            href="/admin/verification"
            className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            Open the verification queue
          </Link>
        }
      />

      {!snapshot.configured ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>No database is configured.</strong> The operational queue is empty because there
          is nothing to read, not because there is nothing to do.
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Needs action now</p>
          <p className="figure mt-1 text-2xl text-error-700">{critical.length}</p>
          <p className="mt-0.5 text-xs text-ink-500">Corrections and escalations</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Waiting for review</p>
          <p className="figure mt-1 text-2xl text-harvest-700">{warning.length}</p>
          <p className="mt-0.5 text-xs text-ink-500">Submissions and overdue collections</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">For information</p>
          <p className="figure mt-1 text-2xl text-ink-900">{info.length}</p>
          <p className="mt-0.5 text-xs text-ink-500">Completions and system events</p>
        </Panel>
      </div>

      <Panel
        title="Operations feed"
        description="Newest first. A submission is not published until a reviewer approves it."
      >
        {feed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center text-sm text-ink-500">
            Nothing is waiting for a decision. The queue is clear.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {feed.slice(0, 40).map((event) => (
              <li key={event.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="w-40 shrink-0 text-xs text-ink-500">
                  {formatDateTime(event.at)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        event.severity === 'critical'
                          ? 'danger'
                          : event.severity === 'warning'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {event.kind}
                    </Pill>
                    <span className="text-sm font-medium text-ink-900">{event.title}</span>
                  </p>
                  {event.detail ? (
                    <p className="mt-0.5 text-xs text-ink-600">{event.detail}</p>
                  ) : null}
                </div>
                {event.actionUrl ? (
                  <Link
                    href={event.actionUrl}
                    className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
