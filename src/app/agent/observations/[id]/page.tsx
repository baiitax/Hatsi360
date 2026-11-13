import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAgent } from '@/lib/auth/guards';
import {
  getFieldObservation,
  verificationLabel,
  priceTypeLabel,
} from '@/lib/operations/field';
import { formatDateTime } from '@/lib/money';
import {
  FieldCard,
  FieldDetailRow,
  FieldEmpty,
  FieldNote,
  FieldSection,
  FieldStatusPill,
} from '@/components/agent/FieldUi';
import { EvidencePanel } from '@/components/agent/EvidencePanel';

export const metadata: Metadata = {
  title: 'Price record — Field collection',
  robots: { index: false, follow: false },
};

/**
 * One price record, in full, with its history.
 *
 * The record shows what was collected, when it was collected, when it was
 * submitted, what the reviewer said and what has happened since. An approved
 * record cannot be edited here — the agent has no action to take on it, and
 * the interface says so rather than offering a control that would fail.
 */
export default async function AgentObservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAgent('/agent/observations');

  if (!id) notFound();

  // Scoped to the signed-in agent by the database: another agent's record
  // is simply not returned.
  const observation = await getFieldObservation(profile.id, id);
  if (!observation) notFound();

  const canCorrect = observation.verificationStatus === 'correction_requested';

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <Link href="/agent/observations" className="text-xs font-bold text-brand-700">
          ← My prices
        </Link>
      </nav>

      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-950">
              {observation.commodityName}
            </h1>
            <p className="mt-0.5 text-sm text-ink-500">{observation.marketName}</p>
          </div>
          <FieldStatusPill
            status={observation.verificationStatus}
            label={verificationLabel(observation.verificationStatus)}
          />
        </div>

        <p className="mt-3 text-2xl font-bold tabular-nums text-ink-950">
          {observation.reportedAmount === null
            ? 'No amount'
            : `${observation.currencyCode} ${observation.reportedAmount.toLocaleString('en-NG')}`}
          {observation.unitName ? (
            <span className="ml-1.5 text-sm font-normal text-ink-500">
              per {observation.unitName}
            </span>
          ) : null}
        </p>
      </header>

      {canCorrect ? (
        <FieldNote tone="warning" title="A reviewer asked you to correct this price">
          <p>{observation.reviewerNote ?? 'Open the correction centre for the full request.'}</p>
          <Link
            href="/agent/corrections"
            className="mt-2 inline-block font-bold underline underline-offset-2"
          >
            Answer the correction request
          </Link>
        </FieldNote>
      ) : null}

      {observation.verificationStatus === 'verified' ? (
        <FieldNote tone="good" title="Approved">
          This price was checked by a reviewer and approved. An approved record cannot be edited
          from the field app — if it is wrong, the correction is made in the office so the original
          record and its history are preserved.
        </FieldNote>
      ) : null}

      {observation.verificationStatus === 'rejected' ? (
        <FieldNote tone="warning" title="Rejected">
          {observation.reviewerNote ?? 'A reviewer rejected this price. The reason is recorded in the history below.'}
        </FieldNote>
      ) : null}

      {/* ------------------------------------------------------------- detail */}
      <FieldSection title="What was collected">
        <FieldCard>
          <dl>
            <FieldDetailRow label="Price type">{priceTypeLabel(observation.priceType)}</FieldDetailRow>
            {observation.gradeName ? (
              <FieldDetailRow label="Grade">{observation.gradeName}</FieldDetailRow>
            ) : null}
            {observation.varietyName ? (
              <FieldDetailRow label="Variety">{observation.varietyName}</FieldDetailRow>
            ) : null}
            <FieldDetailRow label="Unit">{observation.unitName ?? 'not recorded'}</FieldDetailRow>
            {observation.packageWeightKg ? (
              <FieldDetailRow label="Package weight">
                {observation.packageWeightKg} kg
              </FieldDetailRow>
            ) : null}
            {observation.packageCount ? (
              <FieldDetailRow label="Package count">{observation.packageCount}</FieldDetailRow>
            ) : null}
            <FieldDetailRow label="Collected at">
              {formatDateTime(observation.collectedAt)}
            </FieldDetailRow>
            <FieldDetailRow label="Submitted at">
              {observation.submittedAt ? formatDateTime(observation.submittedAt) : 'not submitted'}
            </FieldDetailRow>
            {observation.verifiedAt ? (
              <FieldDetailRow label="Reviewed at">
                {formatDateTime(observation.verifiedAt)}
              </FieldDetailRow>
            ) : null}
            {observation.publishedAt ? (
              <FieldDetailRow label="Published at">
                {formatDateTime(observation.publishedAt)}
              </FieldDetailRow>
            ) : null}
          </dl>
        </FieldCard>
      </FieldSection>

      {observation.notes ? (
        <FieldSection title="Agent notes">
          <FieldCard>
            <p className="text-sm leading-relaxed text-ink-700">{observation.notes}</p>
          </FieldCard>
        </FieldSection>
      ) : null}

      {/* ------------------------------------------------------------ findings */}
      {observation.findings.length > 0 ? (
        <FieldSection
          title="Quality checks"
          description="These checks flag a record for a reviewer. They never change the price you collected."
        >
          <ul className="space-y-2">
            {observation.findings.map((finding) => (
              <li key={finding.ruleCode}>
                <FieldCard>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold capitalize text-ink-900">
                      {finding.ruleCode.replace(/_/g, ' ')}
                    </p>
                    <FieldStatusPill
                      status={finding.severity}
                      label={finding.severity}
                      tone={
                        finding.severity === 'blocking'
                          ? 'bad'
                          : finding.severity === 'warning' || finding.severity === 'review'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{finding.message}</p>
                </FieldCard>
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {/* ------------------------------------------------------------ evidence */}
      <FieldSection
        title="Evidence"
        description="Photographs are held in a private store and opened through a link that expires. There is no public address for them."
      >
        <EvidencePanel
          observationId={observation.id}
          evidence={observation.evidence.map((evidence) => ({
            id: evidence.id,
            fileName: evidence.fileName,
            caption: evidence.caption,
            byteSize: evidence.byteSize,
            contentType: evidence.contentType,
          }))}
          canEdit={
            observation.verificationStatus === 'draft' ||
            observation.verificationStatus === 'correction_requested'
          }
        />
      </FieldSection>

      {/* ------------------------------------------------------------ revisions */}
      {observation.revisions.length > 0 ? (
        <FieldSection
          title="Corrections"
          description="The values below were reviewed and then changed. The original values are kept."
        >
          <ul className="space-y-2">
            {observation.revisions.map((revision) => (
              <li key={revision.id}>
                <FieldCard>
                  <p className="text-sm font-semibold text-ink-900">
                    Revision {revision.revisionNumber}
                  </p>
                  {revision.changeReason ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-600">
                      {revision.changeReason}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-ink-400">
                    {formatDateTime(revision.createdAt)}
                  </p>
                </FieldCard>
              </li>
            ))}
          </ul>
        </FieldSection>
      ) : null}

      {/* -------------------------------------------------------------- history */}
      <FieldSection title="History">
        {observation.events.length === 0 ? (
          <FieldEmpty title="No history yet" body="Events appear here as the record moves through review." />
        ) : (
          <ul className="space-y-2">
            {observation.events.map((event) => (
              <li key={event.id} className="rounded-xl border border-ink-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold capitalize text-ink-900">
                    {event.eventType.replace(/_/g, ' ')}
                  </p>
                  <span className="text-[11px] text-ink-400">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
                {event.reason ? (
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{event.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </FieldSection>
    </div>
  );
}
