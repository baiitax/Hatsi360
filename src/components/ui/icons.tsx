/**
 * Hatsi360 Markets — the icon system.
 *
 * One set, one geometry, one file. The design brief asks for a single
 * consistent icon system and names Lucide as the preferred source; this module
 * is that system, drawn to the same geometry so the two are visually
 * interchangeable (a 24×24 box, a 1.75 stroke, round caps and joins,
 * `currentColor` throughout).
 *
 * It is hand-drawn rather than installed for three reasons, all of which the
 * brief itself sets out:
 *
 *  1. **No new dependency.** The brief says not to introduce dependencies that
 *     are not needed, and the platform uses roughly a dozen icons. A package
 *     that ships a thousand to draw fifteen is the wrong trade for an
 *     application a field agent opens on a phone in a market.
 *  2. **The tree-shaking is total.** Only the icons a route imports are in
 *     that route's bundle, which is more than a package can promise once a
 *     barrel file re-exports everything.
 *  3. **The strokes inherit the type scale.** Every icon is sized in `em` and
 *     takes its colour from `currentColor`, so an icon inside a terminal label
 *     is the terminal's secondary text at the terminal's label size without
 *     being told.
 *
 * Rules that keep the set coherent:
 *
 *  - 24×24 viewBox, always. Icons are never scaled to a non-square box.
 *  - 1.75 stroke width at the default size, round caps and joins.
 *  - `currentColor` for stroke and fill, so an icon is never a fixed colour.
 *  - `aria-hidden` by default; an icon that carries meaning takes a label
 *    through the component that uses it, never through the icon itself.
 *  - Nothing decorative. If an icon does not name the thing next to it, it
 *    does not belong in the set.
 */

import type { SVGProps } from 'react';

/** The shared geometry of every icon in the set. */
const BASE = {
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Every icon takes the same props as an SVG element. */
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

/** An icon is a sized, stroked SVG that inherits its colour. */
function IconShape({ className = '', ...rest }: IconProps) {
  return <svg {...BASE} {...rest} className={`size-[1.125em] shrink-0 ${className}`} />;
}

/* ------------------------------------------------------------- navigation -- */

export function IconMarkets(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M3 20h18" />
      <path d="M5 20V9l4-3v14" />
      <path d="M13 20V4l6 3v13" />
      <path d="M5 12h4M13 8h6" />
    </IconShape>
  );
}

export function IconCommodities(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3v18" />
      <path d="M12 8c-2.5 0-4.5-1.8-4.5-4 2.5 0 4.5 1.8 4.5 4Z" />
      <path d="M12 8c2.5 0 4.5-1.8 4.5-4-2.5 0-4.5 1.8-4.5 4Z" />
      <path d="M12 14c-2.5 0-4.5-1.8-4.5-4 2.5 0 4.5 1.8 4.5 4Z" />
      <path d="M12 14c2.5 0 4.5-1.8 4.5-4-2.5 0-4.5 1.8-4.5 4Z" />
    </IconShape>
  );
}

export function IconTrade(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 7h11l-2.5-2.5M20 17H9l2.5 2.5" />
      <path d="M4 17h11l-2.5 2.5M20 7H9l2.5-2.5" />
    </IconShape>
  );
}

export function IconCharts(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 4v16h16" />
      <path d="M7 15l3.5-4 3 2.5L20 7" />
    </IconShape>
  );
}

export function IconFundamentals(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
    </IconShape>
  );
}

export function IconResearch(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M5 4h9l5 5v11H5Z" />
      <path d="M14 4v5h5" />
      <path d="M8.5 13h7M8.5 16.5h4" />
    </IconShape>
  );
}

/* ------------------------------------------------------------------ search -- */

export function IconSearch(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </IconShape>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </IconShape>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <IconShape {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </IconShape>
  );
}

export function IconSort(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M7 4v16M7 20l-3-3M7 20l3-3" />
      <path d="M17 20V4M17 4l-3 3M17 4l3 3" />
    </IconShape>
  );
}

/* --------------------------------------------------------------- movement -- */

export function IconArrowUp(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 19V5M12 5l-6 6M12 5l6 6" />
    </IconShape>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 5v14M12 19l-6-6M12 19l6-6" />
    </IconShape>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M5 12h14M19 12l-6-6M19 12l-6 6" />
    </IconShape>
  );
}

export function IconMinus(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M6 12h12" />
    </IconShape>
  );
}

/* ---------------------------------------------------------------- status -- */

export function IconVerified(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3l2.4 1.8 3-.2 1 2.8 2.3 1.9-1 2.9 1 2.9-2.3 1.9-1 2.8-3-.2L12 21l-2.4-1.8-3 .2-1-2.8L3.3 14.7l1-2.9-1-2.9L5.6 7l1-2.8 3 .2Z" />
      <path d="M8.75 12.25l2.25 2.25 4.25-4.5" />
    </IconShape>
  );
}

export function IconPending(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </IconShape>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 4.5 21 19.5H3Z" />
      <path d="M12 10v4M12 16.75v.5" />
    </IconShape>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.75v.5" />
    </IconShape>
  );
}

export function IconError(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </IconShape>
  );
}

export function IconClock(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.25l3.5 2" />
    </IconShape>
  );
}

export function IconSource(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 7.5h16M4 12h16M4 16.5h10" />
      <circle cx="18" cy="16.5" r="1.75" />
    </IconShape>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 4l16 16" />
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.3M6.5 8.3A17 17 0 0 0 3 12s4 6 9 6a9.6 9.6 0 0 0 3.4-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </IconShape>
  );
}

/* --------------------------------------------------------------- actions -- */

export function IconStar(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3.75l2.6 5.3 5.85.85-4.25 4.1 1 5.8L12 16.9l-5.2 2.9 1-5.8L3.55 9.9l5.85-.85Z" />
    </IconShape>
  );
}

export function IconBell(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 13.5 6.5 9.5Z" />
      <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
    </IconShape>
  );
}

export function IconShare(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3.5v11M12 3.5 8.5 7M12 3.5 15.5 7" />
      <path d="M5.5 10.5v8a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-8" />
    </IconShape>
  );
}

export function IconSave(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M6 4.5h12v15l-6-4-6 4Z" />
    </IconShape>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <IconShape {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
    </IconShape>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3.5v12M12 15.5l-4-4M12 15.5l4-4" />
      <path d="M4.5 18.5h15" />
    </IconShape>
  );
}

export function IconClose(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </IconShape>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconShape>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </IconShape>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </IconShape>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M14.5 6l-6 6 6 6" />
    </IconShape>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V7.5A1.5 1.5 0 0 1 6 6h4.5" />
    </IconShape>
  );
}

/* ------------------------------------------------------------------ user -- */

export function IconUser(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconShape>
  );
}

export function IconSignIn(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 8.5 13.5 12 10 15.5" />
      <path d="M13.5 12H4" />
    </IconShape>
  );
}

export function IconSignOut(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" />
      <path d="M14 8.5 17.5 12 14 15.5" />
      <path d="M17.5 12H8" />
    </IconShape>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="2.75" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.75l1.9 1.1M17.2 15.15l1.9 1.1M4.9 16.25l1.9-1.1M17.2 8.85l1.9-1.1" />
    </IconShape>
  );
}

/* --------------------------------------------------------------- surfaces -- */

export function IconHome(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
      <path d="M9.5 20.5V14h5v6.5" />
    </IconShape>
  );
}

export function IconMap(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M9 4.5 4.5 6.5v13L9 17.5l6 2 4.5-2v-13L15 6.5Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </IconShape>
  );
}

export function IconTable(props: IconProps) {
  return (
    <IconShape {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10" />
    </IconShape>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8Z" />
      <path d="M3.5 12.5 12 17l8.5-4.5" />
      <path d="M3.5 17 12 21.5 20.5 17" />
    </IconShape>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.5 2.4 3.75 5.3 3.75 8.5S14.5 18.1 12 20.5c-2.5-2.4-3.75-5.3-3.75-8.5S9.5 5.9 12 3.5Z" />
    </IconShape>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4.5V10h-5.5" />
    </IconShape>
  );
}

export function IconScale(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 4v16M6 20h12" />
      <path d="M5 8h14" />
      <path d="M5 8 2.5 14h5Z" />
      <path d="M19 8l-2.5 6h5Z" />
    </IconShape>
  );
}

export function IconBook(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h5v16H6a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M19.5 5.5A1.5 1.5 0 0 0 18 4h-5v16h5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </IconShape>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M5 12.5 9.5 17 19 7" />
    </IconShape>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconShape>
  );
}

/* ------------------------------------------------------------------ homepage -- */

export function IconLeaf(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 8.68-3.32 9-12Z" />
      <path d="M17 8c-3 0-5.5 1.5-7 4" />
    </IconShape>
  );
}

export function IconShieldCheck(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M12 3L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7Z" />
      <path d="M9.5 12.5 11.5 14.5 15 10" />
    </IconShape>
  );
}

export function IconTrendingUp(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </IconShape>
  );
}

export function IconTrendingDown(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M14 17h7v-7" />
    </IconShape>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </IconShape>
  );
}

export function IconZap(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
    </IconShape>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconShape>
  );
}

export function IconDatabase(props: IconProps) {
  return (
    <IconShape {...props}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </IconShape>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </IconShape>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <IconShape {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M12 12v3" />
      <path d="M3 12h18" />
    </IconShape>
  );
}

export function IconBookOpen(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M2 4h8a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H2Z" />
      <path d="M22 4h-8a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h8Z" />
    </IconShape>
  );
}

export function IconBarChart(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M4 20V10" />
      <path d="M9 20V4" />
      <path d="M14 20v-6" />
      <path d="M19 20V8" />
    </IconShape>
  );
}

export function IconPieChart(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10Z" />
    </IconShape>
  );
}

export function IconAward(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="12" cy="8" r="5" />
      <path d="M9 13l-3 9 6-3 6 3-3-9" />
    </IconShape>
  );
}

export function IconSend(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </IconShape>
  );
}

export function IconCode(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
    </IconShape>
  );
}

/** Triangle warning icon. */
export function IconAlertTriangle(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </IconShape>
  );
}

/** Single chart icon (alias for IconCharts). */
export function IconChart(props: IconProps) {
  return (
    <IconShape {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </IconShape>
  );
}

/** Grid layout icon. */
export function IconGrid(props: IconProps) {
  return (
    <IconShape {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </IconShape>
  );
}

/** List layout icon. */
export function IconList(props: IconProps) {
  return (
    <IconShape {...props}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </IconShape>
  );
}

/** Map pin marker icon. */
export function IconMapPin(props: IconProps) {
  return (
    <IconShape {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </IconShape>
  );
}

/** X close icon. */
export function IconX(props: IconProps) {
  return (
    <IconShape {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </IconShape>
  );
}

/** Chevron up icon. */
export function IconChevronUp(props: IconProps) {
  return (
    <IconShape {...props}>
      <polyline points="18 15 12 9 6 15" />
    </IconShape>
  );
}

/** Zoom in icon. */
export function IconZoomIn(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </IconShape>
  );
}

/** Zoom out icon. */
export function IconZoomOut(props: IconProps) {
  return (
    <IconShape {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </IconShape>
  );
}

/**
 * The registry, so a component can be handed an icon by name rather than by
 * import. Used by the terminal's navigation model, which carries an icon key
 * alongside each module.
 */
export const ICONS = {
  markets: IconMarkets,
  commodities: IconCommodities,
  trade: IconTrade,
  charts: IconCharts,
  fundamentals: IconFundamentals,
  research: IconResearch,
  search: IconSearch,
  filter: IconFilter,
  calendar: IconCalendar,
  sort: IconSort,
  arrowUp: IconArrowUp,
  arrowDown: IconArrowDown,
  arrowRight: IconArrowRight,
  minus: IconMinus,
  verified: IconVerified,
  pending: IconPending,
  alert: IconAlert,
  info: IconInfo,
  error: IconError,
  clock: IconClock,
  source: IconSource,
  eyeOff: IconEyeOff,
  star: IconStar,
  bell: IconBell,
  share: IconShare,
  save: IconSave,
  copy: IconCopy,
  download: IconDownload,
  close: IconClose,
  alertTriangle: IconAlertTriangle,
  chart: IconChart,
  grid: IconGrid,
  list: IconList,
  mapPin: IconMapPin,
  x: IconX,
  chevronUp: IconChevronUp,
  zoomIn: IconZoomIn,
  zoomOut: IconZoomOut,
  menu: IconMenu,
  chevronDown: IconChevronDown,
  chevronRight: IconChevronRight,
  chevronLeft: IconChevronLeft,
  external: IconExternal,
  user: IconUser,
  signIn: IconSignIn,
  signOut: IconSignOut,
  settings: IconSettings,
  home: IconHome,
  map: IconMap,
  table: IconTable,
  layers: IconLayers,
  globe: IconGlobe,
  refresh: IconRefresh,
  scale: IconScale,
  book: IconBook,
  check: IconCheck,
  plus: IconPlus,
  leaf: IconLeaf,
  shieldCheck: IconShieldCheck,
  trendingUp: IconTrendingUp,
  trendingDown: IconTrendingDown,
  activity: IconActivity,
  zap: IconZap,
  users: IconUsers,
  database: IconDatabase,
  target: IconTarget,
  briefcase: IconBriefcase,
  bookOpen: IconBookOpen,
  barChart: IconBarChart,
  pieChart: IconPieChart,
  award: IconAward,
  send: IconSend,
  code: IconCode,
} as const;

/** The name of an icon in the registry. */
export type IconName = keyof typeof ICONS;

/** Render a registered icon by name. */
export function Icon({ name, ...rest }: { name: IconName } & IconProps) {
  const Component = ICONS[name];
  return <Component {...rest} />;
}
