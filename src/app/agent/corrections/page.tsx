import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldCorrections, getFieldUnits, getFieldGrades } from '@/lib/operations/field';
import { formatDateTime } from '@/lib/money';
import { CorrectionForm } from '@/components/agent/CorrectionForm';
import { FieldCard, FieldEmpty, FieldNote, FieldSection, FieldStatusPill } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Corrections — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The correction centre.
 *
 * When a reviewer asks for a change, the request appears here with what was
 * submitted, why it was rejected and what the agent should do about it. The
 * agent answers from this screen; the reviewed record is preserved either way.
 */
export default async function AgentCorrectionsPage() {
  const profile = await requireAgent('/agent/corrections');
  const corrections = await getFieldCorrections(profile.id);
  const units = await getFieldUnits();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">Corrections</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Prices a reviewer asked you to change, and what to do about each one.
        </p>
      </header>

      {corrections.length === 0 ? (
        <FieldEmpty
          title="Nothing to correct"
          body="When a reviewer asks for a change to one of your prices it appears here with their reason. Your other prices are unaffected."
          action={
            <Link
              href="/agent/observations"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-800"
            >
              See all my prices
            </Link>
          }
        />
      ) : (
        <>
          <FieldNote tone="info">
            A correction does not delete what you submitted. Your original values stay on the record,
            and the corrected values are added on top with your explanation.
          </FieldNote>

          <FieldSection title={`${corrections.length} request(s)`}>
            <ul className="space-y-3">
              {corrections.map((correction) => (
                <li key={correction.observation.id}>
                  <FieldCard className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-900">
                          {correction.observation.commodityName}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {correction.observation.marketName}
                        </p>
                      </div>
                      <FieldStatusPill status="correction_requested" label="Correction required" />
                    </div>

                    <dl className="rounded-lg bg-ink-50 p-2.5 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-500">Submitted price</dt>
                        <dd className="font-semibold tabular-nums text-ink-900">
                          {correction.observation.reportedAmount === null
                            ? 'No amount'
                            : `${correction.observation.currencyCode} ${correction.observation.reportedAmount.toLocaleString('en-NG')}`}
                        </dd>
                      </div>
                      <div className="mt-1 flex justify-between gap-3">
                        <dt className="text-ink-500">Submitted</dt>
                        <dd className="font-semibold text-ink-900">
                          {correction.observation.submittedAt
                            ? formatDateTime(correction.observation.submittedAt)
                            : 'not submitted'}
                        </dd>
                      </div>
                      {correction.requestedAt ? (
                        <div className="mt-1 flex justify-between gap-3">
                          <dt className="text-ink-500">Requested</dt>
                          <dd className="font-semibold text-ink-900">
                            {formatDateTime(correction.requestedAt)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    {correction.reason ? (
                      <div className="rounded-lg border border-warning-200 bg-warning-50 p-2.5">
                        <p className="text-xs font-bold text-warning-700">
                          What the reviewer said
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-warning-700">
                          {correction.reason}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-500">
                        The reviewer did not record a reason. Open the record for the full history.
                      </p>
                    )}

                    <CorrectionForm
                      observationId={correction.observation.id}
                      commodityName={correction.observation.commodityName}
                      marketName={correction.observation.marketName}
                      currentAmount={correction.observation.reportedAmount}
                      currentUnitName={correction.observation.unitName}
                      currentPriceType={correction.observation.priceType}
                      units={units.map((unit) => ({
                        id: unit.id,
                        code: unit.code,
                        name: unit.name,
                      }))}
                      grades={[]}
                    />

                    <Link
                      href={`/agent/observations/${correction.observation.id}`}
                      className="inline-block text-xs font-bold text-brand-700 underline underline-offset-2"
                    >
                      Open the full record
                    </Link>
                  </FieldCard>
                </li>
              ))}
            </ul>
          </FieldSection>
        </>
      )}
    </div>
  );
}
