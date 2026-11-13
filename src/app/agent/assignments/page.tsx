import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldAssignments, taskStatusLabel } from '@/lib/operations/field';
import { formatDate, formatDateTime } from '@/lib/money';
import {
  FieldEmpty,
  FieldSection,
  FieldStat,
  FieldStatusPill,
} from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Assignments — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The agent's collection responsibilities.
 *
 * The assignments are grouped by what they mean for the agent's day: what is
 * due now, what is coming, what is done, and what has been missed. A task
 * that was submitted is shown as submitted — the observations inside it may
 * still be awaiting review, and the two are different things.
 */
export default async function AgentAssignmentsPage() {
  const profile = await requireAgent('/agent/assignments');
  const assignments = await getFieldAssignments(profile.id);

  const today = new Date().toISOString().slice(0, 10);
  const closed = ['completed', 'cancelled', 'skipped'];

  const todays = assignments.filter((task) => task.dueOn === today);
  const upcoming = assignments
    .filter((task) => task.dueOn > today && !closed.includes(task.status))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const completed = assignments
    .filter((task) => task.dueOn <= today && closed.includes(task.status))
    .sort((a, b) => b.dueOn.localeCompare(a.dueOn))
    .slice(0, 40);
  const overdue = assignments.filter((task) => task.isOverdue && !closed.includes(task.status));

  const renderTask = (task: (typeof assignments)[number]) => (
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
          <span>Due {formatDate(task.dueOn)}</span>
          {task.deadlineAt ? <span>Deadline {formatDateTime(task.deadlineAt)}</span> : null}
          {task.priority && task.priority !== 'normal' ? (
            <span className="font-semibold capitalize text-ink-700">{task.priority} priority</span>
          ) : null}
        </div>

        {task.expectedCount > 0 ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{
                  width: `${Math.min(100, Math.round((task.submittedCount / task.expectedCount) * 100))}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-ink-600">
              {task.submittedCount}/{task.expectedCount}
            </span>
          </div>
        ) : null}
      </Link>
    </li>
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Assignments</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Your collection responsibilities, grouped by when they are due.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <FieldStat value={todays.length} label="Due today" tone={todays.length > 0 ? 'warning' : 'default'} />
        <FieldStat value={upcoming.length} label="Upcoming" />
        <FieldStat
          value={overdue.length}
          label="Overdue"
          tone={overdue.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {overdue.length > 0 ? (
        <FieldSection title="Overdue">
          <ul className="space-y-2">{overdue.map(renderTask)}</ul>
        </FieldSection>
      ) : null}

      <FieldSection title="Due today">
        {todays.length === 0 ? (
          <FieldEmpty
            title="Nothing due today"
            body="There is no assignment due today. You can still collect at any market in your coverage."
            action={
              <Link
                href="/agent/collection/new"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white"
              >
                Start a collection
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">{todays.map(renderTask)}</ul>
        )}
      </FieldSection>

      {upcoming.length > 0 ? (
        <FieldSection title="Upcoming">
          <ul className="space-y-2">{upcoming.map(renderTask)}</ul>
        </FieldSection>
      ) : null}

      {completed.length > 0 ? (
        <FieldSection title="Completed and closed">
          <ul className="space-y-2">{completed.map(renderTask)}</ul>
        </FieldSection>
      ) : null}

      {assignments.length === 0 ? (
        <FieldEmpty
          title="No assignment yet"
          body="Your supervisor has not created a collection task for you. Your markets are listed on the home screen."
        />
      ) : null}

    </div>
  );
}
