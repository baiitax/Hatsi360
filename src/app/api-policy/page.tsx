import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'API Usage Policy',
  description: `How ${BRAND.name} API access is issued, rate-limited, logged and revoked, and what an API client may and may not do with the data.`,
  alternates: { canonical: '/api-policy' },
};

/**
 * DRAFT — requires review by authorised company personnel before publication.
 */
export default function ApiPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="API usage policy"
        lede={`This policy applies to every API key issued by ${BRAND.name}. It describes what a client may do, what the platform does to protect itself, and how access is ended.`}
        breadcrumbs={[{ label: 'API policy' }]}
      />

      <div className="section">
        <div className="container-page max-w-3xl">
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-950">Draft for legal review</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              Clauses marked <em>[confirm]</em> depend on a rate-limit figure, a commercial
              arrangement or a corporate fact that has not yet been settled, and must be confirmed
              before publication.
            </p>
          </div>

          <div className="prose-gona">
            <h2>1. Scope</h2>
            <p>
              This policy governs programmatic access to the {BRAND.name} API, including any
              download, export or bulk retrieval obtained through it. The{' '}
              <a href="/terms" className="font-semibold text-brand-700 underline">
                terms of service
              </a>{' '}
              and the{' '}
              <a href="/disclaimer" className="font-semibold text-brand-700 underline">
                price data disclaimer
              </a>{' '}
              apply to API use as well as to the website.
            </p>

            <h2>2. Key issuance</h2>
            <p>
              An API key is issued to an account, not to a device or a person who happens to have
              one. The key is shown once at issue and is stored only as a hash — it cannot be
              recovered from the platform, only reset. Every request made with a key is attributable
              to the account that holds it.
            </p>
            <p>
              <span className="font-semibold">[confirm]</span> Keys with a commercial entitlement
              attached are issued only once a written agreement and a payment arrangement are in
              place. Until then, API access is a trial grant and may be revoked without notice.
            </p>

            <h2>3. Rate limits</h2>
            <p>
              Requests are rate-limited per key. Exceeding the limit returns an error; it does not
              degrade the service for other clients.{' '}
              <span className="font-semibold">[confirm]</span> The published limit per tier is{' '}
              <span className="font-semibold">[confirm]</span> requests per minute, applied per key
              and per IP address.
            </p>

            <h2>4. Acceptable use</h2>
            <ul>
              <li>Do not exceed the rate limit or work around it by distributing requests across keys.</li>
              <li>Do not resell, sublicense or redistribute the raw dataset.</li>
              <li>
                Do not present API-sourced observations as your own collection. Attribution to{' '}
                {BRAND.name} is required.
              </li>
              <li>
                Do not present API-sourced observations as an official, statutory or regulated
                price, and do not merge distinct price types into one series.
              </li>
              <li>
                Do not request data you have no use for, or use it to reconstruct the coverage
                network.
              </li>
            </ul>

            <h2>5. Attribution</h2>
            <p>
              Any published product that displays API-sourced observations must carry a visible
              attribution to {BRAND.name} and link to the{' '}
              <a href="/methodology" className="font-semibold text-brand-700 underline">
                methodology
              </a>{' '}
              page, so that a reader can see what the figures are and what they are not.
            </p>

            <h2>6. Logging and revocation</h2>
            <p>
              API requests are logged with the key, the endpoint, the status and a hashed client
              address. Logs are retained for an operational period{' '}
              <span className="font-semibold">[confirm]</span> and are used for rate limiting,
              abuse detection and troubleshooting. A key may be revoked at any time, and access ends
              immediately when a key is revoked.
            </p>

            <h2>7. Data accuracy and liability</h2>
            <p>
              API responses carry the same provenance as the website: the market, the unit, the
              price type, the collection time and the verification status of each observation.
              Clients that strip that metadata and present a bare number misrepresent the data.
              The liability limits in the{' '}
              <a href="/terms" className="font-semibold text-brand-700 underline">
                terms of service
              </a>{' '}
              apply to API use.
            </p>

            <h2>8. Contact</h2>
            <p>
              API access questions and key requests go to{' '}
              <a href="/contact" className="font-semibold text-brand-700 underline">
                the GonaPulse team
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
