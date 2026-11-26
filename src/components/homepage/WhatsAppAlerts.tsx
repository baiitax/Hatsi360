'use client';

import { useActionState, useId } from 'react';

import { joinWhatsAppAlerts, type WhatsAppAlertsState } from '@/lib/forms/actions';
import { WHATSAPP_CONSENT_TEXT } from '@/lib/forms/whatsapp-consent';

/**
 * The WhatsApp alerts segment.
 *
 * A visitor who is not ready to open an account can still ask to hear from us:
 * they leave a number, agree to be messaged, and join the list. It is a quiet
 * band rather than a pop-up, because the page's argument is the prices, not the
 * marketing.
 *
 * It is drawn as one of the page's own cards — white surface, hairline border,
 * forest heading, gold eyebrow — so it sits inside the page rather than on top
 * of it. Nothing here is dark, and nothing relies on a coloured panel to carry
 * the form: the input, the consent line and the button are all read on white.
 *
 * It is written as a **waitlist**, and says so. WhatsApp delivery is wired as a
 * notification adapter but no provider is connected in this deployment, so
 * nothing is sent from the list yet. Promising "instant alerts" here would be
 * the one dishonest sentence on the page, and the fine print exists to prevent
 * it — the visitor is told what will be stored, why, and that nothing is sent
 * until the channel opens.
 */
export function WhatsAppAlerts() {
  const [state, formAction, pending] = useActionState<WhatsAppAlertsState, FormData>(
    joinWhatsAppAlerts,
    {},
  );
  const fieldId = useId();
  const consentId = `${fieldId}-consent`;
  const hintId = `${fieldId}-hint`;

  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10">
        <div>
          {/* The gold is the rule, not the words: harvest-600 measures 3.1:1
              on white, which is a fail for a 10px label. Forest reads at 9.8:1. */}
          <p className="flex items-center gap-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-brand-700">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-harvest-500" />
            Market alerts
          </p>

          <h2
            id={`${fieldId}-title`}
            className="mt-2.5 font-display text-[1.125rem] font-bold leading-snug text-brand-900 sm:text-[1.3125rem]"
          >
            Market movements, straight to WhatsApp
          </h2>

          <p className="mt-2 max-w-[34rem] text-[0.8125rem] leading-relaxed text-ink-600">
            We are connecting WhatsApp delivery for price movements, new publications and market
            notices. Leave your number and we will add you to the list — we will message you when
            the channel opens.
          </p>

          <p className="mt-3 max-w-[34rem] text-[0.6875rem] leading-relaxed text-ink-400">
            We store the number you enter and the date you agreed. Nothing is sent until WhatsApp
            delivery is connected, and you can ask us to remove you at any time.
          </p>
        </div>

        <div>
          {state.success ? (
            <div role="status" className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-4">
              <p className="flex items-center gap-2 font-display text-[0.8125rem] font-bold text-brand-900">
                <span aria-hidden="true" className="text-brand-600">
                  ✓
                </span>
                You are on the list
              </p>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-600">{state.success}</p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor={fieldId}
                  className="mb-1.5 block font-display text-[0.75rem] font-bold text-brand-900"
                >
                  WhatsApp number
                </label>
                <input
                  id={fieldId}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  required
                  maxLength={40}
                  placeholder="0803 123 4567"
                  aria-describedby={hintId}
                  className="w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p id={hintId} className="mt-1.5 text-[0.6875rem] text-ink-400">
                  A Nigerian mobile number, or any number with its country code.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  id={consentId}
                  name="consent"
                  type="checkbox"
                  required
                  className="mt-0.5 size-4 shrink-0 rounded-sm border-ink-300 accent-brand-700"
                />
                <label htmlFor={consentId} className="text-[0.75rem] leading-relaxed text-ink-600">
                  {WHATSAPP_CONSENT_TEXT}
                </label>
              </div>

              {state.error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-error-200 bg-error-50 px-3.5 py-2.5 text-[0.75rem] font-medium text-error-700"
                >
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-800 px-5 py-2.5 font-display text-[0.8125rem] font-bold text-white transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {pending ? 'Adding…' : 'Join the alerts list'}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
