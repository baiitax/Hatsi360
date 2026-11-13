import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAgent } from '@/lib/auth/guards';
import {
  getFieldAssignment,
  taskStatusLabel,
  verificationLabel,
  priceTypeLabel,
} from '@/lib/operations/field';
import { formatDate, formatDateTime } from '@/lib/money';
import {
  FieldCard,
  FieldDetailRow,
  FieldEmpty,
  FieldNote,
  FieldSection,
  FieldStatusPill,
} from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Assignment — Field collection',
  robots: { index: false, follow: false },
};

/**
 * One assignment, in full.
 *
 * The screen tells the agent where to go, what to collect, how to record it,
 * what the supervisor expects, and what has already been done. It keeps the
 * assignment's status and the observations' verification status apart: a task
 * can be submitted while its observations are still awaiting review.
 */
export default async function AgentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAgent('/agent/assignments');

  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) notFound();

  // The query is scoped to the signed-in agent, so an id belonging to
  // somebody else returns nothing at all.
  const assignment = await getFieldAssignment(profile.id, taskId);
  if (!assignment) notFound();

  const canCollect =
    assignment.status === 'open' ||
    assignment.status === 'in_progress' ||
    assignment.status === 'correction_required';

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <Link href="/agent/assignments" className="text-xs font-bold text-brand-700">
          ← All assignments
        </Link>
      </nav>

      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-950">
              {assignment.marketName}
            </h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {assignment.stateName ?? 'Unknown state'}
              {assignment.marketAddress ? ` · ${assignment.marketAddress}` : ''}
            </p>
          </div>
          <FieldStatusPill
            status={assignment.status}
            label={assignment.isOverdue ? 'Overdue' : taskStatusLabel(assignment.status)}
          />
        </div>
      </header>

      {/* ------------------------------------------------------- the actions */}
      <div className="flex flex-wrap gap-2">
        {canCollect ? (
          <Link
            href={`/agent/collection/new?market=${assignment.marketId}&task=${assignment.id}`}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white"
          >
            {assignment.status === 'open' ? 'Start collection' : 'Continue collection'}
          </Link>
        ) : null}
        {assignment.observations.length > 0 ? (
          <Link
            href="/agent/observations"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-800"
          >
            View submitted prices
          </Link>
        ) : null}
      </div>

      {assignment.status === 'submitted' || assignment.status === 'awaiting_review' ? (
        <FieldNote tone="info" title="Submitted — still under review">
          You have sent this collection to the office. The observations below are awaiting a
          reviewer&rsquo;s decision. That is a different thing from being approved, and the screen
          will not tell you it is approved until it is.
        </FieldNote>
      ) : null}

      {assignment.status === 'correction_required' ? (
        <FieldNote tone="warning" title="A correction was requested">
          Open the observation below to see what the reviewer asked you to change, then send the
          corrected price back.
        </FieldNote>
      ) : null}

      {/* --------------------------------------------------------- the detail */}
      <FieldSection title="Assignment">
        <FieldCard>
          <dl>
            <FieldDetailRow label="Due date">{formatDate(assignment.dueOn)}</FieldDetailRow>
            {assignment.deadlineAt ? (
              <FieldDetailRow label="Deadline">
                {formatDateTime(assignment.deadlineAt)}
              </FieldDetailRow>
            ) : null}
            <FieldDetailRow label="Priority">
              <span className="capitalize">{assignment.priority ?? 'normal'}</span>
            </FieldDetailRow>
            <FieldDetailRow label="Frequency">
              <span className="capitalize">{assignment.frequency ?? 'not scheduled'}</span>
            </FieldDetailRow>
            {assignment.windowStart && assignment.windowEnd ? (
              <FieldDetailRow label="Collection window">
                {assignment.windowStart} – {assignment.windowEnd}
              </FieldDetailRow>
            ) : null}
            <FieldDetailRow label="Expected prices">
              {assignment.expectedCount > 0 ? assignment.expectedCount : 'market round'}
            </FieldDetailRow>
            <FieldDetailRow label="Submitted">{assignment.submittedCount}</FieldDetailRow>
            <FieldDetailRow label="Approved">{assignment.approvedCount}</FieldDetailRow>
            <FieldDetailRow label="Evidence">
              {assignment.evidenceRequired ? 'Required for this schedule' : 'Optional'}
            </FieldDetailRow>
          </dl>
        </FieldCard>
      </FieldSection>

      {assignment.notes ? (
        <FieldSection title="Instructions from the office">
          <FieldNote tone="info">{assignment.notes}</FieldNote>
        </FieldSection>
      ) : null}

      {assignment.collectionInstructions ? (
        <FieldSection title="Market instructions">
          <FieldNote tone="info">{assignment.collectionInstructions}</FieldNote>
        </FieldSection>
      ) : null}

      {assignment.commodityNames.length > 0 ? (
        <FieldSection title="Commodities to collect">
          <ul className="flex flex-wrap gap-1.5">
            {assignment.commodityNames.map((name) => (
              <li
                key={name}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-800"
              >
                {name}
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {assignment.requiredPriceTypes.length > 0 ? (
        <FieldSection title="Price types required">
          <ul className="flex flex-wrap gap-1.5">
            {assignment.requiredPriceTypes.map((type) => (
              <li
                key={type}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-800"
              >
                {priceTypeLabel(type)}
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {assignment.gradeNames.length > 0 ? (
        <FieldSection title="Grades available">
          <ul className="flex flex-wrap gap-1.5">
            {assignment.gradeNames.map((name) => (
              <li
                key={name}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-800"
              >
                {name}
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {/* ----------------------------------------------------- the observations */}
      <FieldSection title="Prices collected at this market">
        {assignment.observations.length === 0 ? (
          <FieldEmpty
            title="Nothing collected here yet"
            body="Prices you record at this market appear here as soon as they are saved."
          />
        ) : (
          <ul className="space-y-2">
            {assignment.observations.map((observation) => (
              <li key={observation.id}>
                <Link
                  href={`/agent/observations/${observation.id}`}
                  className="block rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:border-brand-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{observation.commodityName}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {priceTypeLabel(observation.priceType)}
                        {observation.gradeName ? ` · ${observation.gradeName}` : ''}
                        {observation.unitName ? ` · per ${observation.unitName}` : ''}
                      </p>
                    </div>
                    <FieldStatusPill
                      status={observation.verificationStatus}
                      label={verificationLabel(observation.verificationStatus)}
                    />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink-900">
                    {observation.reportedAmount === null
                      ? 'No amount'
                      : `${observation.currencyCode} ${observation.reportedAmount.toLocaleString('en-NG')}`}
                    <span className="ml-1 text-xs font-normal text-ink-500">
                      {formatDateTime(observation.collectedAt)}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FieldSection>

      {/* ------------------------------------------------------------ timeline */}
      {assignment.events.length > 0 ? (
        <FieldSection title="Timeline">
          <ul className="space-y-2">
            {assignment.events.map((event) => (
              <li key={event.id} className="rounded-xl border border-ink-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold capitalize text-ink-900">
                    {event.eventType.replace(/_/g, ' ')}
                  </p>
                  {event.toStatus ? (
                    <FieldStatusPill status={event.toStatus} label={taskStatusLabel(event.toStatus)} />
                  ) : null}
                </div>
                {event.reason ? (
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{event.reason}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-ink-400">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}
    </div>
  );
}
