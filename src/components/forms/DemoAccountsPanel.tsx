'use client';

import { useActionState } from 'react';
import { signIn, type AuthActionState } from '@/lib/auth/actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';
import { CopyButton } from './CopyButton';

/**
 * The demo access section on the sign-in page.
 *
 * These are test accounts, created by `scripts/manage_demo_users.mjs`, so the
 * agent and admin portals can be signed into without a real operator. They are
 * labelled as demo accounts everywhere they appear: the profile's `full_name`
 * begins "DEMO — ", so they cannot be mistaken for a genuine user in a list,
 * an audit trail or an assignment table.
 *
 * Each button is its own form posting through the same `signIn` server action
 * the real form uses. Nothing here is a second sign-in path: the demo accounts
 * authenticate exactly as a real account does, which is the point — a demo
 * sign-in that worked differently would prove nothing about the real flow.
 *
 * ## What the demo does and does not prove
 *
 * The copy of this panel states it plainly, because it would be easy to
 * overclaim: the demo proves that **each portal opens, routes correctly and
 * renders its own screens under real Row Level Security**. The demonstration
 * records it renders are synthetic and marked as test fixtures throughout, so
 * they prove the workflow, not the market. They never reach the public price
 * pages: `published_price_observations` filters `test_fixture` out, and every
 * demonstration row carries `published_at = NULL`.
 *
 * ## Why the credentials are on a public page
 *
 * They are visible unconditionally, which is a deliberate decision the
 * requester made after being shown the exposure: anyone who can open this page
 * can sign in as an administrator. The reasoning, the mitigations and the
 * command that removes the accounts are recorded in
 * `docs/HATSI360_DEMO_ACCOUNTS.md`. The accounts can read nothing a visitor
 * cannot already read on the public site; the reason to remove them before
 * launch is that they are credentials, not that they expose data.
 */

const ACCOUNTS = [
  {
    email: 'demo.agent@hatsi360.test',
    role: 'Market agent',
    destination: 'Field app — collect prices at the assigned market',
  },
  {
    email: 'demo.verifier@hatsi360.test',
    role: 'Verification officer',
    destination: 'Verification queue — review and publish observations',
  },
  {
    email: 'demo.admin@hatsi360.test',
    role: 'Administrator',
    destination: 'Control Centre — every admin module',
  },
  {
    // Owns the demonstration buyer and seller offers, so the commercial
    // workflow has a real counterparty rather than a staff account.
    email: 'demo.customer@hatsi360.test',
    role: 'Customer',
    destination: 'Customer workspace — own buyer and seller offers',
  },
  {
    // The role a free self-registration produces. Owns the saved commodities,
    // saved markets and price alerts, so /trade/watchlist and /trade/alerts
    // have something to render.
    email: 'demo.public@hatsi360.test',
    role: 'Public account',
    destination: 'Watchlist and price alerts — no operational permissions',
  },
] as const;

/** The shared demo password, set by `scripts/manage_demo_users.mjs`. */
const DEMO_PASSWORD = 'hatsi360-demo';

export function DemoAccountsPanel({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signIn, {});

  return (
    <section
      aria-labelledby="demo-access-heading"
      className="mt-8 overflow-hidden rounded-2xl border border-ink-200 bg-ink-50"
    >
      <div className="border-b border-ink-200 bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-harvest-100 text-sm text-harvest-700"
          >
            ⚑
          </span>
          <div>
            <h2
              id="demo-access-heading"
              className="font-display text-sm font-bold uppercase tracking-wide text-ink-900"
            >
              Demo access
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              Five test accounts, each landing in a different workspace. Signing in is the
              same sign-in a real account uses — it proves the portal opens and routes
              correctly, under the same permissions. The demonstration records are labelled
              test fixtures and are never published to the public price pages, so an empty
              public screen is the honest state and not a fault.
            </p>
          </div>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      {/* The shared password, shown once with a copy action. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
        <div className="min-w-0">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-widest text-ink-500">
            Shared password
          </span>
          <code className="mt-0.5 block truncate font-mono text-sm text-ink-900">
            {DEMO_PASSWORD}
          </code>
        </div>
        <CopyButton value={DEMO_PASSWORD} label="demo password" />
      </div>

      <ul className="space-y-2 px-5 pb-4">
        {ACCOUNTS.map((account) => (
          <li key={account.email}>
            <form action={formAction} className="w-full">
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <input type="hidden" name="email" value={account.email} />
              <input type="hidden" name="password" value={DEMO_PASSWORD} />
              {/*
                The row stacks below `sm` rather than sitting the buttons beside
                the text. Measured, not assumed: with the copy and sign-in
                buttons in one horizontal flex row the row's min-content was
                408px, which forced the page grid to 458px and produced a 68px
                horizontal scrollbar at a 390px viewport. Stacking drops the
                row's min-content to its widest cluster instead of their sum.
              */}
              <div className="flex w-full flex-col gap-2.5 rounded-xl border border-ink-200 bg-white px-3.5 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-900">{account.role}</span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-ink-500">
                    {account.email}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">{account.destination}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <CopyButton value={account.email} label={`${account.role} email address`} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? <HatsiSpinner className="size-3.5" /> : null}
                    Sign in
                  </button>
                </span>
              </div>
            </form>
          </li>
        ))}
      </ul>

      <p className="border-t border-ink-200 bg-white px-5 py-3 text-xs leading-relaxed text-ink-500">
        These credentials are printed on a public page. Remove the accounts with{' '}
        <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.7rem] text-ink-700">
          node scripts/manage_demo_users.mjs --remove
        </code>{' '}
        before any public launch.
      </p>
    </section>
  );
}
