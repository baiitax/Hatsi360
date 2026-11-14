/**
 * Hatsi360 Markets — the terminal application shell.
 *
 * Environment A. This is the shell a trader, exporter, analyst or institutional
 * buyer lives in: the header bar, the module navigation, the global search, the
 * data-freshness summary, the account menu and the mobile drawer.
 *
 * The design brief is specific about what this shell is for. It optimises for
 * *useful information visible within the initial screen* — no corporate hero,
 * no oversized whitespace, no decorative section. It is a working surface.
 *
 * Four things about it are deliberate:
 *
 *  1. **The header is thin.** 3.25rem on desktop. A header that eats 5rem of a
 *     laptop screen is a header that hides a row of the watch table.
 *  2. **The freshness summary is only shown when it is backed by data.** The
 *     component takes an optional `freshness` summary and renders nothing at all
 *     when there is no observation to summarise. It never shows "Live" as a
 *     decorative label.
 *  3. **The mobile drawer is a real dialog.** It traps nothing it should not,
 *     it closes on Escape and on a backdrop click, and it is a `<dialog>`-role
 *     panel rather than a hidden div.
 *  4. **Navigation is the product's IA, not the website's.** The six modules
 *     come from `MARKET_NAV`; the full site index stays in the footer.
 *
 * This is a Server Component. The only client parts are the mobile drawer's
 * open state and the search field's controlled value, both isolated in
 * `MobileNavigation` and `SearchInput`.
 */

import Link from 'next/link';
import { BRAND, MARKET_NAV } from '@/lib/brand';
import { BrandMark } from '@/components/brand/Logo';
import { SearchInput } from '../ui/primitives';
import { IconBell, IconChevronDown, IconMenu, IconSearch, IconUser } from '../ui/icons';
import { MobileNavigation } from './MobileNavigation';

/* ---------------------------------------------------------------- the bar */

/**
 * The terminal header.
 *
 * `freshness` is the one line that says how current the platform's data is. It
 * is `null` when there is nothing published, and the header then shows the
 * coverage statement instead of a fake pulse — which is the honest thing to do
 * on a platform that has never published a price.
 */
export function TerminalHeader({
  signedIn = false,
  userEmail,
  workspaceHref = '/dashboard',
  freshness,
  coverageLine,
}: {
  signedIn?: boolean;
  userEmail?: string | null;
  workspaceHref?: string;
  freshness?: { state: string; label: string; observedAt: string | null } | null;
  coverageLine?: string;
}) {
  return (
    <header className="terminal-rail sticky top-0 z-[var(--z-header)]">
      {/* ---------------------------------------------------- the module bar */}
      <div className="flex h-[3.25rem] items-center gap-3 px-3 lg:px-4">
        {/* The mark and the product name. */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label={`${BRAND.productName} home`}
        >
          <BrandMark size={26} tone="dark" />
          <span className="hidden font-display text-[0.9375rem] font-extrabold tracking-tight text-terminal-text sm:block">
            {BRAND.productName}
          </span>
        </Link>

        {/* The six modules. */}
        <MainNavigation className="ml-2" />

        <div className="ml-auto flex items-center gap-2">
          {/* Global search. Hidden below lg, where the drawer carries it. */}
          <SearchInput
            label="Search commodities, markets and states"
            action="/prices"
            placeholder="Search commodities…"
            className="hidden w-44 xl:block"
          />

          <Link
            href="/prices"
            className="terminal-control lg:hidden"
            aria-label="Open the market watch"
          >
            <IconSearch className="size-3.5" />
          </Link>

          {signedIn ? (
            <>
              <Link href="/trade/alerts" className="terminal-control hidden sm:inline-flex" aria-label="Price alerts">
                <IconBell className="size-3.5" />
                <span className="hidden md:inline">Alerts</span>
              </Link>
              <Link href={workspaceHref} className="terminal-control">
                <IconUser className="size-3.5" />
                <span className="hidden max-w-[9rem] truncate md:inline">{userEmail ?? 'Workspace'}</span>
              </Link>
            </>
          ) : (
            <Link href="/login" className="terminal-action">
              Sign in
            </Link>
          )}

          <MobileNavigation signedIn={signedIn} userEmail={userEmail} workspaceHref={workspaceHref} />
        </div>
      </div>

      {/* ------------------------------------------------- the context strip */}
      <div className="hidden items-center gap-3 border-t border-terminal-border px-3 py-1 lg:flex">
        {freshness ? (
          <FreshnessSummary state={freshness.state} label={freshness.label} observedAt={freshness.observedAt} />
        ) : coverageLine ? (
          <p className="figure-num truncate text-[0.6875rem] text-terminal-text-muted">{coverageLine}</p>
        ) : null}

        <span aria-hidden="true" className="ml-auto h-3.5 w-px bg-terminal-border" />
        <p className="text-[0.625rem] uppercase tracking-wider text-terminal-text-muted">
          {BRAND.endorsement}
        </p>
      </div>
    </header>
  );
}

/**
 * The desktop module navigation.
 *
 * The six modules of the terminal, each a link to its landing route with a
 * disclosure beside it. This is the *terminal's* navigation — the product's
 * working IA. The full site index stays in the footer, and the site vocabulary
 * (`PRIMARY_NAV`) stays in `src/lib/brand.ts` for the metadata and the sitemap.
 *
 * Two behaviours are deliberate:
 *
 *  - The disclosure opens on hover *and* on focus-within, so it works with a
 *    keyboard and with JavaScript disabled.
 *  - The module label itself is always the landing route, so a click never
 *    depends on the menu being open.
 */
export function MainNavigation({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Market modules"
      className={`hidden min-w-0 flex-1 items-center gap-0.5 lg:flex ${className}`}
    >
      {MARKET_NAV.map((module) => (
        <ModuleLink key={module.id} module={module} />
      ))}
    </nav>
  );
}

/**
 * One module in the bar.
 *
 * A module is a link with a disclosure beside it. The disclosure opens the
 * module's destinations on hover *and* on focus-within, so it works with a
 * keyboard and without JavaScript. The link itself is the module's landing
 * route, so a click never depends on the menu being open.
 */
function ModuleLink({ module }: { module: (typeof MARKET_NAV)[number] }) {
  return (
    <div className="group/mod relative">
      <span className="flex items-center">
        <Link
          href={module.href}
          className="inline-flex h-[1.875rem] items-center rounded-l-control px-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-terminal-text-secondary transition-colors duration-150 hover:bg-terminal-interactive hover:text-terminal-text"
        >
          {module.label}
        </Link>
        {module.items.length > 0 ? (
          <button
            type="button"
            aria-haspopup="true"
            aria-label={`${module.label} destinations`}
            className="inline-flex h-[1.875rem] items-center rounded-r-control px-1 text-terminal-text-muted transition-colors duration-150 hover:bg-terminal-interactive hover:text-terminal-text"
          >
            <IconChevronDown className="size-3" />
          </button>
        ) : null}
      </span>

      {module.items.length > 0 ? (
        <div className="invisible absolute left-0 top-full z-[var(--z-header)] w-60 translate-y-1 rounded-panel border border-terminal-border bg-terminal-elevated py-1.5 opacity-0 shadow-terminal-lift transition-all duration-150 group-hover/mod:visible group-hover/mod:translate-y-0 group-hover/mod:opacity-100 group-focus-within/mod:visible group-focus-within/mod:translate-y-0 group-focus-within/mod:opacity-100">
          <p className="px-2.5 pb-1 text-[0.625rem] leading-4 text-terminal-text-muted">
            {module.summary}
          </p>
          {module.items.map((item) => (
            <Link
              key={`${module.id}-${item.label}`}
              href={item.href}
              className="block px-2.5 py-1 transition-colors hover:bg-terminal-interactive"
            >
              <span className="block text-[0.8125rem] font-medium text-terminal-text">
                {item.label}
              </span>
              {item.description ? (
                <span className="block text-[0.625rem] leading-4 text-terminal-text-muted">
                  {item.description}
                </span>
              ) : null}
            </Link>
          ))}
          {module.planned && module.planned.length > 0 ? (
            <p className="mt-1 border-t border-terminal-border px-2.5 pt-1.5 text-[0.5625rem] leading-4 text-terminal-text-muted">
              <span className="font-semibold uppercase tracking-wider">In development</span>
              <span className="ml-1">{module.planned.join(', ')}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The one-line freshness summary in the header's context strip.
 *
 * It reports the *collection* state of the most recent published observation,
 * never the state of the page. A page that loaded a second ago is not the same
 * fact as a market that was observed a second ago, and this component exists to
 * keep them apart.
 */
function FreshnessSummary({
  state,
  label,
  observedAt,
}: {
  state: string;
  label: string;
  observedAt: string | null;
}) {
  const tone =
    state === 'fresh' || state === 'today'
      ? 'text-success-700'
      : state === 'stale'
        ? 'text-warning-700'
        : 'text-terminal-text-secondary';

  return (
    <p className="flex items-center gap-1.5 text-[0.6875rem]">
      <span aria-hidden="true" className={`size-1.5 rounded-pill bg-current ${tone}`} />
      <span className={`font-semibold ${tone}`}>{label}</span>
      {observedAt ? (
        <span className="figure-num text-terminal-text-muted">
          last observation {formatMoment(observedAt)}
        </span>
      ) : null}
    </p>
  );
}

function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'at an unrecorded time';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

/* --------------------------------------------------------- the page frame */

/**
 * The page container.
 *
 * One horizontal measure for the whole terminal: full-bleed to the viewport
 * edges with a gutter that widens at `lg`. The terminal deliberately does *not*
 * use a centred 80rem column — a market table is a wide object and centring it
 * wastes the space a trader needs.
 */
export function PageContainer({
  children,
  className = '',
  width = 'wide',
}: {
  children: React.ReactNode;
  className?: string;
  /** `wide` is the terminal default; `prose` is the editorial measure. */
  width?: 'wide' | 'prose';
}) {
  return (
    <div
      className={`mx-auto w-full px-3 lg:px-4 ${
        width === 'prose' ? 'max-w-4xl' : 'max-w-[110rem]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The page header.
 *
 * A title, an optional subtitle, and an optional toolbar. The title is the page
 * in one line — no eyebrow, no marketing strapline, nothing that is not a fact
 * about the page. The toolbar holds the page's filters and actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className = '',
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 py-4 ${className}`}>
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-display text-[1.25rem] font-bold tracking-tight text-terminal-text lg:text-[1.375rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-[0.8125rem] leading-5 text-terminal-text-secondary">{description}</p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

/**
 * A section header inside a page.
 *
 * The section's own title, an optional count, and an optional action. The count
 * is the count the database holds, and it is always a real number — never a
 * rounded "many" and never omitted when it is zero.
 */
export function SectionHeader({
  title,
  count,
  action,
  href,
  className = '',
}: {
  title: string;
  count?: number;
  action?: { href: string; label: string };
  href?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 pb-2 ${className}`}>
      <h2 className="flex items-baseline gap-2 font-display text-[0.9375rem] font-bold text-terminal-text">
        {href ? (
          <Link href={href} className="underline decoration-terminal-border underline-offset-4 hover:text-harvest-300">
            {title}
          </Link>
        ) : (
          title
        )}
        {typeof count === 'number' ? (
          <span className="figure-num text-[0.6875rem] font-semibold text-terminal-text-muted">
            {count}
          </span>
        ) : null}
      </h2>
      {action ? (
        <Link href={action.href} className="terminal-control">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The shell itself.
 *
 * The header, the main region and the footer, in the terminal's own canvas. The
 * `<main>` carries `id="main"` so the skip link in the root layout has
 * somewhere to go.
 */
export function TerminalShell({
  header,
  children,
  footer,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="terminal flex min-h-screen flex-col">
      {header}
      <main id="main" className="flex-1 pb-10">
        {children}
      </main>
      {footer}
    </div>
  );
}

/** The trigger for the mobile drawer, exported for the header's own use. */
export { IconMenu as TerminalMenuTrigger };
