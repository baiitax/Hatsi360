import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { BRAND, CONTACT } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that apply when you use the Hatsi360 website, create an account, or access the Hatsi360 API.',
  alternates: { canonical: '/terms' },
};

/**
 * DRAFT — requires review by authorised company personnel before publication.
 *
 * The text below is written to be reviewable: each clause states what it
 * covers, and clauses that depend on a commercial arrangement that does not
 * yet exist say so explicitly rather than implying one.
 */
export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        lede={`These terms apply when you use the ${BRAND.name} website, register an account, or access the ${BRAND.name} API.`}
        breadcrumbs={[{ label: 'Terms' }]}
      />

      <div className="section">
        <div className="container-page max-w-3xl">
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-950">Draft for legal review</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              This document is a reviewable draft prepared for the business. Clauses marked{' '}
              <em>[confirm]</em> depend on a corporate fact, a registered entity name, or a
              commercial arrangement that has not yet been confirmed, and must be settled by
              authorised personnel before it is published as a binding document.
            </p>
          </div>

          <div className="prose-hatsi">
            <h2>1. Agreement</h2>
            <p>
              By using {BRAND.name} you agree to these terms. If you are using {BRAND.name} on
              behalf of an organisation, you confirm you are authorised to accept these terms for
              that organisation.
            </p>

            <h2>2. What {BRAND.name} provides</h2>
            <p>
              {BRAND.name} publishes agricultural commodity price observations collected from
              markets and reviewed by our verification staff, together with related reference data,
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
            <p>
              Agent and staff accounts are provisioned by the {BRAND.surfaces.controlCentre}. There
              is no self-registration route to a staff or agent role.
            </p>

            <h2>4. Acceptable use</h2>
            <ul>
              <li>
                Do not attempt to insert, edit, approve or delete authoritative prices outside the
                workflow provided.
              </li>
              <li>
                Do not attempt to read another organisation&rsquo;s private data, saved items, alerts
                or reports.
              </li>
              <li>Do not scrape the platform at a rate that degrades service for others.</li>
              <li>
                Do not misrepresent {BRAND.name} data as an official, statutory or regulated price.
              </li>
              <li>
                Do not redistribute premium data or API access beyond your entitlements without a
                written agreement.
              </li>
              <li>
                Do not present {BRAND.name} observations as your own collection without
                attribution.
              </li>
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
              rate limit and entitlement attached to it. Access is logged.
            </p>
            <p>
              <span className="font-semibold">[confirm]</span> Where a paid entitlement applies to
              an API key, a commercial agreement, a price and a payment provider must be in place
              before that key is issued. Until then, API access is granted as a trial and is
              revocable without notice.
            </p>

            <h2>7. Intellectual property</h2>
            <p>
              The {BRAND.name} name, logo, site design, code and documentation belong to{' '}
              <span className="font-semibold">[confirm]</span> the corporate entity that operates
              the platform. {BRAND.ownershipStatement} Price observations are published by that
              entity; you may use, display and analyse them under your entitlement, including
              commercially, but you may not resell the raw dataset or present it as your own
              collection without attribution.
            </p>

            <h2>8. Availability and changes</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted service. We may change
              or discontinue features, and we will give reasonable notice for material changes to
              paid entitlements.
            </p>
            <p>
              Historical price records are preserved. A correction to a published price is appended
              as a new record with its reason and lineage; the original record is not deleted.
            </p>

            <h2>9. Liability</h2>
            <p>
              To the extent permitted by law,{' '}
              <span className="font-semibold">[confirm]</span> the operator&rsquo;s total liability
              arising from your use of {BRAND.name} is limited to{' '}
              <span className="font-semibold">[confirm]</span> the amount you paid us in the
              twelve months before the claim, or zero if you have paid nothing. We are not liable
              for commercial decisions taken in reliance on published prices.
            </p>

            <h2>10. Governing law</h2>
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria, and the
              courts of Nigeria have jurisdiction.
            </p>

            <h2>11. Contact</h2>
            <p>
              Questions about these terms:{' '}
              <a href={CONTACT.emailHref} className="font-semibold text-brand-700 underline">
                {CONTACT.email}
              </a>
              .
            </p>

            <p className="mt-8 text-sm text-ink-500">
              Draft last revised: 22 October 2026. Effective date to be confirmed at publication.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
