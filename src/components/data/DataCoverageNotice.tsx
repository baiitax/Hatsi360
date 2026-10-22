import Link from 'next/link';
import { formatDate } from '@/lib/money';
import { getDataSource } from '@/lib/data';
import { relativeTime } from '@/lib/pricing';

/**
 * A banner that states, honestly, where the numbers on the page came from and
 * how fresh they are.
 *
 * It appears whenever the page is showing migrated records or when the newest
 * observation is outside its freshness window. The alternative — presenting
 * fifteen-month-old figures as "live" — is exactly the behaviour this rebuild
 * is meant to remove.
 */
export async function DataCoverageNotice({
  latestCollectedAt,
  observationCount,
}: {
  latestCollectedAt?: string | null;
  observationCount?: number;
}) {
  const source = await getDataSource();
  const provenance = await source.getProvenance();

  const stale =
    latestCollectedAt != null &&
    Date.now() - new Date(latestCollectedAt).getTime() > 72 * 3600_000;

  if (!source.isMigrated && !stale) return null;

  const latest = latestCollectedAt
    ? formatDate(latestCollectedAt)
    : provenance
      ? formatDate(provenance.dateRange[1])
      : null;

  return (
    <aside
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6"
      aria-label="Data coverage notice"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-800"
        >
          ⚑
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-amber-950">
            {source.isMigrated ? 'Migrated price records — read this first' : 'Price coverage notice'}
          </h2>

          {source.isMigrated && provenance ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-amber-900">
                Every figure currently published on this site was migrated from the previous
                Pluck Live system on <strong>{formatDate(provenance.collectedAt)}</strong>. Those
                records carry no verification trail, no measurement unit and no collection time of
                day, so they are labelled{' '}
                <em>Legacy record — unverified</em> and must not be treated as a current market
                quote.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Records migrated
                  </dt>
                  <dd className="mt-0.5 text-lg font-bold text-amber-950">{provenance.observedCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Collection range
                  </dt>
                  <dd className="mt-0.5 font-medium text-amber-950">
                    {formatDate(provenance.dateRange[0])} – {formatDate(provenance.dateRange[1])}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Newest observation
                  </dt>
                  <dd className="mt-0.5 font-medium text-amber-950">
                    {latest ?? '—'}
                    {latestCollectedAt ? (
                      <span className="ml-1 font-normal text-amber-800">
                        ({relativeTime(latestCollectedAt)})
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-amber-900">
                The collection network is being re-established market by market. New observations
                are captured in the field by market agents, verified by a verification officer,
                and published with their unit, price type and timestamps attached.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-950"
                >
                  How we collect prices
                </Link>
                <Link
                  href="/disclaimer"
                  className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                >
                  Price data disclaimer
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              The most recent published observation is dated {latest} (
              {relativeTime(latestCollectedAt!)}). Prices older than the commodity&rsquo;s
              freshness window are still shown, but they are marked as stale.{' '}
              {observationCount ?? 0} observation{observationCount === 1 ? '' : 's'} are currently
              published.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
