'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copy a value to the clipboard, with feedback.
 *
 * `navigator.clipboard` exists only in a secure context, so a deployment served
 * over plain HTTP would silently do nothing. The fallback below uses a
 * temporary textarea and `execCommand`, which is deprecated but universally
 * supported — a copy button that fails quietly is worse than one that uses an
 * old API.
 *
 * The confirmation is announced through `aria-live` rather than a toast, so a
 * screen-reader user gets the same feedback a sighted user gets from the label
 * changing.
 */
export function CopyButton({
  value,
  label,
  className = '',
}: {
  /** The text to place on the clipboard. */
  value: string;
  /** What is being copied, e.g. "email address". Used in the accessible name. */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash = useCallback((ok: boolean) => {
    setCopied(ok);
    setFailed(!ok);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  }, []);

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        flash(true);
        return;
      }
    } catch {
      // Fall through to the legacy path.
    }

    // Legacy path: a detached textarea, selected and copied.
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      flash(ok);
    } catch {
      flash(false);
    }
  }, [value, flash]);

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200 ${className}`}
      >
        {copied ? (
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none">
            <path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" />
            <path d="M10.5 3.5h-7a1 1 0 00-1 1v7" stroke="currentColor" strokeLinecap="round" />
          </svg>
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
      {/* Announced to assistive technology; visually hidden. */}
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to the clipboard` : ''}
        {failed ? `Could not copy the ${label}` : ''}
      </span>
    </>
  );
}
