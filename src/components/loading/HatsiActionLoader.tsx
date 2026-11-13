'use client';

import { useFormStatus } from 'react-dom';

/**
 * Action-level loading feedback.
 *
 * A submission, an upload, an export or a report run is not a navigation, so
 * it gets its own indicator: a small spinner inside the control that started
 * it, and an `aria-busy` state on that control. It never covers the screen
 * and never blocks the rest of the page.
 */

/** The spinner glyph. Decorative — the accessible text sits beside it. */
export function HatsiSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`hatsi-spinner ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The button-level pending state.
 *
 * Used inside a `<form>`: it reads the form's own submission status, so a
 * button cannot claim to be busy when the form is not.
 */
export function HatsiSubmitState({
  pendingLabel = 'Working…',
  children,
}: {
  /** Announced while the form is submitting. */
  pendingLabel?: string;
  /** The button content, shown when the form is idle. */
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <HatsiSpinner />
          <span>{pendingLabel}</span>
        </span>
      ) : (
        children
      )}
    </>
  );
}

/**
 * A standalone action indicator.
 *
 * For actions that are not form submissions — a report run, an export, an
 * upload started from a button — pass the pending state in explicitly.
 */
export function HatsiActionLoader({
  pending,
  label = 'Working…',
  className = '',
}: {
  pending: boolean;
  /** Announced and displayed while the action runs. */
  label?: string;
  className?: string;
}) {
  if (!pending) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 text-sm text-ink-600 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <HatsiSpinner />
      <span>{label}</span>
    </span>
  );
}

/**
 * A busy overlay for a region that is being refreshed in place.
 *
 * It dims the region without removing it, so the reader keeps their place.
 */
export function HatsiBusyRegion({
  pending,
  label = 'Refreshing…',
  children,
}: {
  pending: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" aria-busy={pending}>
      {pending ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/60 pt-8 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-soft">
            <HatsiSpinner />
            {label}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
