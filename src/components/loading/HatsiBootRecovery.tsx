'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The boot curtain's recovery controls.
 *
 * They appear only if the application has not signalled readiness, so a
 * reader is never left looking at an indefinite loader. "Try again" reloads
 * the document; "Continue to the page" steps the curtain aside, because the
 * page underneath it is server-rendered and already readable.
 */

interface HatsiBootWindow {
  __hatsiBoot?: {
    ready: () => void;
    failed: (reason?: string) => void;
    reveal: () => void;
  };
}

export function HatsiBootRecovery() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = document.querySelector('[data-boot-recovery]');
    if (!element) return;
    // The script that shows the panel is inline and runs before hydration,
    // so the panel can already be visible by the time this component mounts.
    if (!element.hasAttribute('hidden')) {
      setVisible(true);
      return;
    }
    const observer = new MutationObserver(() => {
      if (!element.hasAttribute('hidden')) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ['hidden'] });
    return () => observer.disconnect();
  }, []);

  const dismiss = useCallback(() => {
    const boot = (window as unknown as HatsiBootWindow).__hatsiBoot;
    boot?.failed('dismissed');
  }, []);

  if (!visible) return null;

  return (
    <>
      <p className="hatsi-boot__recovery-text">
        This is taking longer than expected. The page below is already loaded and can be read
        now.
      </p>
      <div className="hatsi-boot__recovery-actions">
        <button
          type="button"
          className="hatsi-boot__button hatsi-boot__button--primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
        <button type="button" className="hatsi-boot__button" onClick={dismiss}>
          Continue to the page
        </button>
      </div>
    </>
  );
}
