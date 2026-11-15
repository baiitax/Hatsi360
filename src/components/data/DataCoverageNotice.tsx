import Link from 'next/link';
import { formatDate } from '@/lib/money';
import { getDataSource } from '@/lib/data';
import { relativeTime } from '@/lib/pricing';

/**
 * A banner that states, honestly, how fresh the prices on the page are.
 *
 * It appears when the newest observation is outside its freshness window.
 * The alternative — presenting old figures as current — is exactly the
 * behaviour this platform is designed to prevent.
 */
export async function DataCoverageNotice({
  latestCollectedAt,
  observationCount,
}: {
  latestCollectedAt?: string | null;
  observationCount?: number;
}) {
  const source = await getDataSource();

  const stale =
    latestCollectedAt != null &&
    Date.now() - new Date(latestCollectedAt).getTime() > 72 * 3600_000;

  if (!stale) return null;

  const latest = latestCollectedAt ? formatDate(latestCollectedAt) : null;

  return (
    <aside
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6"
      aria-label="Data freshness notice"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-800"
        >
          ⚑
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-amber-950">Price coverage notice</h2>

          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            The most recent published observation is dated {latest ?? '—'}
            {latestCollectedAt ? (
              <span className="ml-1">({relativeTime(latestCollectedAt)})</span>
            ) : null}.
            Prices older than the commodity&rsquo;s freshness window are still shown,
            but they are marked as stale.{' '}
            {observationCount ?? 0} observation{observationCount === 1 ? '' : 's'} are currently
            published.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-amber-900">
            The collection network is active market by market. New observations are captured
            in the field by market agents, verified by a verification officer, and published
            with their unit, price type and timestamps attached.
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
        </div>
      </div>
    </aside>
  );
}
