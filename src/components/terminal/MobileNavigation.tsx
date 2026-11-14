/**
 * Hatsi360 Markets — the mobile navigation.
 *
 * A deliberate mobile interface, not a compressed desktop one.
 *
 * The brief is explicit that mobile must not be the desktop squeezed: a
 * ten-column watch table at 360px is unreadable, and a six-module nav bar with
 * dropdowns is unusable with a thumb. So the mobile terminal does three
 * different things:
 *
 *  1. **A compact branded header** with the mark, the product name, the search
 *     and the account — never the full desktop bar.
 *  2. **A drawer**, not a dropdown. It is a real dialog with `aria-modal`, it
 *     closes on Escape, on a backdrop click and on a route selection, and it
 *     carries the full module index with each module's destinations expanded.
 *  3. **A bottom bar** with the four destinations a person in a market actually
 *     needs — Markets, Commodities, Trade, Account — reachable with a thumb
 *     without opening anything.
 *
 * This is the only client component in the shell, because it is the only part
 * that holds state: whether the drawer is open.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ACCOUNT_NAV, BRAND, MARKET_NAV, SECONDARY_NAV } from '@/lib/brand';
import {
  IconBell,
  IconChevronRight,
  IconClose,
  IconHome,
  IconMarkets,
  IconMenu,
  IconSearch,
  IconSignIn,
  IconTrade,
  IconUser,
} from '../ui/icons';

/**
 * The mobile navigation: the drawer trigger, the drawer, and the bottom bar.
 */
export function MobileNavigation({
  signedIn = false,
  userEmail,
  workspaceHref = '/dashboard',
}: {
  signedIn?: boolean;
  userEmail?: string | null;
  workspaceHref?: string;
}) {
  const pathname = usePathname();

  // The drawer's open state is *derived*, not stored. It holds the route it was
  // opened on, and it is open only while the person is still on that route. A
  // route change therefore closes it by construction, with no effect and no
  // second render — and a drawer can never survive navigation to the page whose
  // destination was just tapped.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;

  // Escape closes the drawer, and the body stops scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedAt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenedAt(pathname)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open the market menu"
        className="terminal-control lg:hidden"
      >
        <IconMenu className="size-4" />
        <span className="sr-only">Menu</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[var(--z-drawer)] lg:hidden">
          <button
            type="button"
            aria-label="Close the market menu"
            onClick={() => setOpenedAt(null)}
            className="absolute inset-0 cursor-default bg-brand-950/70"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Market menu"
            className="terminal absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col border-l border-terminal-border bg-terminal-surface shadow-terminal-lift"
          >
            <header className="flex items-center justify-between gap-2 border-b border-terminal-border px-3 py-2.5">
              <p className="font-display text-[0.8125rem] font-bold text-terminal-text">
                {BRAND.productName}
              </p>
              <button
                type="button"
                onClick={() => setOpenedAt(null)}
                aria-label="Close the market menu"
                className="terminal-control"
              >
                <IconClose className="size-3.5" />
              </button>
            </header>

            <div className="border-b border-terminal-border p-3">
              <Link href="/prices" className="terminal-control w-full justify-start">
                <IconSearch className="size-3.5" />
                Search commodities and markets
              </Link>
            </div>

            <nav aria-label="Market modules" className="flex-1 overflow-y-auto p-2">
              <ul className="flex flex-col gap-0.5">
                {MARKET_NAV.map((module) => (
                  <li key={module.id}>
                    <ModuleGroup module={module} />
                  </li>
                ))}
              </ul>

              <p className="figure-label px-2 pb-1 pt-4">More</p>
              <ul className="flex flex-col gap-0.5">
                {SECONDARY_NAV.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-[2.25rem] items-center rounded-control px-2 text-[0.8125rem] text-terminal-text-secondary transition-colors hover:bg-terminal-interactive hover:text-terminal-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <footer className="border-t border-terminal-border p-3">
              {signedIn ? (
                <Link href={workspaceHref} className="terminal-action w-full">
                  <IconUser className="size-3.5" />
                  {userEmail ?? 'Your workspace'}
                </Link>
              ) : (
                <Link href="/login" className="terminal-action w-full">
                  <IconSignIn className="size-3.5" />
                  Sign in
                </Link>
              )}
              <p className="pt-2 text-center text-[0.5625rem] uppercase tracking-wider text-terminal-text-muted">
                {BRAND.endorsement}
              </p>
            </footer>
          </div>
        </div>
      ) : null}

      {/* The bottom bar. Four destinations, thumb-reachable, always visible. */}
      <nav
        aria-label="Primary market destinations"
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] mx-auto flex max-w-lg items-stretch border-t border-terminal-border bg-terminal-bg/95 backdrop-blur lg:hidden"
      >
        <BottomLink href="/markets" label="Markets" icon={<IconMarkets className="size-5" />} />
        <BottomLink href="/commodities" label="Commodities" icon={<IconHome className="size-5" />} />
        <BottomLink href="/trade" label="Trade" icon={<IconTrade className="size-5" />} />
        {signedIn ? (
          <BottomLink href="/trade/alerts" label="Alerts" icon={<IconBell className="size-5" />} />
        ) : (
          <BottomLink href="/login" label="Account" icon={<IconUser className="size-5" />} />
        )}
      </nav>
    </>
  );
}

/** One module in the drawer, with its destinations always expanded. */
function ModuleGroup({ module }: { module: (typeof MARKET_NAV)[number] }) {
  const pathname = usePathname();
  const active = pathname === module.href || pathname.startsWith(`${module.href}/`);

  return (
    <div className="rounded-control">
      <Link
        href={module.href}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-[2.25rem] items-center justify-between gap-2 rounded-control px-2 text-[0.8125rem] font-semibold transition-colors ${
          active
            ? 'bg-terminal-interactive text-terminal-text'
            : 'text-terminal-text hover:bg-terminal-interactive/60'
        }`}
      >
        {module.label}
        <IconChevronRight className="size-3.5 shrink-0 text-terminal-text-muted" />
      </Link>
      {module.items.length > 0 ? (
        <ul className="ml-2 border-l border-terminal-border pl-2">
          {module.items.map((item) => (
            <li key={`${module.id}-${item.label}`}>
              <Link
                href={item.href}
                className="flex min-h-[2rem] items-center rounded-control px-2 text-[0.75rem] text-terminal-text-secondary transition-colors hover:bg-terminal-interactive/60 hover:text-terminal-text"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** One entry in the bottom bar. */
function BottomLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide transition-colors ${
        active ? 'text-harvest-300' : 'text-terminal-text-muted'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/** Re-exported so the account menu can be built from the same vocabulary. */
export { ACCOUNT_NAV };
