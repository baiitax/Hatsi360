import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Pluck Live collects, uses and protects personal data — account details, price observations, evidence files and API usage.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        lede="Pluck Agro operates Pluck Live. This policy explains what personal data we hold, why we hold it, and the choices you have."
        breadcrumbs={[{ label: 'Privacy' }]}
      />

      <div className="section">
        <div className="container-page max-w-3xl">
          <div className="prose-pluck">
            <h2>Who is responsible for your data</h2>
            <p>
              Pluck Agro is the data controller for personal data processed through Pluck Live.
              Contact us at{' '}
              <a href="mailto:info@agripricelive.com" className="font-semibold text-brand-700 underline">
                info@agripricelive.com
              </a>{' '}
              with any question about this policy.
            </p>

            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Account data.</strong> When you register, we store your email address, full
                name, optional phone number and organisation. Your password is held by our
                authentication provider and is never visible to us in readable form.
              </li>
              <li>
                <strong>Price observations submitted by agents.</strong> The commodity, market,
                unit, price type, amount, collection time and market notes recorded by market
                agents, together with the name of the agent who recorded it.
              </li>
              <li>
                <strong>Evidence files.</strong> Photographs or documents uploaded to support an
                observation. These are stored in a private bucket and are only made public after a
                verification officer approves them.
              </li>
              <li>
                <strong>Usage records.</strong> Sign-in events, page views and API request logs.
                API client IP addresses are stored hashed rather than in plain text.
              </li>
            </ul>

            <h2>Why we collect it</h2>
            <ul>
              <li>To operate the price collection, verification and publication workflow</li>
              <li>To publish price observations with verifiable provenance</li>
              <li>To provide customer accounts, alerts, exports and reports</li>
              <li>To operate the API, apply rate limits and prevent abuse</li>
              <li>To investigate reported errors in published data</li>
            </ul>

            <h2>What is public and what is not</h2>
            <p>
              Published price observations, commodity and market reference data and published
              articles are public. Your account, your saved items, your alerts, your reports and your
              API credentials are private, and are readable only by you and by authorised Pluck Live
              staff. Access to these is enforced in the database itself, not only in the interface.
            </p>

            <h2>Who we share it with</h2>
            <p>
              We do not sell personal data. We share it only with service providers that host the
              platform and deliver emails, and where a market agent assignment requires it, with
              the supervisor who assigned them. We will disclose data where we are legally
              required to do so.
            </p>

            <h2>How long we keep it</h2>
            <p>
              Price observations and their audit trail are kept for the life of the platform, because
              they are the provenance record for every published figure. Account data is kept while
              your account is active. Usage logs are retained for a limited operational period.
            </p>

            <h2>Your rights</h2>
            <p>
              You may request a copy of the personal data we hold about you, ask us to correct it,
              or ask us to delete your account. Contact us and we will respond. Note that deleting
              your account does not remove published price observations that were collected by
              agents acting for the platform, because those records are the provenance for published
              market data.
            </p>

            <h2>Security</h2>
            <p>
              Access to data is enforced with database-level permissions. Staff see only what their
              role requires. Sensitive operations — approving, rejecting, correcting or unpublishing
              a price — are recorded in an audit log with the person, the time and the reason.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We will update this policy when our practices change, and revise the date shown below.
            </p>

            <p className="mt-8 text-sm text-ink-500">Last updated: 22 October 2026</p>
          </div>
        </div>
      </div>
    </>
  );
}
