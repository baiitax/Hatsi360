import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldHistory } from '@/lib/operations/field';
import { formatDate, formatDateTime } from '@/lib/money';
import { FieldCard, FieldEmpty, FieldStat, FieldStatusPill } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'History — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The agent's collection history.
 *
 * A row is one market visit: when it happened, how many prices it produced,
 * and what became of them. Nothing here can be edited — a collection that
 * happened is a record of what happened.
 */
export default async function AgentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; market?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAgent('/agent/history');

  const sessions = await getFieldHistory(profile.id);

  const from = params.from ?? '';
  const to = params.to ?? '';
  const filtered = sessions.filter((session) => {
    const date = session.startedAt.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    if (params.market && String(session.marketId) !== params.market) return false;
    return true;
  });

  const totals = {
    sessions: filtered.length,
    observations: filtered.reduce((sum, session) => sum + session.observationsCount, 0),
    approved: filtered.reduce((sum, session) => sum + session.approvedCount, 0),
    corrections: filtered.reduce((sum, session) => sum + session.correctionCount, 0),
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Collection history</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Every market visit you have recorded, and what became of the prices in it.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <FieldStat value={totals.sessions} label="Visits" />
        <FieldStat value={totals.observations} label="Prices" />
        <FieldStat value={totals.approved} label="Approved" tone={totals.approved > 0 ? 'good' : 'default'} />
        <FieldStat
          value={totals.corrections}
          label="Corrections"
          tone={totals.corrections > 0 ? 'warning' : 'default'}
        />
      </div>

      <form method="get" action="/agent/history" className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="col-span-2 min-h-[44px] rounded-xl bg-ink-900 px-4 py-2 text-sm font-bold text-white"
        >
          Apply filters
        </button>
      </form>

      {filtered.length === 0 ? (
        <FieldEmpty
          title="No visits recorded"
          body="When you record a price, the market visit it belongs to is listed here with its reference."
          action={
            <Link
              href="/agent/collection/new"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white"
            >
              Collect a price
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((session) => (
            <li key={session.id}>
              <FieldCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">{session.marketName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-500">{session.reference}</p>
                  </div>
                  <FieldStatusPill
                    status={session.completedAt ? 'completed' : 'in_progress'}
                    label={session.completedAt ? 'Completed' : 'Open'}
                  />
                </div>

                <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-ink-50 px-1 py-1.5">
                    <dt className="text-[10px] text-ink-500">Prices</dt>
                    <dd className="text-sm font-bold tabular-nums text-ink-900">
                      {session.observationsCount}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-ink-50 px-1 py-1.5">
                    <dt className="text-[10px] text-ink-500">Submitted</dt>
                    <dd className="text-sm font-bold tabular-nums text-ink-900">
                      {session.submittedCount}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-ink-50 px-1 py-1.5">
                    <dt className="text-[10px] text-ink-500">Approved</dt>
                    <dd className="text-sm font-bold tabular-nums text-brand-700">
                      {session.approvedCount}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-ink-50 px-1 py-1.5">
                    <dt className="text-[10px] text-ink-500">To correct</dt>
                    <dd className="text-sm font-bold tabular-nums text-ink-700">
                      {session.correctionCount}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2 text-[11px] text-ink-400">
                  Started {formatDateTime(session.startedAt)}
                  {session.completedAt ? ` · finished ${formatDateTime(session.completedAt)}` : ''}
                  {' · '}
                  {formatDate(session.startedAt)}
                </p>

                {session.notes ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{session.notes}</p>
                ) : null}

                <Link
                  href="/agent/observations"
                  className="mt-2 inline-block text-xs font-bold text-brand-700 underline underline-offset-2"
                >
                  See the prices in this visit
                </Link>
              </FieldCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
