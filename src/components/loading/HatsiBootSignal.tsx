'use client';

import { useEffect } from 'react';

/**
 * The readiness signal for the boot curtain.
 *
 * The curtain in `HatsiGlobalPreloader` is server-rendered markup; this
 * component is the only part of it that needs a browser. It tells the
 * curtain that the application has hydrated and painted, and the curtain
 * steps aside.
 *
 * It renders nothing. It exists purely to carry the signal, which keeps the
 * root layout a server component.
 */

interface HatsiBootWindow {
  __hatsiBoot?: {
    ready: () => void;
    failed: (reason?: string) => void;
    reveal: () => void;
  };
}

export function HatsiBootSignal() {
  useEffect(() => {
    const boot = (window as unknown as HatsiBootWindow).__hatsiBoot;
    if (!boot) return;

    // Two frames: one for React to commit, one for the browser to paint.
    let second = 0;
    let first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        boot.ready();
      });
    });

    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, []);

  return null;
}
