'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * The loading context.
 *
 * It holds the number of navigations currently in flight. The global
 * indicator reads it, and each link reports into it. Keeping the count rather
 * than a boolean means two simultaneous navigations cannot switch each other
 * off.
 */

interface LoadingContextValue {
  /** How many navigations are in flight right now. */
  pending: number;
  /** Report a navigation as started. Returns a function that ends it. */
  begin: () => () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  pending: 0,
  begin: () => () => undefined,
});

export function useLoadingState(): LoadingContextValue {
  return useContext(LoadingContext);
}

export function HatsiLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0);

  const begin = useCallback(() => {
    let ended = false;
    setPending((count) => count + 1);
    return () => {
      if (ended) return;
      ended = true;
      setPending((count) => Math.max(0, count - 1));
    };
  }, []);

  const value = useMemo<LoadingContextValue>(() => ({ pending, begin }), [pending, begin]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}
