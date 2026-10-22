'use client';

import { useActionState } from 'react';
import { submitEnquiry } from '@/lib/forms/actions';

const fieldClass =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none';

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, {});

  if (state.success) {
    return (
      <div className="card p-8">
        <span aria-hidden="true" className="text-3xl text-brand-600">
          ✓
        </span>
        <h2 className="mt-3 text-xl font-bold">Thank you — your message is with us.</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          {state.success} We typically reply within one business day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card p-6 sm:p-8">
      <h2 className="text-xl font-bold">Send us a message</h2>
      <p className="mt-2 text-sm text-ink-600">
        All fields marked with an asterisk are required.
      </p>

      {state.error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Full name *
          </label>
          <input id="name" name="name" required maxLength={120} className={fieldClass} autoComplete="name" />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Email address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            className={fieldClass}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="organisation" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Organisation
          </label>
          <input
            id="organisation"
            name="organisation"
            maxLength={120}
            className={fieldClass}
            autoComplete="organization"
          />
        </div>

        <div>
          <label htmlFor="topic" className="mb-1.5 block text-sm font-semibold text-ink-800">
            What is this about? *
          </label>
          <select id="topic" name="topic" required className={fieldClass} defaultValue="general">
            <option value="general">General enquiry</option>
            <option value="market-partnership">Become a market partner or agent</option>
            <option value="api">API access</option>
            <option value="report">Custom report or research</option>
            <option value="pricing">Premium plan question</option>
            <option value="data-correction">Report a price that looks wrong</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            maxLength={5000}
            placeholder="For a price correction, please include the commodity, the market and the date."
            className={`${fieldClass} resize-y`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
