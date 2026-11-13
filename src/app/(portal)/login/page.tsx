import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { landingPathForRole, safeRedirectPath } from '@/lib/auth/routing';
import { CentralSignInForm } from '@/components/forms/CentralSignInForm';
import { DemoAccountsPanel } from '@/components/forms/DemoAccountsPanel';
import { BrandLogo } from '@/components/brand/Logo';
import { HatsiImage } from '@/components/media/HatsiImage';
import { getPageImage } from '@/lib/images/registry';
import { BRAND, CONTACT } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in to the ${BRAND.surfaces.portal}.`,
  robots: { index: false, follow: false },
};

// The sign-in page depends on the current session, so it is never cached.
export const dynamic = 'force-dynamic';

const ERROR_MESSAGES: Record<string, string> = {
  suspended:
    'This account is suspended. Contact your supervisor to restore access to the field app.',
  deactivated: 'This account is no longer active. Contact your supervisor if you believe this is a mistake.',
  forbidden: 'Your role does not have access to that area of the portal.',
  expired: 'Your session has expired. Please sign in again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();

  if (session?.profile && session.profile.accountStatus === 'active') {
    redirect(safeRedirectPath(params.next, landingPathForRole(session.profile.role)));
  }

  const next = safeRedirectPath(params.next, '');
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;
  const heroImage = getPageImage('home.hero');

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* The brand panel. */}
      <section className="relative hidden overflow-hidden bg-brand-900 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        {/*
          The photograph. A real picture of the markets this platform reads, not
          a gradient — the brief asks for premium agricultural photography here
          rather than an abstract wash.

          It sits behind a near-opaque brand scrim so the copy above it keeps a
          contrast ratio well past AA. The image is registered, licensed and
          disclosed as a Hatsi360 editorial asset; its alt text describes what it
          actually shows, and it is not presented as a verified photograph of any
          named market.
        */}
        <HatsiImage
          asset={heroImage}
          sizes="(min-width: 1024px) 52vw, 0px"
          priority
          fill
          imageClassName="object-cover"
          className="!absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-brand-900/88"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-brand-700/40 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <BrandLogo size={44} tone="dark" />
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-brand-200">
            {BRAND.endorsement}
          </span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
            {BRAND.surfaces.portal}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-100">
            One sign-in for market agents collecting prices in the field and for the staff who
            verify, publish and analyse them. Every price carries its own provenance.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/15 pt-8">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                Field collection
              </dt>
              <dd className="mt-1 text-sm text-brand-100">
                Guided six-step collection that works on a weak network.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                Verification
              </dt>
              <dd className="mt-1 text-sm text-brand-100">
                Approval and publication are separate, recorded acts.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                Coverage
              </dt>
              <dd className="mt-1 text-sm text-brand-100">
                Coverage measured against the collection plan, never assumed.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                Audit
              </dt>
              <dd className="mt-1 text-sm text-brand-100">
                Every change is attributed and kept. History is never erased.
              </dd>
            </div>
          </dl>
        </div>

        <p className="relative text-xs text-brand-300">
          &copy; {new Date().getFullYear()} {BRAND.name}. {BRAND.endorsement}. Prices are published
          only after verification.
        </p>
      </section>

      {/* The form panel. */}
      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo size={32} />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">Sign in</h2>
          <p className="mt-1 text-sm text-ink-600">
            Use the work email address your {BRAND.name} account was created with.
          </p>

          {errorMessage ? (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-6">
            <CentralSignInForm next={next || undefined} />
          </div>

          {/*
            The demo accounts.

            These are visible unconditionally. That is a deliberate decision the
            requester made after being shown the exposure: anyone who can open
            this page can sign in as an administrator. It is recorded, with the
            removal command, in docs/HATSI360_DEMO_ACCOUNTS.md.

            The accounts are created by scripts/manage_demo_users.mjs. If that
            script has not been run, the panel still renders — and a sign-in
            attempt fails with the same "invalid credentials" error a real
            wrong password produces, which is honest rather than confusing.
          */}
          <DemoAccountsPanel next={next || undefined} />

          {/*
            Access, stated plainly.

            Operational access — agent, verification officer, administrator — is
            invitation-only and provisioned on the server. `signUp` hard-codes
            `public_user`, so no browser can reach an operational role through
            self-registration; that rule lives in the server action, not in this
            copy. A public account is a separate, free thing: it saves
            commodities and sets price alerts, and it is deliberately offered
            without an invitation so the price directory stays useful.
          */}
          <div className="mt-8 space-y-3 border-t border-ink-200 pt-6 text-sm text-ink-600">
            <p>
              Access is invitation-only. Contact the Hatsi360 team if you require an
              account.{' '}
              <Link href="/contact" className="font-semibold text-brand-700 hover:text-brand-800">
                Request access
              </Link>
            </p>
            <p>
              Need help signing in?{' '}
              <a
                href={CONTACT.emailHref}
                className="font-semibold text-brand-700 hover:text-brand-800"
              >
                {CONTACT.email}
              </a>{' '}
              or{' '}
              <a href={CONTACT.phoneHref} className="font-semibold text-brand-700 hover:text-brand-800">
                {CONTACT.phone}
              </a>
            </p>
            <p className="text-xs text-ink-500">
              Looking for public prices?{' '}
              <Link href="/prices" className="font-semibold text-ink-700 hover:text-brand-800">
                Browse the price directory
              </Link>{' '}
              — no account needed. A free{' '}
              <Link href="/register" className="font-semibold text-ink-700 hover:text-brand-800">
                public account
              </Link>{' '}
              only adds saved commodities and price alerts.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
