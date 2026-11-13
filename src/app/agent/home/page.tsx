import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import {
  getFieldHome,
  taskStatusLabel,
  verificationLabel,
  priceTypeShort,
} from '@/lib/operations/field';
import { formatDateTime, formatDate } from '@/lib/money';
import {
  FieldCard,
  FieldEmpty,
  FieldNote,
  FieldPrimaryAction,
  FieldSection,
  FieldStat,
  FieldStatusPill,
} from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Home — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The agent's operations overview.
 *
 * The screen answers four questions in order: what am I expected to do
 * today, what is outstanding, what needs my attention, and what have I
 * already done. Every figure comes from the records the agent is allowed to
 * see — the counters are counts of rows, not estimates.
 */
export default async function AgentHomePage() {
  const profile = await requireAgent('/agent/home');
  const home = await getFieldHome(profile.id);

  const firstName = profile.fullName?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- welcome */}
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Good day, {firstName}</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {formatDate(new Date().toISOString())} ·{' '}
          {home.markets.filter((market) => market.assignmentStatus === 'active').length} market(s)
          assigned to you
          {home.region ? ` · ${home.region}` : ''}
        </p>
      </header>

      {!home.configured ? (
        <FieldNote tone="warning" title="No database is configured">
          There is nothing to show until a Supabase project is connected. See{' '}
          <code className="font-mono">.env.example</code>.
        </FieldNote>
      ) : null}

      {/* ------------------------------------------------------ the summary */}
      <div className="grid grid-cols-3 gap-2">
        <FieldStat
          value={home.markets.filter((market) => market.assignmentStatus === 'active').length}
          label="Assigned markets"
          href="/agent/markets"
        />
        <FieldStat
          value={home.pendingTasks}
          label="Tasks today"
          tone={home.pendingTasks > 0 ? 'warning' : 'default'}
          href="/agent/assignments"
        />
        <FieldStat
          value={home.completedToday}
          label="Completed today"
          tone={home.completedToday > 0 ? 'good' : 'default'}
          href="/agent/assignments"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <FieldStat value={home.pendingSubmissions} label="Awaiting review" href="/agent/observations" />
        <FieldStat
          value={home.approvedCount}
          label="Approved"
          tone={home.approvedCount > 0 ? 'good' : 'default'}
          href="/agent/observations"
        />
        <FieldStat
          value={home.corrections.length}
          label="To correct"
          tone={home.corrections.length > 0 ? 'warning' : 'default'}
          href="/agent/corrections"
        />
      </div>

      {/* --------------------------------------------------- the main action */}
      {home.markets.some((market) => market.assignmentStatus === 'active') ? (
        <FieldPrimaryAction href="/agent/collection/new" className="w-full">
          Start collection
        </FieldPrimaryAction>
      ) : (
        <FieldEmpty
          title="No market is assigned to you"
          body="You can only collect at markets your supervisor has assigned to you. Once an assignment appears here, the Start collection button becomes available."
        />
      )}

      {/* ----------------------------------------------------- pending work */}
      {home.corrections.length > 0 ? (
        <FieldNote tone="warning" title="A reviewer asked you to correct something">
          <ul className="mt-1.5 space-y-1.5">
            {home.corrections.slice(0, 3).map((correction) => (
              <li key={correction.observation.id}>
                <Link
                  href={`/agent/observations/${correction.observation.id}`}
                  className="font-semibold underline underline-offset-2"
                >
                  {correction.observation.commodityName} · {correction.observation.marketName}
                </Link>
                {correction.reason ? <span className="block opacity-90">{correction.reason}</span> : null}
              </li>
            ))}
          </ul>
          <Link
            href="/agent/corrections"
            className="mt-2 inline-block font-bold underline underline-offset-2"
          >
            Open the correction centre
          </Link>
        </FieldNote>
      ) : null}

      {home.overdueTasks > 0 ? (
        <FieldNote tone="warning" title={`${home.overdueTasks} task(s) are past their deadline`}>
          <Link href="/agent/assignments" className="font-bold underline underline-offset-2">
            Open your assignments
          </Link>
        </FieldNote>
      ) : null}

      {home.drafts.length > 0 ? (
        <FieldNote tone="info" title={`${home.drafts.length} draft(s) waiting to be submitted`}>
          <ul className="mt-1.5 space-y-1">
            {home.drafts.slice(0, 3).map((draft) => (
              <li key={draft.id}>
                <Link
                  href={`/agent/observations/${draft.id}`}
                  className="font-semibold underline underline-offset-2"
                >
                  {draft.commodityName} · {draft.marketName}
                </Link>
                <span className="block opacity-90">
                  {draft.reportedAmount === null
                    ? 'No amount recorded'
                    : `${draft.currencyCode} ${draft.reportedAmount.toLocaleString('en-NG')}`}
                </span>
              </li>
            ))}
          </ul>
        </FieldNote>
      ) : null}

      {/* ------------------------------------------------ operational notices */}
      {home.notices.length > 0 ? (
        <FieldSection title="Notices from the office">
          <ul className="space-y-2">
            {home.notices.map((notice) => (
              <li key={notice.id}>
                <FieldCard>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{notice.title}</p>
                      {notice.body ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{notice.body}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-ink-400">
                        {formatDateTime(notice.createdAt)}
                      </p>
                    </div>
                    {notice.severity === 'high' || notice.severity === 'critical' ? (
                      <FieldStatusPill status="warning" label="Action" tone="bad" />
                    ) : null}
                  </div>
                  {notice.actionUrl ? (
                    <Link
                      href={notice.actionUrl}
                      className="mt-2 inline-block text-xs font-bold text-brand-700 underline underline-offset-2"
                    >
                      Open
                    </Link>
                  ) : null}
                </FieldCard>
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {/* ------------------------------------------------- today's assignments */}
      <FieldSection
        title="Today&rsquo;s assignments"
        action={
          <Link href="/agent/assignments" className="text-xs font-bold text-brand-700">
            All assignments
          </Link>
        }
      >
        {home.tasksToday.length === 0 ? (
          <FieldEmpty
            title="No assignment for today"
            body="When the scheduler creates a collection task for you it appears here. You can also start a collection at any market in your coverage."
          />
        ) : (
          <ul className="space-y-2">
            {home.tasksToday.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/agent/assignments/${task.id}`}
                  className="block rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:border-brand-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{task.marketName}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {task.commodityNames.length > 0
                          ? task.commodityNames.join(', ')
                          : 'Market round — all commodities in scope'}
                      </p>
                    </div>
                    <FieldStatusPill
                      status={task.status}
                      label={task.isOverdue ? 'Overdue' : taskStatusLabel(task.status)}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                    {task.deadlineAt ? <span>Deadline {formatDateTime(task.deadlineAt)}</span> : null}
                    {task.expectedCount > 0 ? (
                      <span>
                        {task.submittedCount}/{task.expectedCount} collected
                      </span>
                    ) : null}
                    {task.approvedCount > 0 ? (
                      <span className="font-semibold text-brand-700">{task.approvedCount} approved</span>
                    ) : null}
                  </div>

                  {task.expectedCount > 0 ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{
                          width: `${Math.min(100, Math.round((task.submittedCount / task.expectedCount) * 100))}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FieldSection>

      {/* -------------------------------------------------------- your markets */}
      <FieldSection
        title="Your markets"
        action={
          <Link href="/agent/markets" className="text-xs font-bold text-brand-700">
            All markets
          </Link>
        }
      >
        {home.markets.length === 0 ? (
          <FieldEmpty
            title="No market assigned"
            body="You can only collect at markets assigned to you. Contact your supervisor to be assigned to a market."
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {home.markets.map((market) => (
              <li key={market.id}>
                <Link
                  href={`/agent/markets/${market.id}`}
                  className="block rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:border-brand-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-ink-900">{market.name}</p>
                    {market.assignmentStatus && market.assignmentStatus !== 'active' ? (
                      <FieldStatusPill
                        status={market.assignmentStatus}
                        label={market.assignmentStatus === 'paused' ? 'Paused' : 'Ended'}
                        tone="neutral"
                      />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {market.stateName ?? 'Unknown state'} · {market.commodityCount} commodity(s)
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {market.collectedToday > 0
                      ? `${market.collectedToday} collected today`
                      : market.lastCollectionAt
                        ? `Last collection ${formatDateTime(market.lastCollectionAt)}`
                        : 'No collection recorded yet'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FieldSection>

      {/* ------------------------------------------------------ recent activity */}
      {home.recentActivity.length > 0 ? (
        <FieldSection
          title="Recent activity"
          action={
            <Link href="/agent/history" className="text-xs font-bold text-brand-700">
              Full history
            </Link>
          }
        >
          <ul className="space-y-2">
            {home.recentActivity.map((item) => (
              <li key={item.id}>
                <FieldCard>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-600">{item.detail}</p>
                    </div>
                    <FieldStatusPill
                      status={item.status}
                      label={
                        item.kind === 'observation'
                          ? verificationLabel(item.status)
                          : taskStatusLabel(item.status)
                      }
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-400">{formatDateTime(item.at)}</p>
                </FieldCard>
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}
    </div>
  );
}
