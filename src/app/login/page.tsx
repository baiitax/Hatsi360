import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { landingPathForRole, safeRedirectPath } from '@/lib/auth/routing';
import { CentralSignInForm } from '@/components/forms/CentralSignInForm';

export const metadata: Metadata = {
  title: 'Sign in — Pluck Live',
  description: 'Sign in to the Pluck Live market operations portal.',
  robots: { index: false, follow: false },
};

// The sign-in page depends on the current session, so it is never cached.
export const dynamic = 'force-dynamic';

const ERROR_MESSAGES: Record<string, string> = {
  suspended:
    'This account is suspended. Contact your supervisor to restore access to the field app.',
  deactivated:
    'This account is no longer active. Contact your supervisor if you believe this is a mistake.',
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

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* The brand panel. */}
      <section className="relative hidden overflow-hidden bg-brand-900 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-brand-700/40 blur-3xl"
        />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-xl bg-brand-500 font-black text-brand-950"
            >
              PL
            </span>
            <span className="text-xl font-bold tracking-tight">
              Pluck Live
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
                Pluck Agro
              </span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            The market operations portal for Nigeria&rsquo;s agricultural price network.
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
          &copy; {new Date().getFullYear()} Pluck Agro. Prices are published only after verification.
        </p>
      </section>

      {/* The form panel. */}
      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-brand-700 text-sm font-black text-white"
            >
              PL
            </span>
            <span className="text-sm font-bold text-brand-900">Pluck Live</span>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Sign in</h2>
          <p className="mt-1 text-sm text-ink-600">
            Use the work email address your Pluck Live account was created with.
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

          <div className="mt-8 border-t border-ink-200 pt-6 text-center text-sm text-ink-600">
            <p>
              Looking for public prices?{' '}
              <Link href="/prices" className="font-semibold text-brand-700 hover:text-brand-800">
                Browse the price directory
              </Link>
            </p>
            <p className="mt-2">
              <Link href="/register" className="font-semibold text-ink-700 hover:text-brand-800">
                Create a public account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
