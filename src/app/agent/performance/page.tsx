import type { Metadata } from 'next';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldPerformance } from '@/lib/operations/field';
import { formatDate } from '@/lib/money';
import { FieldCard, FieldEmpty, FieldNote, FieldSection, FieldStat } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Performance — Field collection',
  robots: { index: false, follow: false },
};

function defaultPeriod() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * The agent's performance, measured from the records.
 *
 * There is no composite score here, on purpose. A single number would create
 * an incentive to submit more, or submit faster, rather than more accurately
 * — and accurate prices are the whole point of the platform. What is shown
 * instead is the set of counts a reviewer can act on, with the period stated
 * so the figures can be interpreted.
 */
export default async function AgentPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAgent('/agent/performance');

  const fallback = defaultPeriod();
  const from = params.from ?? fallback.from;
  const to = params.to ?? fallback.to;

  const performance = await getFieldPerformance(profile.id, from, to);
  const hasRecords =
    performance.assignedTasks > 0 || performance.observationsSubmitted > 0;

  const maxDaily = Math.max(1, ...performance.daily.map((day) => day.submitted));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Your performance</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {formatDate(from)} to {formatDate(to)}. Every figure is counted from your records.
        </p>
      </header>

      <form method="get" action="/agent/performance" className="grid grid-cols-2 gap-2">
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
          Show this period
        </button>
      </form>

      {!hasRecords ? (
        <FieldEmpty
          title="No records in this period"
          body="There is nothing to report for these dates. Choose a wider period, or record a price to start building a history."
        />
      ) : (
        <>
          <FieldNote tone="info">
            These counts describe the work you did. They are not a score, and there is no target to
            hit — the platform needs accurate prices, not fast ones.
          </FieldNote>

          <FieldSection title="Assignments">
            <div className="grid grid-cols-2 gap-2">
              <FieldStat value={performance.assignedTasks} label="Assigned tasks" />
              <FieldStat value={performance.completedTasks} label="Closed" tone="good" />
              <FieldStat value={performance.onTimeTasks} label="Closed on time" />
              <FieldStat
                value={performance.lateTasks}
                label="Closed late"
                tone={performance.lateTasks > 0 ? 'warning' : 'default'}
              />
            </div>
          </FieldSection>

          <FieldSection title="Prices you submitted">
            <div className="grid grid-cols-2 gap-2">
              <FieldStat value={performance.observationsSubmitted} label="Submitted" />
              <FieldStat
                value={performance.observationsApproved}
                label="Approved"
                tone={performance.observationsApproved > 0 ? 'good' : 'default'}
              />
              <FieldStat value={performance.observationsPending} label="Still in review" />
              <FieldStat
                value={performance.observationsRejected}
                label="Rejected"
                tone={performance.observationsRejected > 0 ? 'warning' : 'default'}
              />
            </div>
          </FieldSection>

          <FieldSection title="Outcomes">
            <div className="grid grid-cols-2 gap-2">
              <FieldStat
                value={performance.correctionsRequired}
                label="Needed a correction"
                tone={performance.correctionsRequired > 0 ? 'warning' : 'default'}
              />
              <FieldStat
                value={performance.approvalRate === null ? '—' : `${performance.approvalRate}%`}
                label="Approval rate"
              />
              <FieldStat value={performance.marketsCovered} label="Markets covered" />
              <FieldStat value={performance.commoditiesCovered} label="Commodities covered" />
            </div>
          </FieldSection>

          {performance.daily.length > 0 ? (
            <FieldSection title="Daily activity">
              <FieldCard>
                <div className="flex h-32 items-end gap-1" aria-hidden="true">
                  {performance.daily.map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 rounded-t bg-brand-600"
                      style={{ height: `${Math.max(4, (day.submitted / maxDaily) * 100)}%` }}
                      title={`${day.date}: ${day.submitted} submitted, ${day.approved} approved`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink-500">
                  {performance.daily.length} day(s) with a collection. The bar shows prices
                  submitted; the approved count is in the title of each bar.
                </p>
              </FieldCard>
            </FieldSection>
          ) : null}

          <FieldNote tone="info" title="How these figures are counted">
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                <strong>Assigned tasks</strong> — collection tasks with your name on them and a due
                date inside this period.
              </li>
              <li>
                <strong>Closed</strong> — a task that is completed, cancelled or skipped. A task
                that was submitted for review but is still under review is <em>not</em> closed.
              </li>
              <li>
                <strong>Closed on time</strong> — the task was submitted or completed before its
                recorded deadline.
              </li>
              <li>
                <strong>Approval rate</strong> — approved prices divided by submitted prices, as a
                percentage. It is not shown when nothing has been submitted.
              </li>
            </ul>
          </FieldNote>
        </>
      )}
    </div>
  );
}
