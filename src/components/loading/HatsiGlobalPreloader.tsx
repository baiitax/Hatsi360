import { BRAND } from '@/lib/brand';
import { HatsiBootRecovery } from './HatsiBootRecovery';

/**
 * The application-level preloader.
 *
 * This is a **boot curtain**, not a spinner over the page. It is rendered by
 * the server as part of the document, so it appears in the first paint
 * without waiting for JavaScript, and it is dismissed by a signal from the
 * client only once the application has genuinely hydrated and painted.
 *
 * The rules it obeys, and why:
 *
 *  - It never hides on a timer. The curtain is dismissed when the app says it
 *    is ready, and not before.
 *  - It never blocks usable content. The page beneath it is fully
 *    server-rendered and readable; the curtain is an overlay, and a recovery
 *    control reveals the page if the application never signals readiness.
 *  - It never flickers on a fast connection. The curtain starts hidden and is
 *    only raised if the application is still starting after a short grace
 *    period, so a quick load shows no curtain at all.
 *  - It never loops forever. A watchdog offers a retry and a way through if
 *    readiness never arrives.
 *
 * The root layout stays a server component: the curtain is plain markup and
 * one small inline script, and the readiness signal comes from a separate
 * client component.
 */

/** The grace period before the curtain is raised. */
const REVEAL_DELAY_MS = 250;

/** How long the curtain waits before offering recovery. */
const WATCHDOG_MS = 10_000;

/**
 * The boot script.
 *
 * It is inline and synchronous, so it runs while the document is still being
 * parsed and before the first paint. It never touches the network and never
 * depends on a bundle being ready.
 */
const BOOT_SCRIPT = `
(function () {
  var root = document.documentElement;
  root.setAttribute('data-hatsi-boot', 'pending');

  var timer = null;
  var watchdog = null;
  var raised = false;

  function curtain() {
    return document.getElementById('hatsi-boot-curtain');
  }

  function reveal() {
    if (raised) return;
    raised = true;
    var el = curtain();
    if (!el) return;
    el.setAttribute('data-state', 'visible');
    el.removeAttribute('aria-hidden');
    watchdog = window.setTimeout(showRecovery, ${WATCHDOG_MS});
  }

  function showRecovery() {
    var el = curtain();
    if (!el) return;
    var panel = el.querySelector('[data-boot-recovery]');
    if (panel) panel.removeAttribute('hidden');
  }

  function dismiss(reason) {
    if (timer) window.clearTimeout(timer);
    if (watchdog) window.clearTimeout(watchdog);
    var el = curtain();
    if (!el) {
      root.setAttribute('data-hatsi-boot', 'ready');
      return;
    }
    el.setAttribute('data-state', 'leaving');
    window.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      root.setAttribute('data-hatsi-boot', 'ready');
      root.setAttribute('data-hatsi-boot-reason', reason || 'ready');
    }, 260);
  }

  window.__hatsiBoot = {
    ready: function () { dismiss('ready'); },
    failed: function (reason) { dismiss(reason || 'failed'); },
    reveal: reveal
  };

  // The curtain is only raised if the application is still starting.
  timer = window.setTimeout(reveal, ${REVEAL_DELAY_MS});

  // If the document never finishes loading, the page is still server-rendered
  // and usable, so the curtain steps aside rather than trapping the reader.
  window.addEventListener('load', function () {
    if (root.getAttribute('data-hatsi-boot') === 'pending') {
      window.setTimeout(function () {
        if (root.getAttribute('data-hatsi-boot') === 'pending') reveal();
      }, ${REVEAL_DELAY_MS});
    }
  });
})();
`.trim();

export function HatsiGlobalPreloader() {
  return (
    <>
      {/* The boot script runs before the first paint. */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }}
      />
      {/*
        The curtain itself. It is server-rendered, so it costs no client
        JavaScript and it is present in the very first paint.
      */}
      <div
        id="hatsi-boot-curtain"
        data-state="hidden"
        aria-hidden="true"
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="hatsi-boot"
      >
        <div className="hatsi-boot__inner">
          <div className="hatsi-boot__mark">
            {/* The official mark, reversed for the deep green surface. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hatsi360-mark-light.png"
              alt=""
              width={56}
              height={54}
              className="hatsi-boot__logo"
              decoding="async"
            />
            <svg
              className="hatsi-boot__ring"
              viewBox="0 0 120 120"
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(213,164,65,0.18)"
                strokeWidth="2"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#D5A441"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="96 244"
                className="hatsi-boot__arc"
              />
            </svg>
          </div>

          <p className="hatsi-boot__title">{BRAND.name}</p>
          <p className="hatsi-boot__message" data-boot-message>
            Connecting to agricultural intelligence&hellip;
          </p>
          <div className="hatsi-boot__bar" aria-hidden="true">
            <span className="hatsi-boot__bar-fill" />
          </div>

          {/*
            The recovery panel. It appears only if the application has not
            signalled readiness, so a reader is never left staring at an
            indefinite loader.
          */}
          <div data-boot-recovery hidden className="hatsi-boot__recovery">
            <HatsiBootRecovery />
          </div>
        </div>
      </div>
    </>
  );
}
