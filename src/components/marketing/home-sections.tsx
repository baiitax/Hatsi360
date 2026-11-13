import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * The homepage sections the brand brief asks for that the existing page does
 * not have: the trade-intelligence capabilities, the platform workflow, the
 * data-trust vocabulary, and the audience section.
 *
 * Every statement in this file is either a description of something the code
 * already does, or is marked as not yet operational. Nothing here claims a
 * capability that does not exist — the brief's §10 is explicit that planned
 * features must be labelled as such, and §24 forbids claiming untested
 * functionality.
 */

/* ------------------------------------------------- trade intelligence ---- */

/**
 * The four capabilities of the terminal.
 *
 * `status` is the honest state of each one. Two are operational today (they
 * read the same published observations the rest of the site reads, and render
 * their empty state when there is nothing published). Two depend on data the
 * database does not yet hold, and say so rather than showing an empty panel
 * that looks broken.
 */
const CAPABILITIES: {
  title: string;
  body: string;
  status: 'available' | 'in-development';
  statusLabel: string;
  href: string;
  linkLabel: string;
}[] = [
  {
    title: 'Price intelligence',
    body:
      'Published observations across supported markets, grades and price types, with the freshness of each one stated rather than implied.',
    status: 'available',
    statusLabel: 'Available now',
    href: '/trade/terminal',
    linkLabel: 'Open the terminal',
  },
  {
    title: 'Market comparison',
    body:
      'Compare prices across trading locations. Observations are only compared when the commodity, the price type and the unit are compatible.',
    status: 'available',
    statusLabel: 'Available now',
    href: '/compare',
    linkLabel: 'Compare markets',
  },
  {
    title: 'Best-buy and best-sell intelligence',
    body:
      'The lowest and highest verified observation for a comparable series. Landed cost and trading margin need configured transport and handling data, which the platform does not yet hold.',
    status: 'in-development',
    statusLabel: 'Awaiting cost data',
    href: '/trade/best-buy',
    linkLabel: 'See what is available',
  },
  {
    title: 'Fundamental analysis',
    body:
      'Seasonal supply, harvest patterns, logistics, quality requirements and market developments, each separated from sourced fact and from forecast.',
    status: 'in-development',
    statusLabel: 'Awaiting first entries',
    href: '/trade/fundamentals',
    linkLabel: 'See the framework',
  },
];

export function TradeIntelligence() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {CAPABILITIES.map((capability) => (
        <article key={capability.title} className="card flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-bold text-ink-900">
              {capability.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${
                capability.status === 'available'
                  ? 'bg-leaf-100 text-leaf-700'
                  : 'bg-ink-100 text-ink-600'
              }`}
            >
              {capability.statusLabel}
            </span>
          </div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">
            {capability.body}
          </p>
          <Link
            href={capability.href}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
          >
            {capability.linkLabel}
            <span aria-hidden="true">→</span>
          </Link>
        </article>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- how it works -- */

const STAGES = [
  {
    step: '01',
    title: 'Market data collection',
    body:
      'Assigned field agents record a price in the market, with the commodity, the grade, the unit, the price type and the time of collection. An observation can also arrive as a manual staff entry.',
  },
  {
    step: '02',
    title: 'Verification and quality control',
    body:
      'A separate review act, by a different person, before anything is published. A submitted observation is not a verified one, and the platform never presents it as one.',
  },
  {
    step: '03',
    title: 'Market intelligence',
    body:
      'Published observations are organised into commodity, market and price intelligence — never merged across incompatible grades, units, price types or currencies.',
  },
  {
    step: '04',
    title: 'Commercial decision support',
    body:
      'Compare markets, follow movement over time, and evaluate the verified buying and selling positions the platform actually holds.',
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((stage) => (
        <li key={stage.step} className="card flex flex-col p-5">
          <span
            aria-hidden="true"
            className="font-display text-2xl font-bold tabular-nums text-brand-200"
          >
            {stage.step}
          </span>
          <h3 className="mt-2 font-display text-base font-bold text-ink-900">
            {stage.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{stage.body}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------- data trust ---- */

/**
 * The source-label vocabulary a visitor will actually see on a price.
 *
 * The first four are classes the database and the publication guard produce.
 * The last two are labels the platform uses for data it does not treat as a
 * confirmed market price — and the legacy import is registered in
 * `price_source_registry` as explicitly ineligible for public price
 * intelligence, which is why it is named here rather than omitted.
 *
 * No label appears here that the system cannot produce.
 */
const SOURCE_LABELS: {
  label: string;
  meaning: string;
  tone: 'verified' | 'published' | 'indicative' | 'excluded';
}[] = [
  {
    label: 'Verified market observation',
    meaning:
      'Collected in the field and checked by a reviewer before publication. This is the only class that carries a field verification.',
    tone: 'verified',
  },
  {
    label: 'Published market price',
    meaning:
      'An observation that has passed verification and is readable by the public. Publication is a separate act from approval.',
    tone: 'published',
  },
  {
    label: 'Verified buyer offer',
    meaning:
      'A named party’s commitment to buy, verified by staff and published only with that party’s disclosure consent.',
    tone: 'published',
  },
  {
    label: 'Verified seller offer',
    meaning:
      'A named party’s commitment to sell, on the same terms: verified, consented to, and inside its validity window.',
    tone: 'published',
  },
  {
    label: 'Indicative market information',
    meaning:
      'A price type marked indicative. It describes an expectation, not a transaction, and is never compared with a transaction price.',
    tone: 'indicative',
  },
  {
    label: 'Legacy system import',
    meaning:
      'Records migrated from the previous platform. Retained for provenance and registered as not eligible for public price intelligence, because they carry no unit, price type or verification trail.',
    tone: 'excluded',
  },
];

const TONE_CLASS: Record<(typeof SOURCE_LABELS)[number]['tone'], string> = {
  verified: 'border-leaf-200 bg-leaf-100',
  published: 'border-brand-200 bg-brand-50',
  indicative: 'border-harvest-200 bg-harvest-100',
  excluded: 'border-ink-200 bg-ink-50',
};

const TONE_TEXT: Record<(typeof SOURCE_LABELS)[number]['tone'], string> = {
  verified: 'text-leaf-700',
  published: 'text-brand-800',
  indicative: 'text-harvest-700',
  excluded: 'text-ink-700',
};

export function DataTrust() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SOURCE_LABELS.map((entry) => (
        <div key={entry.label} className={`rounded-2xl border p-4 ${TONE_CLASS[entry.tone]}`}>
          <h3 className={`text-sm font-bold ${TONE_TEXT[entry.tone]}`}>{entry.label}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{entry.meaning}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- audiences -- */

/**
 * The six audiences brief §14 names, each with a description of the decision
 * they are actually making. Written to be commercially specific rather than
 * motivational.
 */
const AUDIENCE_CARDS = [
  {
    title: 'Farmers and cooperatives',
    body:
      'See the recorded price in your own market and in the neighbouring one before deciding where to sell, and give members one shared view of the market they are selling into.',
  },
  {
    title: 'Commodity traders',
    body:
      'Compare what is being asked for across markets, follow how a price has moved, and evaluate a sourcing position against a comparable series rather than a rumour.',
  },
  {
    title: 'Aggregators',
    body:
      'Understand regional availability and procurement conditions before committing to a collection route, with the observation count behind each figure visible.',
  },
  {
    title: 'Processors',
    body:
      'Monitor the raw-material prices in the markets that supply your plants, by grade and price type, so an input-cost change is traceable to a record.',
  },
  {
    title: 'Exporters',
    body:
      'Access commodity intelligence, quality specifications and the export-price context behind an offer, with the currency and the collection date preserved.',
  },
  {
    title: 'Institutional buyers',
    body:
      'Evaluate procurement against a documented series: same commodity, same grade, same unit, same price type, with the provenance of every figure stated.',
  },
];

export function Audiences() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {AUDIENCE_CARDS.map((audience) => (
        <article key={audience.title} className="card p-5">
          <h3 className="font-display text-base font-bold text-ink-900">
            {audience.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{audience.body}</p>
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- coverage honesty -- */

/**
 * A short, prominent statement of what the platform does not yet cover.
 *
 * This exists because the homepage's data sections are necessarily sparse: with
 * no published observations, a visitor needs to be told that the platform is
 * early rather than broken. Brief §15: "Trust should come from transparent
 * data, not marketing exaggeration."
 */
export function CoverageHonesty({
  marketCount,
  commodityCount,
  observationCount,
}: {
  marketCount: number;
  commodityCount: number;
  observationCount: number;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 sm:p-6">
      <h3 className="font-display text-base font-bold text-ink-900">
        Where the platform stands today
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-brand-800">
            {commodityCount}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            commodities in the catalogue, each with its grades and measurement units
          </p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-brand-800">
            {marketCount}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            markets registered, with the collection workflow built and ready to run
          </p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-ink-500">
            {observationCount}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            published price observations. {BRAND.name} will not show a figure it cannot
            attribute, so the price sections stay empty until the first collection is
            verified and published.
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm text-ink-600">
        Read the{' '}
        <Link href="/coverage" className="font-semibold text-brand-700 hover:text-brand-800">
          coverage statement
        </Link>{' '}
        for what is covered, what is not, and why, or the{' '}
        <Link
          href="/methodology"
          className="font-semibold text-brand-700 hover:text-brand-800"
        >
          price methodology
        </Link>{' '}
        for how an observation becomes a published price.
      </p>
    </div>
  );
}
