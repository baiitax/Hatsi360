import Link from 'next/link';
import { BRAND } from '@/lib/brand';

/**
 * The GonaPulse hero.
 *
 * A market-intelligence proposition, not a generic SaaS promise: the
 * instrument (a price with provenance), the mechanism (field collection and
 * verification), and the outcome (confidence to move).
 */
export function HeroPanel() {
  return (
    <section className="relative overflow-hidden bg-brand-900">
      {/* A field-row motif drawn in SVG so the page needs no image request. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 520"
      >
        <defs>
          <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <pattern id="hero-rows" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M0 56 L56 0" stroke="url(#hero-fade)" strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="1200" height="520" fill="url(#hero-rows)" />
        <g stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" fill="none">
          <path d="M60 460 C 220 400, 300 470, 460 420 S 720 360, 860 430 S 1080 380, 1160 420" />
          <path d="M60 500 C 240 450, 320 510, 480 470 S 740 410, 880 470 S 1090 430, 1160 460" />
        </g>
        <g fill="#ffffff" fillOpacity="0.22">
          {Array.from({ length: 34 }, (_, index) => {
            const x = 40 + index * 34;
            const y = 470 - ((index * 37) % 60);
            return <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 4 : 2.5} />;
          })}
        </g>
      </svg>

      <div className="container-page relative py-16 sm:py-24 lg:py-28">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-800/60 px-3.5 py-1.5 text-xs font-semibold text-brand-100">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-leaf-400" />
            {BRAND.operatingMarket} &middot; {BRAND.sector}
          </p>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {BRAND.name}
            <span className="mt-2 block text-2xl font-medium text-brand-200 sm:text-3xl lg:text-4xl">
              {BRAND.descriptor}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
            {BRAND.tagline} GonaPulse collects agricultural commodity prices in the markets of{' '}
            {BRAND.operatingMarket}, verifies them, and publishes them with the market, the unit,
            the price type and the collection time attached — so you can act on a price, not guess
            at one.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/prices"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50"
            >
              Explore current prices
            </Link>
            <Link
              href="/coverage"
              className="rounded-full border border-brand-300/60 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
            >
              See our coverage
            </Link>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-5 border-t border-brand-700/70 pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Collection
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-brand-100">
                Assigned field agents record prices with the unit and the time of collection.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Verification
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-brand-100">
                A separate review act before any observation becomes a published market price.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                Publication
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-brand-100">
                Corrections append to the record. A published price is never quietly overwritten.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
