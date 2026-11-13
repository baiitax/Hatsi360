import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { getDataSource } from '@/lib/data';
import { formatDate } from '@/lib/money';
import { getPageImage } from '@/lib/images/registry';
import { HatsiImage } from '@/components/media/HatsiImage';

export const metadata: Metadata = {
  title: 'About Hatsi360',
  description:
    'How Hatsi360 collects, verifies and publishes agricultural commodity prices across Nigeria — our methodology, our data coverage and what we do not know.',
  alternates: { canonical: '/about' },
};

const STEPS = [
  {
    title: 'Collection',
    body: 'A market agent working an assigned market records the price they were given, in the unit they were given it, with the price type (farmgate, wholesale asking, wholesale transaction, retail) and the time of collection. Agents also note market conditions — a road closure, a festival, a supply glut — because that context is what makes a price interpretable.',
  },
  {
    title: 'Submission',
    body: 'The observation is submitted for verification. Nothing is published at this stage. Duplicate submissions for the same commodity, market, price type and timestamp are blocked at the database level so an agent cannot accidentally double-file the same price.',
  },
  {
    title: 'Automated checks',
    body: 'Before a human sees it, the record is checked for missing fields, non-positive values, unit-conversion problems, inconsistent bag weights, impossible timestamps, staleness, and conflicts with other reports for the same commodity and market. Unusual prices are flagged for review — never discarded, because an unusual price is often the signal worth seeing.',
  },
  {
    title: 'Verification',
    body: 'A verification officer reviews the observation against the market’s recent history, the agent’s market notes and any supporting evidence. The officer approves, rejects with a reason, or asks the agent to correct and resubmit. Every one of those actions is recorded with the person, the time and the reason.',
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

export default async function AboutPage() {
  const source = await getDataSource();
  const provenance = await source.getProvenance();
  const [markets, commodities] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="About"
        title="Prices you can trace back to a person and a moment"
        lede="Hatsi360 is an independent agricultural market intelligence platform powered by Pluck Agro. We collect prices in Nigerian markets, verify them, and publish them with the information you need to judge them: the commodity, the market, the unit, the price type, and when it was collected and verified."
        breadcrumbs={[{ label: 'About' }]}
        image={getPageImage('about.hero')}
      />

      <div className="section">
        <div className="container-page grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight">How a price reaches this site</h2>
            <p className="mt-3 leading-relaxed text-ink-600">
              Agricultural prices are only useful if you can judge how much to trust them. A number
              without a unit, a timestamp and a source is a rumour. Here is the full path a price
              takes before it appears on this site.
            </p>

            <ol className="mt-8 space-y-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-ink-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/*
              The three acts that make a price trustworthy, each shown with a
              photograph of the work rather than an illustration of the idea.
            */}
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { key: 'about.collect', title: 'Collected in the market' },
                { key: 'about.verify', title: 'Checked by a person' },
                { key: 'about.publish', title: 'Published with its record' },
              ].map((item) => (
                <figure key={item.key} className="overflow-hidden rounded-xl border border-ink-200">
                  <HatsiImage
                    asset={getPageImage(item.key)}
                    sizes="(min-width: 640px) 18rem, 92vw"
                    ratio="landscape"
                  />
                  <figcaption className="bg-white px-4 py-3 text-xs font-semibold text-ink-700">
                    {item.title}
                  </figcaption>
                </figure>
              ))}
            </div>

            <h2 className="mt-14 text-2xl font-bold tracking-tight">What we publish, and what we do not</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <h3 className="text-base font-bold text-brand-800">We publish</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-600">
                  <li>· Observations that passed verification, with their verification time</li>
                  <li>· The commodity, market, unit and price type behind each figure</li>
                  <li>· The number of observations and the window a summary covers</li>
                  <li>· Legacy records, clearly labelled as unverified</li>
                </ul>
              </div>
              <div className="card p-5">
                <h3 className="text-base font-bold text-ink-800">We do not publish</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-600">
                  <li>· Estimated, interpolated or placeholder prices</li>
                  <li>· A price converted between units unless the conversion is verified</li>
                  <li>· A single report presented as the definitive market price</li>
                  <li>· Price forecasts presented as facts</li>
                </ul>
              </div>
            </div>

            <h2 className="mt-14 text-2xl font-bold tracking-tight">Current coverage</h2>
            <p className="mt-3 leading-relaxed text-ink-600">
              The catalogue holds {markets.length} markets across Nigeria and {commodities.length}{' '}
              agricultural commodities. Those are catalogue entries — a commodity or market appears in
              price results only once it actually has published observations.
            </p>

            {source.isMigrated && provenance ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="text-base font-bold text-amber-950">
                  The honest state of the data today
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-amber-900">
                  The price records currently published were migrated from the previous Pluck Live
                  system — this platform&rsquo;s earlier name — on{' '}
                  {formatDate(provenance.collectedAt)}. They were reconstructed from the
                  daily summaries that system published, and every reconstruction was checked
                  against the latest prices that system displayed — all{' '}
                  {provenance.validation.publishedLatestValuesChecked} checks matched.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-amber-900">
                  What those records do not contain: the measurement unit, the price type, the time
                  of day the price was collected, the grade, and any verification trail. Rather than
                  inventing those fields, we publish the figures as they were and label them{' '}
                  <em>Legacy record — unverified</em>.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-amber-900">
                  New observations collected through the agent network carry all of those fields and
                  a verification record. They are marked{' '}
                  <em>Verified</em> and show their collection and verification times.
                </p>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
                Coverage at a glance
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Markets listed</dt>
                  <dd className="font-bold text-ink-900">{markets.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Commodities tracked</dt>
                  <dd className="font-bold text-ink-900">{commodities.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Markets reporting prices</dt>
                  <dd className="font-bold text-ink-900">
                    {markets.filter((m) => (m.observationCount ?? 0) > 0).length}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Commodities with prices</dt>
                  <dd className="font-bold text-ink-900">
                    {commodities.filter((c) => (c.observationCount ?? 0) > 0).length}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
                Read next
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/disclaimer" className="font-medium text-brand-700 hover:text-brand-800">
                    Price data disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="font-medium text-brand-700 hover:text-brand-800">
                    Frequently asked questions
                  </Link>
                </li>
                <li>
                  <Link href="/api-docs" className="font-medium text-brand-700 hover:text-brand-800">
                    Developer API documentation
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="font-medium text-brand-700 hover:text-brand-800">
                    Contact the team
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
