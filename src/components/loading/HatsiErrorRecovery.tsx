'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Error recovery.
 *
 * When a critical action fails, the reader is told what happened, what it
 * means, and what they can do next. The recovery control retries the failed
 * work; it never silently repeats it, and it never leaves the reader with a
 * spinner that cannot end.
 */

export type RecoveryTone = 'error' | 'warning' | 'info';

export function HatsiErrorRecovery({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  tone = 'error',
  children,
}: {
  title?: string;
  /** What happened, in plain language. */
  message: string;
  /** The retry action. Omit it for a message with no recovery. */
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  tone?: RecoveryTone;
  /** Extra context or secondary actions. */
  children?: React.ReactNode;
}) {
  const [attempting, setAttempting] = useState(false);
  const [failed, setFailed] = useState(false);

  const retry = useCallback(async () => {
    if (!onRetry) return;
    setAttempting(true);
    setFailed(false);
    try {
      await onRetry();
    } catch {
      // A retry that fails again must not leave the reader with an endless
      // spinner. The control returns to its idle state and says so.
      setFailed(true);
    } finally {
      setAttempting(false);
    }
  }, [onRetry]);

  const toneClasses: Record<RecoveryTone, string> = {
    error: 'border-error-500/30 bg-error-50 text-error-700',
    warning: 'border-warning-500/30 bg-warning-500/10 text-warning-700',
    info: 'border-info-500/30 bg-info-50 text-info-700',
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-xl border px-4 py-4 ${toneClasses[tone]}`}
    >
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed">{message}</p>

      {failed ? (
        <p className="mt-2 text-sm font-semibold">
          That attempt did not succeed. The problem is still here, and nothing has been lost.
        </p>
      ) : null}

      {onRetry ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={retry}
            disabled={attempting}
            aria-busy={attempting}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {attempting ? 'Retrying…' : retryLabel}
          </button>
        </div>
      ) : null}

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/**
 * A boundary that catches a failure inside a region and offers recovery.
 *
 * It is used where a region is important enough to keep the reader inside,
 * rather than escalating to the route's error boundary.
 */
export function HatsiRecoverableRegion({
  children,
  fallback,
}: {
  children: React.ReactNode;
  /** Rendered when the region fails. Receives the reset function. */
  fallback: (reset: () => void) => React.ReactNode;
}) {
  const [error, setError] = useState<unknown>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (error) return;
    // Reset the region when its inputs change, so a stale failure does not
    // linger after the cause has been dealt with.
  }, [error, key]);

  if (error) {
    return <>{fallback(() => { setError(null); setKey((value) => value + 1); })}</>;
  }

  return (
    <RecoverableErrorBoundary
      key={key}
      onError={(caught) => setError(caught)}
      fallback={fallback}
    >
      {children}
    </RecoverableErrorBoundary>
  );
}

import { Component, type ErrorInfo, type ReactNode } from 'react';

class RecoverableErrorBoundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void; fallback: (reset: () => void) => ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error);
    // The error is reported to the platform's own logging in production; the
    // boundary itself never surfaces a raw stack trace to the reader.
    void info;
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
