import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { ContactForm } from '@/components/forms/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Talk to the Hatsi360 team about market partnerships, API access, custom reports or a published price you think looks wrong.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Hatsi360 team"
        lede="Whether you want to bring a market into the collection network, need API access, want a custom report, or believe a published price is wrong — we want to hear it."
        breadcrumbs={[{ label: 'Contact' }]}
        image={getPageImage('contact.hero')}
      />

      <div className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_20rem]">
          <ContactForm />

          <aside className="space-y-5">
            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">Direct</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href="tel:+2348012345678" className="font-medium text-ink-800 hover:text-brand-700">
                    +234 801 234 5678
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@agripricelive.com"
                    className="font-medium text-ink-800 hover:text-brand-700"
                  >
                    info@agripricelive.com
                  </a>
                </li>
              </ul>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">Common requests</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/pricing" className="font-medium text-ink-800 hover:text-brand-700">
                    Intelligence plans and entitlements
                  </Link>
                </li>
                <li>
                  <Link href="/api-docs" className="font-medium text-ink-800 hover:text-brand-700">
                    API documentation
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="font-medium text-ink-800 hover:text-brand-700">
                    Our collection methodology
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer" className="font-medium text-ink-800 hover:text-brand-700">
                    How to report a wrong price
                  </Link>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
                Reporting a wrong price?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Include the commodity, the market and the date, and we will trace it through the
                verification trail and either correct it or explain why it stands.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
