'use client';

import { useActionState } from 'react';
import { updateFieldProfile, type FieldActionState } from '@/lib/operations/field-actions';
import { HatsiSpinner } from '@/components/loading/HatsiActionLoader';

/**
 * The fields the agent is allowed to change.
 *
 * The role, the account state and the assignments are deliberately absent:
 * an agent cannot promote themselves, reactivate a suspended account or
 * assign themselves to a market, and the database refuses those writes even
 * if a request is made by hand.
 */
export function ProfileForm({
  fullName,
  alternatePhone,
}: {
  fullName: string;
  alternatePhone: string;
}) {
  const [state, formAction, pending] = useActionState<FieldActionState, FormData>(
    updateFieldProfile,
    { ok: false, message: '' },
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-ink-700">Your name</span>
        <input
          type="text"
          name="fullName"
          defaultValue={fullName}
          required
          className="mt-1 min-h-[48px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-base text-ink-900 focus:border-brand-500 focus:outline-none"
        />
        {state.fieldErrors?.fullName ? (
          <span className="mt-1 block text-xs font-semibold text-error-700">
            {state.fieldErrors.fullName}
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ink-700">Alternative phone (optional)</span>
        <input
          type="tel"
          name="alternatePhone"
          defaultValue={alternatePhone}
          placeholder="0800 000 0000"
          className="mt-1 min-h-[48px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
        />
        {state.fieldErrors?.alternatePhone ? (
          <span className="mt-1 block text-xs font-semibold text-error-700">
            {state.fieldErrors.alternatePhone}
          </span>
        ) : null}
      </label>

      {state.message ? (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm font-semibold ${
            state.ok
              ? 'border-brand-200 bg-brand-50 text-brand-800'
              : 'border-error-200 bg-error-50 text-error-700'
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? (
          <>
            <HatsiSpinner />
            Saving…
          </>
        ) : (
          'Save my details'
        )}
      </button>
    </form>
  );
}
