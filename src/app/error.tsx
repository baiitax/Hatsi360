'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side digest is logged by the platform; nothing sensitive is sent
    // to the browser.
    console.error('Unhandled application error:', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="section">
      <div className="container-page max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">Error</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Something went wrong on our side
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          The request could not be completed. No price data has been altered. Please try again.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-ink-500">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
          >
            Back to the homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
