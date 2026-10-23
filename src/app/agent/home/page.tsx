import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getAgentHome, taskStatusLabel } from '@/lib/operations/agent';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Home — Field collection',
  robots: { index: false, follow: false },
};

export default async function AgentHomePage() {
  const profile = await requireAgent('/agent/home');
  const home = await getAgentHome(profile.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">
          Good day, {profile.fullName?.split(' ')[0] ?? 'agent'}
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {home.today} · {home.markets.length} market(s) assigned to you
        </p>
      </div>

      {!home.configured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No database is configured, so there is nothing to show. See <code>.env.example</code>.
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <div className="card px-3 py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-ink-950">{home.openTasks.length}</p>
          <p className="text-[11px] font-medium text-ink-500">Tasks today</p>
        </div>
        <div className="card px-3 py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-ink-950">{home.completedToday}</p>
          <p className="text-[11px] font-medium text-ink-500">Done</p>
        </div>
        <div className="card px-3 py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-ink-950">{home.corrections.length}</p>
          <p className="text-[11px] font-medium text-ink-500">To correct</p>
        </div>
      </div>

      <Link
        href="/agent/collect"
        className="flex items-center justify-center rounded-xl bg-brand-700 px-5 py-4 text-base font-bold text-white shadow-sm"
      >
        Collect a price
      </Link>

      {home.corrections.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h2 className="text-sm font-bold text-amber-900">A reviewer asked you to correct</h2>
          <ul className="mt-2 space-y-2">
            {home.corrections.map((submission) => (
              <li key={submission.id} className="rounded-lg bg-white p-2.5">
                <p className="text-sm font-semibold text-ink-900">
                  {submission.commodityName} · {submission.marketName}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  {submission.reviewerNote ?? 'Open the submission to see what to change.'}
                </p>
                <Link
                  href="/agent/submissions"
                  className="mt-1.5 inline-block text-xs font-semibold text-brand-700"
                >
                  Open my prices
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-900">Today&rsquo;s tasks</h2>
          <Link href="/agent/tasks" className="text-xs font-semibold text-brand-700">
            See all
          </Link>
        </div>

        {home.tasksToday.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-ink-700">No task for today</p>
            <p className="mt-1 text-xs text-ink-500">
              When the scheduler creates a task for you it appears here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {home.tasksToday.map((task) => (
              <li key={task.id}>
                <Link
                  href="/agent/tasks"
                  className="block rounded-xl border border-ink-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink-900">{task.marketName}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {task.commodityNames.length > 0
                          ? task.commodityNames.join(', ')
                          : 'Market round'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        task.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800'
                          : task.isOverdue
                            ? 'bg-red-50 text-red-800'
                            : 'bg-ink-100 text-ink-700'
                      }`}
                    >
                      {task.isOverdue ? 'Overdue' : taskStatusLabel(task.status)}
                    </span>
                  </div>
                  {task.deadlineAt ? (
                    <p className="mt-1.5 text-xs text-ink-500">
                      Deadline {formatDateTime(task.deadlineAt)}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink-900">Your markets</h2>
        {home.markets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-ink-700">No market assigned</p>
            <p className="mt-1 text-xs text-ink-500">
              You can only collect at markets assigned to you. Contact your supervisor.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {home.markets.map((market) => (
              <li key={market.id} className="rounded-xl border border-ink-200 bg-white p-3">
                <p className="text-sm font-bold text-ink-900">{market.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {market.stateName ?? 'Unknown state'} · {market.commodityCount} commodity(s)
                </p>
                {market.deadlineTime ? (
                  <p className="mt-1 text-xs text-ink-500">Deadline {market.deadlineTime}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {home.recentSubmissions.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900">Your latest prices</h2>
            <Link href="/agent/submissions" className="text-xs font-semibold text-brand-700">
              See all
            </Link>
          </div>
          <ul className="space-y-2">
            {home.recentSubmissions.slice(0, 5).map((submission) => (
              <li
                key={submission.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {submission.commodityName} · {submission.marketName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {submission.reportedAmount === null
                      ? 'No amount'
                      : `₦${submission.reportedAmount.toLocaleString('en-NG')}`}{' '}
                    · {formatDateTime(submission.collectedAt)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                  {submission.verificationStatus.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
