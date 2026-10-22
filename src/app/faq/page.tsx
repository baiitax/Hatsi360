import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers about how Pluck Live collects, verifies and publishes agricultural commodity prices in Nigeria.',
  alternates: { canonical: '/faq' },
};

const GROUPS = [
  {
    title: 'About the prices',
    faqs: [
      {
        q: 'How often are the prices updated?',
        a: 'Prices are published as agents collect them in the field and verification officers approve them. Every published price shows the time it was collected, so you can judge how current it is rather than relying on a label that says “live”.',
      },
      {
        q: 'Which markets do you cover?',
        a: 'We currently list markets across Lagos, Kano, Jigawa, Kaduna, Katsina, Zamfara, Nasarawa, Borno, Bauchi, Benue and Sokoto, and we are adding more. A market only appears in price results once it has published observations — the full directory is on the Markets page.',
      },
      {
        q: 'Why do some prices show “Legacy record — unverified”?',
        a: 'Those records were migrated from the previous version of the Pluck Live system. They carry no verification trail, no measurement unit and no collection time of day, so we publish them clearly labelled rather than presenting them as verified current quotes.',
      },
      {
        q: 'Why is there no price for some commodities?',
        a: 'Because no price has been collected and published for them yet. We list the full commodity catalogue so you can see what we track, but we never publish placeholder or estimated prices to fill a gap.',
      },
      {
        q: 'What does “unit not recorded” mean?',
        a: 'The source record did not state whether the price was per bag, per kilogram or per tonne. We show the figure exactly as it was reported and mark it, because converting it would mean guessing. Where the unit is known, it is shown next to the price.',
      },
      {
        q: 'What is the difference between an asking price and a transaction price?',
        a: 'An asking price is what a seller asks for; a transaction price is what a sale actually completed at. They are different numbers and we keep them apart — every price carries its price type, and we never compare one type against another.',
      },
    ],
  },
  {
    title: 'Using Pluck Live',
    faqs: [
      {
        q: 'Is the service free to use?',
        a: 'Yes. Browsing live and historical prices on our website is completely free. We offer premium services such as API access, scheduled exports, market reports and custom research for businesses at a fee.',
      },
      {
        q: 'Can I compare prices across markets?',
        a: 'Yes, on the Compare page. You pick one commodity and one price type, and we only place figures side by side when their units are compatible. Where the records use different units, we say so and hold the others back.',
      },
      {
        q: 'How current is the historical chart?',
        a: 'The chart plots the median of each day’s observations, with the observed minimum-to-maximum range shown as a band, and a count of observations per day underneath. A day with a single report is visibly thinner than a settled market.',
      },
      {
        q: 'Do you have a mobile app?',
        a: 'A dedicated mobile app is in development. The website is fully responsive, and market agents use a dedicated mobile-first collection interface built for low-bandwidth conditions.',
      },
      {
        q: 'Can I get the data as a spreadsheet?',
        a: 'CSV and spreadsheet exports are part of the premium workspace. The public price directory is always free to browse and filter.',
      },
    ],
  },
  {
    title: 'Data collection and partnership',
    faqs: [
      {
        q: 'How can I contribute price data?',
        a: 'We run a network of market agents who collect prices in the field. If you are a major trader or a market association interested in partnering with us, please contact us.',
      },
      {
        q: 'Do you publish price forecasts?',
        a: 'Not on this site. The previous Pluck Live system displayed a “Price Forecast” figure without explaining how it was produced. Any forecasting we offer in future will be labelled explicitly as a model-generated estimate, with its method and limitations stated, and evaluated against historical observations.',
      },
      {
        q: 'How do I report a price that looks wrong?',
        a: 'Use the contact page and tell us the commodity, the market and the date. Published prices are never silently overwritten: a correction is published as a new record that supersedes the old one, and the original stays in the audit trail.',
      },
      {
        q: 'Who verifies the prices?',
        a: 'A verification officer reviews each submitted observation against the market’s recent history, the agent’s market notes and any supporting evidence. Every approval, rejection and correction request is recorded with the person, the time and the reason.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQs"
        title="Your questions, answered"
        lede="How we collect prices, what the labels on a price mean, and what we deliberately do not publish."
        breadcrumbs={[{ label: 'FAQs' }]}
      />

      <div className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[16rem_1fr]">
          <nav aria-label="FAQ sections" className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">Sections</h2>
            <ul className="mt-3 space-y-2">
              {GROUPS.map((group) => (
                <li key={group.title}>
                  <a
                    href={`#${group.title.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                    className="text-sm font-medium text-ink-700 hover:text-brand-700"
                  >
                    {group.title}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-ink-200 bg-white p-4">
              <p className="text-sm text-ink-600">
                Still stuck?{' '}
                <Link href="/contact" className="font-semibold text-brand-700 hover:text-brand-800">
                  Contact our team
                </Link>
                .
              </p>
            </div>
          </nav>

          <div className="space-y-12">
            {GROUPS.map((group) => (
              <section
                key={group.title}
                id={group.title.toLowerCase().replace(/[^a-z]+/g, '-')}
                className="scroll-mt-28"
              >
                <h2 className="text-2xl font-bold tracking-tight">{group.title}</h2>
                <div className="mt-5 space-y-3">
                  {group.faqs.map((faq) => (
                    <details key={faq.q} className="card group overflow-hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left">
                        <span className="font-semibold text-ink-900">{faq.q}</span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-brand-600 transition-transform group-open:rotate-45"
                        >
                          ＋
                        </span>
                      </summary>
                      <div className="border-t border-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-600">
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
