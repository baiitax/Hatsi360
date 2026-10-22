import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Pluck Live is free for price discovery. Premium plans add API access, exports, alerts and custom research for businesses.',
  alternates: { canonical: '/pricing' },
};

const PLANS = [
  {
    name: 'Free',
    price: '₦0',
    cadence: 'forever',
    summary: 'Everything a farmer, trader or consumer needs to check a price.',
    features: [
      'All published price observations, with timestamps and provenance',
      'Search and filter by commodity, category, state, market and price type',
      'Market comparison with unit and price-type compatibility enforced',
      'Historical charts with observation counts per day',
      'Price directory, commodity catalogue and market directory',
      'Market insights and methodology documentation',
    ],
    cta: { label: 'Start browsing', href: '/prices' },
    highlight: false,
  },
  {
    name: 'Professional',
    price: 'Contact us',
    cadence: 'per business',
    summary: 'For traders, processors and exporters who need to act on the data.',
    features: [
      'Everything in Free',
      'Extended historical data and market spreads',
      'CSV and spreadsheet exports',
      'Price alerts on commodities and markets you follow',
      'Watchlists and business dashboards',
      'Scheduled reports by email',
    ],
    cta: { label: 'Talk to sales', href: '/contact' },
    highlight: true,
  },
  {
    name: 'API & Enterprise',
    price: 'Contact us',
    cadence: 'per application',
    summary: 'For platforms, researchers and supply-chain teams building on the data.',
    features: [
      'Everything in Professional',
      'REST API access with your own key and rate limit',
      'Custom market reports and research',
      'Higher rate limits and priority support',
      'Trade-opportunity and supplier intelligence',
      'Bespoke collection coverage in additional markets',
    ],
    cta: { label: 'Request API access', href: '/contact' },
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Free price discovery. Paid intelligence."
        lede="Reading a price should never cost anything. What costs money is the work of turning prices into decisions — exports, alerts, reports and API access."
        breadcrumbs={[{ label: 'Pricing' }]}
      />

      <div className="section">
        <div className="container-page">
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`card flex flex-col p-6 ${
                  plan.highlight ? 'border-brand-500 ring-2 ring-brand-500/30' : ''
                }`}
              >
                {plan.highlight ? (
                  <p className="mb-3 inline-flex w-fit rounded-full bg-brand-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Most popular
                  </p>
                ) : null}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{plan.summary}</p>

                <p className="mt-5">
                  <span className="text-3xl font-black tracking-tight text-ink-950">{plan.price}</span>
                  <span className="ml-2 text-sm text-ink-500">{plan.cadence}</span>
                </p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-ink-700">
                      <span aria-hidden="true" className="mt-0.5 text-brand-600">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className={`mt-7 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-brand-700 text-white hover:bg-brand-800'
                      : 'border border-ink-300 text-ink-700 hover:border-brand-400 hover:text-brand-800'
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">What stays free, always</h2>
              <p className="mt-3 leading-relaxed text-ink-600">
                The public price experience is not a trial. Every published observation, every
                market and commodity page, the comparison tool and the historical charts remain
                free — and they keep the same provenance detail that paid customers get.
              </p>
              <p className="mt-3 leading-relaxed text-ink-600">
                We do not put provenance behind a paywall. If a price is published, you can always
                see what it is, where it came from, when it was collected and how it was verified.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight">What premium adds</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-600">
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  <span>
                    <strong className="text-ink-900">Exports.</strong> CSV and spreadsheet downloads
                    of the underlying observations, not just the summary.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  <span>
                    <strong className="text-ink-900">Alerts.</strong> Be told when a commodity or
                    market you follow crosses a threshold you set.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  <span>
                    <strong className="text-ink-900">API access.</strong> Your own key, your own rate
                    limit, usage logged and visible to you.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 text-brand-600">
                    ✓
                  </span>
                  <span>
                    <strong className="text-ink-900">Research.</strong> Custom reports and bespoke
                    collection coverage where our own network does not reach.
                  </span>
                </li>
              </ul>

              <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
                <p className="text-sm text-ink-600">
                  Need something specific?{' '}
                  <Link href="/contact" className="font-semibold text-brand-700 underline">
                    Tell us what you are trying to solve
                  </Link>{' '}
                  and we will work out the smallest plan that helps.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
