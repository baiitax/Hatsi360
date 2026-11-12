'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signIn, type AuthActionState } from '@/lib/auth/actions';

/**
 * The central sign-in form.
 *
 * One form for both audiences. The server decides where the person lands
 * afterwards, based on the role recorded in the database — the browser never
 * chooses the destination.
 */

const fieldClass =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

export function CentralSignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signIn, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900"
        >
          {state.success}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Work email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@pluckagro.com"
          className={fieldClass}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-semibold text-ink-800">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            className={`${fieldClass} pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-500">
        Market agent and staff accounts are created by the GonaPulse control centre. If you
        need an account, contact your supervisor.
      </p>
    </form>
  );
}
