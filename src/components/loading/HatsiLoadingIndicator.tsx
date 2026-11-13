'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useLinkStatus } from 'next/link';
import { useLoadingState } from './HatsiLoadingProvider';

/**
 * The route-level loading indicator.
 *
 * A thin grain-gold bar across the top of the viewport that appears while a
 * navigation is in flight and disappears when the new route arrives. It is
 * deliberately quiet: no spinner, no overlay, no blocked scrolling, because a
 * route change in a Next.js application does not take the page away — the
 * previous view stays on screen until the next one is ready.
 *
 * The pending state comes from `useLinkStatus`, which reports the state of the
 * closest `<Link>` ancestor. The hook must sit inside a Suspense boundary, so
 * the indicator is wrapped in one.
 */

function usePendingRegistration(pending: boolean, begin: () => () => void) {
  const endRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (pending) {
      if (!endRef.current) endRef.current = begin();
      return;
    }
    endRef.current?.();
    endRef.current = null;
  }, [pending, begin]);

  useEffect(
    () => () => {
      endRef.current?.();
      endRef.current = null;
    },
    [],
  );
}

/**
 * Reports the pending state of the closest link into the shared context.
 *
 * It renders nothing on its own. The visible marks are read from the context
 * by the indicator above, so one navigation drives one bar no matter how many
 * links are involved.
 */
function LinkPendingReporter() {
  const { pending } = useLinkStatus();
  const { begin } = useLoadingState();
  usePendingRegistration(pending, begin);
  return null;
}

/**
 * The visible indicator.
 *
 * It renders nothing at all when no navigation is in flight, so it costs no
 * layout and no paint on a settled page.
 */
export function HatsiLoadingIndicator() {
  const { pending } = useLoadingState();

  return (
    <>
      <Suspense fallback={null}>
        <LinkPendingReporter />
      </Suspense>
      <div
        aria-hidden={pending === 0}
        role="status"
        aria-live="polite"
        className="hatsi-progress"
        data-state={pending > 0 ? 'active' : 'idle'}
      >
        <span className="hatsi-progress__bar" />
        <span className="sr-only">{pending > 0 ? 'Loading the next page' : ''}</span>
      </div>
    </>
  );
}

/**
 * The per-link pending mark.
 *
 * Put this inside a `<Link>` to show that particular link is being followed.
 * It is opt-in, because a navigation indicator on every link is noise. The
 * label is announced to assistive technology only while the link is pending.
 */
export function HatsiLinkIndicator({ label = 'Loading' }: { label?: string }) {
  return (
    <Suspense fallback={null}>
      <LinkPendingReporter />
      <LinkPendingLabel label={label} />
    </Suspense>
  );
}

function LinkPendingLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="hatsi-link-indicator sr-only" role="status" aria-live="polite">
      {label}
    </span>
  );
}
