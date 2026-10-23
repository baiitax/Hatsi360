import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getAgentTasks, taskStatusLabel } from '@/lib/operations/agent';
import { TaskControls } from '@/components/agent/TaskControls';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'My tasks — Field collection',
  robots: { index: false, follow: false },
};

export default async function AgentTasksPage() {
  const profile = await requireAgent('/agent/tasks');
  const tasks = await getAgentTasks(profile.id);

  const open = tasks.filter((task) => !['completed', 'cancelled'].includes(task.status));
  const closed = tasks.filter((task) => ['completed', 'cancelled'].includes(task.status));

  const card = (task: (typeof tasks)[number]) => (
    <li key={task.id}>
      <div className="rounded-xl border border-ink-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-900">{task.marketName}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {task.commodityNames.length > 0 ? task.commodityNames.join(', ') : 'Market round'}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">Due {task.dueOn}</p>
            {task.deadlineAt ? (
              <p className="text-xs text-ink-400">Deadline {formatDateTime(task.deadlineAt)}</p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              task.status === 'completed'
                ? 'bg-emerald-50 text-emerald-800'
                : task.isOverdue
                  ? 'bg-red-50 text-red-800'
                  : task.status === 'cancelled'
                    ? 'bg-ink-100 text-ink-500'
                    : 'bg-ink-100 text-ink-700'
            }`}
          >
            {task.isOverdue && task.status !== 'completed' ? 'Overdue' : taskStatusLabel(task.status)}
          </span>
        </div>

        <div className="mt-3">
          <TaskControls
            taskId={task.id}
            status={task.status}
            canStart={task.status === 'open'}
            canComplete={task.status === 'in_progress'}
          />
        </div>
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">My tasks</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          The collections the office has scheduled for you.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-ink-900">Open ({open.length})</h2>
        {open.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-ink-700">Nothing open</p>
            <p className="mt-1 text-xs text-ink-500">
              New tasks appear as soon as the scheduler generates them.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">{open.map(card)}</ul>
        )}
      </section>

      {closed.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-ink-900">Finished ({closed.length})</h2>
          <ul className="space-y-2">{closed.map(card)}</ul>
        </section>
      ) : null}

      <Link
        href="/agent/collect"
        className="block rounded-xl bg-brand-700 px-5 py-3.5 text-center text-sm font-bold text-white"
      >
        Collect a price
      </Link>
    </div>
  );
}
