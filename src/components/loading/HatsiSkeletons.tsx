/**
 * The Hatsi360 skeleton set.
 *
 * A skeleton is a promise about the shape of what is coming, so these are
 * built from the same containers the real content uses. They are static
 * server components: no state, no hooks, no client JavaScript, and they
 * respect `prefers-reduced-motion` through the shared stylesheet rather than
 * through a JavaScript check.
 *
 * A skeleton is marked `aria-busy` and its decorative blocks are hidden from
 * assistive technology, so a screen reader hears the region is loading rather
 * than a stream of empty boxes.
 */

/** The shimmer block. Purely visual. */
function Block({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`hatsi-skeleton ${className}`} />;
}

/**
 * The route-level skeleton.
 *
 * It stands in for a whole page while the server component for that route
 * resolves.
 */
export function HatsiPageSkeleton({
  title = 'Loading',
  rows = 3,
}: {
  /** Announced to assistive technology while the region is loading. */
  title?: string;
  /** How many placeholder lines to show in the body block. */
  rows?: number;
}) {
  return (
    <div className="section" aria-busy="true" aria-live="polite">
      <span className="sr-only">{title}…</span>
      <div className="container-page">
        <div className="max-w-3xl">
          <Block className="hatsi-skeleton--eyebrow" />
          <Block className="hatsi-skeleton--title" />
          <Block className="hatsi-skeleton--line hatsi-skeleton--line-wide" />
          <Block className="hatsi-skeleton--line" />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="card p-5">
              <Block className="hatsi-skeleton--thumb" />
              <Block className="hatsi-skeleton--line hatsi-skeleton--line-short" />
              <Block className="hatsi-skeleton--line" />
              <Block className="hatsi-skeleton--line hatsi-skeleton--line-short" />
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-3">
          {Array.from({ length: rows }, (_, index) => (
            <Block key={index} className="hatsi-skeleton--line hatsi-skeleton--line-wide" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A skeleton for a single card in a grid. */
export function HatsiCardSkeleton({ media = true }: { media?: boolean }) {
  return (
    <div className="card flex flex-col p-5" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {media ? <Block className="hatsi-skeleton--card-media" /> : null}
      <Block className="hatsi-skeleton--line hatsi-skeleton--line-short hatsi-skeleton--mt" />
      <Block className="hatsi-skeleton--line" />
      <Block className="hatsi-skeleton--line hatsi-skeleton--line-short" />
    </div>
  );
}

/** A skeleton for a data table. */
export function HatsiTableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200" aria-busy="true">
      <span className="sr-only">Loading data…</span>
      <div className="border-b border-ink-200 bg-ink-50 px-4 py-3">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, index) => (
            <Block key={index} className="hatsi-skeleton--line hatsi-skeleton--line-short" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-ink-100">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="px-4 py-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }, (_, columnIndex) => (
                <Block
                  key={columnIndex}
                  className={
                    columnIndex === 0
                      ? 'hatsi-skeleton--line'
                      : 'hatsi-skeleton--line hatsi-skeleton--line-short'
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A skeleton for a chart panel. */
export function HatsiChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-ink-200 bg-white p-5"
      style={{ minHeight: height }}
      aria-busy="true"
    >
      <span className="sr-only">Loading chart…</span>
      <Block className="hatsi-skeleton--line hatsi-skeleton--line-short" />
      <div className="mt-6 flex h-40 items-end gap-2" aria-hidden="true">
        {[38, 62, 46, 78, 55, 70, 42, 84, 60, 52, 74, 48].map((heightPercent, index) => (
          <span
            key={index}
            className="hatsi-skeleton flex-1 rounded-t"
            style={{ height: `${heightPercent}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** A skeleton for a metric row. */
export function HatsiMetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <span className="sr-only">Loading figures…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card p-5">
          <Block className="hatsi-skeleton--line hatsi-skeleton--line-short" />
          <Block className="hatsi-skeleton--figure hatsi-skeleton--mt" />
          <Block className="hatsi-skeleton--line hatsi-skeleton--line-short hatsi-skeleton--mt" />
        </div>
      ))}
    </div>
  );
}
