import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that apply when you use the Pluck Live website, create an account, or access the Pluck Live API.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        lede="These terms apply when you use the Pluck Live website, register an account, or access the Pluck Live API."
        breadcrumbs={[{ label: 'Terms' }]}
      />

      <div className="section">
        <div className="container-page max-w-3xl">
          <div className="prose-pluck">
            <h2>1. Agreement</h2>
            <p>
              By using Pluck Live you agree to these terms. If you are using Pluck Live on behalf of
              an organisation, you confirm you are authorised to accept these terms for that
              organisation.
            </p>

            <h2>2. What Pluck Live provides</h2>
            <p>
              Pluck Live publishes agricultural commodity price observations collected from markets
              and reviewed by our verification staff, together with related reference data,
              analysis and API access. Your use of the platform is subject to the{' '}
              <a href="/disclaimer" className="font-semibold text-brand-700 underline">
                price data disclaimer
              </a>
              , which forms part of these terms.
            </p>

            <h2>3. Accounts</h2>
            <p>
              You are responsible for keeping your credentials confidential and for all activity
              under your account. Accounts used for collecting price data may only be used by the
              agent they are assigned to, and only in the markets they are assigned to.
            </p>

            <h2>4. Acceptable use</h2>
            <ul>
              <li>Do not attempt to insert, edit, approve or delete authoritative prices outside the workflow provided.</li>
              <li>Do not attempt to read another organisation&rsquo;s private data, saved items, alerts or reports.</li>
              <li>Do not scrape the platform at a rate that degrades service for others.</li>
              <li>Do not misrepresent Pluck Live data as an official, statutory or regulated price.</li>
              <li>Do not redistribute premium data or API access beyond your entitlements without a written agreement.</li>
            </ul>

            <h2>5. Market agents</h2>
            <p>
              A market agent records what they actually observe. Submitting a price that was not
              observed, back-dating a collection time, or altering a record after verification are
              grounds for immediate removal from the collection network.
            </p>

            <h2>6. API terms</h2>
            <p>
              API keys are issued to an account and may be revoked at any time. You are responsible
              for all requests made with your key, for keeping it secret, and for staying within the
              rate limit and entitlement attached to it. Premium endpoints require an active
              subscription. Access is logged.
            </p>

            <h2>7. Intellectual property</h2>
            <p>
              The Pluck Live name, logo, site design, code and documentation belong to Pluck Agro.
              Price observations are published by Pluck Agro; you may use, display and analyse them
              under your subscription, including commercially, but you may not resell the raw
              dataset or present it as your own collection without attribution.
            </p>

            <h2>8. Availability and changes</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted service. We may change
              or discontinue features, and we will give reasonable notice for material changes to
              paid entitlements.
            </p>

            <h2>9. Liability</h2>
            <p>
              To the extent permitted by law, Pluck Agro&rsquo;s total liability arising from your
              use of Pluck Live is limited to the amount you paid us in the twelve months before the
              claim. We are not liable for commercial decisions taken in reliance on published
              prices.
            </p>

            <h2>10. Governing law</h2>
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria, and the
              courts of Nigeria have jurisdiction.
            </p>

            <h2>11. Contact</h2>
            <p>
              Questions about these terms:{' '}
              <a href="mailto:info@agripricelive.com" className="font-semibold text-brand-700 underline">
                info@agripricelive.com
              </a>
              .
            </p>

            <p className="mt-8 text-sm text-ink-500">Last updated: 22 October 2026</p>
          </div>
        </div>
      </div>
    </>
  );
}
