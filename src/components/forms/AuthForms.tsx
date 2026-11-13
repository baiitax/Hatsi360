'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signIn, signUp, requestPasswordReset, type AuthActionState } from '@/lib/auth/actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';

const fieldClass =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none';

function Alert({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900"
      >
        {state.success}
      </p>
    );
  }
  return null;
}

export function SignInForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signIn, {});

  return (
    <form action={formAction} className="space-y-5">
      <Alert state={state} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={fieldClass}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-semibold text-ink-800">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? (
          <>
            <HatsiSpinner />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>

      <p className="text-center text-sm text-ink-600">
        New to Hatsi360?{' '}
        <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signUp, {});

  return (
    <form action={formAction} className="space-y-5">
      <Alert state={state} />

      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          autoComplete="name"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="organisation" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Organisation <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <input
          id="organisation"
          name="organisation"
          autoComplete="organization"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
        <p className="mt-1.5 text-xs text-ink-500">At least 8 characters.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? (
          <>
            <HatsiSpinner />
            Creating account…
          </>
        ) : (
          'Create account'
        )}
      </button>

      <p className="text-center text-sm text-ink-600">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <Alert state={state} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? (
          <>
            <HatsiSpinner />
            Sending…
          </>
        ) : (
          'Send reset link'
        )}
      </button>

      <p className="text-center text-sm text-ink-600">
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
