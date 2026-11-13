/**
 * The chart palette.
 *
 * Charts are drawn with CSS custom properties rather than literal hex values,
 * so the visualisation palette is the same palette the rest of the product
 * uses and a brand change reaches the charts without touching them.
 *
 * The values resolve against the tokens declared in `src/app/globals.css`.
 */

/** A single series colour. */
export const CHART_SERIES = [
  'var(--color-brand-600)',
  'var(--color-leaf-600)',
  'var(--color-harvest-500)',
  'var(--color-earth-400)',
  'var(--color-info-500)',
  'var(--color-ink-400)',
] as const;

/** The structural colours of a chart. */
export const CHART_COLOURS = {
  /** The grid line. */
  grid: 'var(--color-ink-200)',
  /** Axis labels and tick text. */
  axis: 'var(--color-ink-500)',
  /** Stronger axis text. */
  axisStrong: 'var(--color-ink-700)',
  /** The surface behind a chart. */
  surface: 'var(--color-white)',
  /** A soft fill used for the observed range band. */
  band: 'var(--color-ink-50)',
  /** The primary series colour. */
  primary: 'var(--color-brand-600)',
  /** A deeper primary, used for emphasis. */
  primaryDeep: 'var(--color-brand-800)',
  /** Positive movement. */
  positive: 'var(--color-success-500)',
  /** Negative movement. */
  negative: 'var(--color-error-500)',
  /** Warning states, e.g. a stale record. */
  warning: 'var(--color-warning-500)',
  /** A muted series. */
  muted: 'var(--color-ink-300)',
  /** The colour of a market that is not reporting. */
  idle: 'var(--color-earth-300)',
  /** The text colour of a tooltip label. */
  tooltipText: 'var(--color-ink-700)',
} as const;

/** The colour of a coverage or status marker. */
export const STATUS_COLOURS = {
  active: 'var(--color-brand-600)',
  stale: 'var(--color-harvest-500)',
  registered: 'var(--color-earth-300)',
} as const;
