import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { INTELLIGENCE_TIERS } from '@/lib/brand';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Intelligence Plans',
  description:
    'Public price discovery stays free. Professional and enterprise intelligence add extended history, exports, alerts, API access and custom coverage.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Plans"
        title="Free price discovery. Paid intelligence."
        lede="Reading a price should never cost anything. What costs money is the work of turning prices into decisions — exports, alerts, API access and custom coverage."
        breadcrumbs={[{ label: 'Plans' }]}
      />

      <div className="section">
        <div className="container-page">
          {/* The tiers are a proposal, and the page says so. */}
          <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-950">
              Commercial status
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              Public access is live today and always will be. The two paid tiers below are{' '}
              <strong>proposed</strong>: the entitlement model, the feature gating and the access
              controls are built, but no payment provider is configured and no subscription can be
              purchased on this site yet. Access to a paid tier is granted by agreement, and we
              will not take a payment until the commercial terms are settled.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {INTELLIGENCE_TIERS.map((tier) => (
              <article
                key={tier.id}
                className={`card flex flex-col p-6 ${
                  tier.id === 'professional' ? 'border-brand-500 ring-2 ring-brand-500/25' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-ink-950">{tier.name}</h2>
                  {tier.available ? (
                    <span className="rounded-full bg-leaf-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-leaf-700">
                      Available now
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-ink-500">
                      Proposed
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-ink-600">{tier.summary}</p>

                <p className="mt-5">
                  {tier.available ? (
                    <>
                      <span className="font-display text-3xl font-bold tracking-tight text-ink-950">
                        Free
                      </span>
                      <span className="ml-2 text-sm text-ink-500">no registration needed</span>
                    </>
                  ) : (
                    <>
                      <span className="font-display text-3xl font-bold tracking-tight text-ink-950">
                        On agreement
                      </span>
                      <span className="ml-2 text-sm text-ink-500">
                        pricing to be confirmed
                      </span>
                    </>
                  )}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-ink-700">
                      <span aria-hidden="true" className="mt-0.5 text-brand-600">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.available ? '/prices' : '/contact'}
                  className={`mt-7 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-colors ${
                    tier.id === 'professional'
                      ? 'bg-brand-700 text-white hover:bg-brand-800'
                      : 'border border-ink-300 text-ink-700 hover:border-brand-400 hover:text-brand-800'
                  }`}
                >
                  {tier.available ? 'Start browsing' : 'Talk to the team'}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                What stays free, always
              </h2>
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
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
                What paid intelligence adds
              </h2>
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
                    <strong className="text-ink-900">Custom coverage.</strong> Bespoke collection in
                    markets our own network does not yet reach.
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

          <div className="mt-12 rounded-2xl border border-ink-200 bg-ink-50 p-6">
            <h2 className="font-display text-base font-bold text-ink-900">
              How entitlements are enforced
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              A tier is not a front-end switch. Each paid capability maps to an entitlement key
              that is checked on the server and again by a database policy, so a request that
              bypasses the interface still fails. The keys behind the proposed tiers are{' '}
              <code className="rounded bg-ink-200 px-1.5 py-0.5 text-xs">reports</code> and{' '}
              <code className="rounded bg-ink-200 px-1.5 py-0.5 text-xs">api</code>; neither is
              granted to any account until a commercial agreement exists.
            </p>
            <p className="mt-2 text-sm text-ink-500">{BRAND.endorsement}.</p>
          </div>
        </div>
      </div>
    </>
  );
}
