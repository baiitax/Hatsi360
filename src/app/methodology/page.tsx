import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { getDataSource } from '@/lib/data';
import { formatDate } from '@/lib/money';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Price Methodology',
  description:
    'How GonaPulse collects, checks, verifies and publishes an agricultural commodity price — the full chain from the market to the published figure.',
  alternates: { canonical: '/methodology' },
};

const STAGES = [
  {
    title: 'Assignment',
    body: 'An agent is assigned to specific markets by the control centre. The assignment records which markets a person may collect in, and the field app only offers those markets. An agent cannot file a price for a market they are not assigned to.',
  },
  {
    title: 'Collection',
    body: 'The agent records the amount exactly as it was quoted, the unit as it was quoted, the price type, the grade or variety if the market distinguished one, and the time of collection. The agent also records market conditions — a road closure, a festival, a supply glut — because that context is what makes a price interpretable later.',
  },
  {
    title: 'Submission',
    body: 'The observation is submitted for verification. Nothing is published at this stage. Duplicate submissions for the same commodity, market, price type and timestamp are blocked at the database level, so an agent cannot accidentally double-file the same price.',
  },
  {
    title: 'Automated checks',
    body: 'Before a human sees it, the record is checked for missing fields, non-positive values, unit-conversion problems, inconsistent bag weights, impossible timestamps, staleness, and conflicts with other reports for the same commodity and market. Unusual prices are flagged for review — never discarded, because an unusual price is often the signal worth seeing.',
  },
  {
    title: 'Verification',
    body: 'A verification officer reviews the observation against the market’s recent history, the agent’s market notes and any supporting evidence. The officer approves, rejects with a reason, or asks the agent to correct and resubmit. Every one of those actions is recorded with the person, the time and the reason. Approval and publication are separate acts.',
  },
  {
    title: 'Publication',
    body: 'Only a verified observation is published, and it is never silently overwritten. If a published price turns out to be wrong, a correction is published as a new record that supersedes the old one; the original stays in the audit trail with the reason for the change.',
  },
  {
    title: 'Summary',
    body: 'Where several observations exist for the same commodity, market, price type and unit, the published figure is the median of those observations. The summary always shows the observation count, the range and the time window it covers, so a single report is never presented as a settled market price.',
  },
];

const PRICE_TYPES = Object.values(PRICE_TYPE_META);

export default async function MethodologyPage() {
  const source = await getDataSource();
  const provenance = await source.getProvenance();

  return (
    <>
      <PageHero
        eyebrow="Methodology"
        title="How a price becomes a published price"
        lede={`Everything on ${BRAND.name} is an observation with a market, a unit, a price type and a time attached. This is the complete chain, and what happens to a figure when it goes wrong.`}
        breadcrumbs={[{ label: 'Methodology' }]}
      />

      <div className="section bg-ink-50">
        <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <section className="card p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                The chain, end to end
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600">
                A number without a unit, a timestamp and a source is a rumour. Everything published
                on this platform has been through the steps below, and each step leaves a record.
              </p>

              <ol className="mt-8 space-y-7">
                {STAGES.map((stage, index) => (
                  <li key={stage.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink-900">
                        {stage.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-ink-600">{stage.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="card mt-8 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                Price types are different measurements
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600">
                {BRAND.name} distinguishes these because they measure different things. They are
                never merged, and the comparison tool refuses to place an asking price next to a
                transaction price.
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {PRICE_TYPES.map((type) => (
                  <div key={type.code} className="rounded-xl border border-ink-200 p-4">
                    <dt className="font-display text-sm font-bold text-brand-800">{type.label}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-600">
                      {type.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="card mt-8 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                Units and conversion
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600">
                A price quoted per bag and a price quoted per kilogram are different quantities, and
                bags do not all weigh the same. Two rules follow from that, and both are enforced in
                the database rather than in the interface.
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-600">
                <li>
                  <strong className="text-ink-900">The reported value is never altered.</strong> The
                  amount and unit exactly as the agent recorded them are kept in the record and shown
                  as reported.
                </li>
                <li>
                  <strong className="text-ink-900">Normalisation happens only where a valid rule
                  exists.</strong> A conversion factor is applied only when a conversion row exists
                  for that commodity and that unit pair. Where no valid conversion rule exists, the
                  normalised value stays null and the figure is marked as having no recorded unit.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-ink-600">
                A record with no unit is still published — the figure is real, it is simply not
                comparable with anything else until the unit is known. It is shown as reported and
                labelled, never quietly dropped and never assumed.
              </p>
            </section>

            <section className="card mt-8 p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                When a published price turns out to be wrong
              </h2>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-600">
                <li>
                  <strong className="text-ink-900">1. It is never overwritten.</strong> A
                  correction is appended as a new record that references the one it supersedes.
                </li>
                <li>
                  <strong className="text-ink-900">2. The reason is required.</strong> A correction
                  carries a reason and the person who made it.
                </li>
                <li>
                  <strong className="text-ink-900">3. The original stays in the audit trail.</strong>{' '}
                  The revision history shows every version, who changed it and why.
                </li>
                <li>
                  <strong className="text-ink-900">4. Public readers see the correction.</strong> The
                  published figure shows the superseded value and its replacement together, so
                  nobody is left acting on a figure we know to be wrong.
                </li>
              </ol>
            </section>
          </div>

          <aside className="space-y-5">
            {source.isMigrated && provenance ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-amber-950">
                  The legacy record
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-amber-900">
                  The price records currently published were migrated from the previous Pluck Live
                  system on {formatDate(provenance.collectedAt)}. They were reconstructed from the
                  daily summaries that system published, and every reconstruction was checked
                  against the latest prices it displayed — all{' '}
                  {provenance.validation.publishedLatestValuesChecked} checks matched.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-amber-900">
                  What they do not contain: the measurement unit, the price type, the time of day the
                  price was collected, the grade, and any verification trail. Rather than inventing
                  those fields, we publish the figures as they were and label them{' '}
                  <em>Legacy record — unverified</em>.
                </p>
              </div>
            ) : null}

            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-700">Read next</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/coverage" className="font-medium text-brand-700 hover:text-brand-800">
                    Collection coverage
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="font-medium text-brand-700 hover:text-brand-800">
                    Price data disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="font-medium text-brand-700 hover:text-brand-800">
                    Market intelligence reports
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="font-medium text-brand-700 hover:text-brand-800">
                    Frequently asked questions
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
