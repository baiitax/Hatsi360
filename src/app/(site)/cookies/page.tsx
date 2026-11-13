import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: `Which cookies and local storage ${BRAND.name} uses, what each one is for, and how to control them.`,
  alternates: { canonical: '/cookies' },
};

/**
 * DRAFT — requires review by authorised company personnel before publication.
 */
export default function CookiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Cookie policy"
        lede={`${BRAND.name} uses a deliberately small set of cookies and browser storage. This page lists each one and what it does.`}
        breadcrumbs={[{ label: 'Cookies' }]}
      />

      <div className="section">
        <div className="container-page max-w-3xl">
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-950">Draft for legal review</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              The retention periods and the named processors marked <em>[confirm]</em> must be
              settled against the deployed configuration before publication.
            </p>
          </div>

          <div className="prose-hatsi">
            <h2>What we set, and why</h2>
            <p>
              {BRAND.name} is built to be useful without tracking. The website sets no advertising
              cookie, no third-party marketing pixel and no cross-site behavioural tracker.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="py-2 pr-3">Name</th>
                    <th scope="col" className="py-2 pr-3">Type</th>
                    <th scope="col" className="py-2 pr-3">Purpose</th>
                    <th scope="col" className="py-2">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  <tr>
                    <th scope="row" className="py-2.5 pr-3 font-mono text-xs text-ink-900">
                      gp-session
                    </th>
                    <td className="py-2.5 pr-3 text-ink-600">Cookie</td>
                    <td className="py-2.5 pr-3 text-ink-600">
                      Keeps a signed-in person signed in. Contains a session reference only — no
                      password, no personal data.
                    </td>
                    <td className="py-2.5 text-ink-500">[confirm] session length</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2.5 pr-3 font-mono text-xs text-ink-900">
                      gp-collection-draft
                    </th>
                    <td className="py-2.5 pr-3 text-ink-600">Local storage</td>
                    <td className="py-2.5 pr-3 text-ink-600">
                      Holds a price entry in progress on a field agent&rsquo;s phone so a dropped
                      connection does not lose the work. Stored on the device, never transmitted
                      until the agent submits.
                    </td>
                    <td className="py-2.5 text-ink-500">Until submitted or cleared</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2.5 pr-3 font-mono text-xs text-ink-900">
                      gp-pending-submissions
                    </th>
                    <td className="py-2.5 pr-3 text-ink-600">Local storage</td>
                    <td className="py-2.5 pr-3 text-ink-600">
                      Holds observations captured offline that are waiting to sync. Each carries a
                      client-generated identifier so a retry cannot double-file it.
                    </td>
                    <td className="py-2.5 text-ink-500">Until synced or cleared</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>Service-role and API credentials</h2>
            <p>
              Server-side credentials — the database service-role key, API keys and any
              notification provider token — are never set on a browser or sent to one. They exist
              only in the server environment. API keys are stored hashed and are shown once at
              issue.
            </p>

            <h2>Third parties</h2>
            <p>
              <span className="font-semibold">[confirm]</span> The platform currently relies on{' '}
              <span className="font-semibold">[confirm]</span> for authentication and{' '}
              <span className="font-semibold">[confirm]</span> for email delivery. Those services
              set their own cookies only when you interact with a sign-in or email flow. A consent
              banner will be required if the final configuration introduces any non-essential
              cookie.
            </p>

            <h2>Controlling cookies</h2>
            <p>
              Browser settings control cookies and local storage for every site. Blocking them will
              sign you out and will stop the field app from holding an entry while offline — the
              app will still work, but a draft cannot survive a reload. Clearing site data removes
              any unsent offline submissions on that device, so a field agent should sync before
              clearing.
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
