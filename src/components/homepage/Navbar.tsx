/**
 * Hatsi360 — Refined Professional Navigation Bar.
 *
 * Clean, minimal, enterprise-grade navigation experience.
 *
 * Brand Colors:
 * - Forest Green: #103C2D
 * - Primary Green: #1D805A
 * - Deep Green: #0B2A20
 * - Gold: #C7A45A (subtle accents only)
 *
 * Features:
 * - Sticky with refined scroll behavior
 * - Simplified navigation structure (5 items)
 * - Professional desktop dropdowns
 * - Accessible mobile drawer
 * - Keyboard navigation support
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconBell,
  IconChevronDown,
  IconClose,
  IconMenu,
  IconSignIn,
  IconUser,
} from '../ui/icons';

export interface NavbarProps {
  signedIn?: boolean;
  userEmail?: string | null;
  workspaceHref?: string;
  unreadCount?: number;
  freshness?: { state: string; label: string; observedAt: string | null } | null;
}

// Simplified navigation structure
const NAV_ITEMS = [
  {
    id: 'markets',
    label: 'Markets',
    href: '/markets',
    items: [
      { href: '/markets', label: 'Market Overview' },
      { href: '/prices', label: 'Live Market Watch' },
      { href: '/compare', label: 'Market Comparisons' },
    ],
  },
  {
    id: 'commodities',
    label: 'Commodities',
    href: '/commodities',
    items: [
      { href: '/commodities', label: 'Commodity Directory' },
      { href: '/prices', label: 'Historical Prices' },
    ],
  },
  {
    id: 'trade',
    label: 'Trade Intelligence',
    href: '/trade',
    items: [
      { href: '/trade', label: 'Trade Overview' },
      { href: '/trade/best-buy', label: 'Sourcing Intelligence' },
      { href: '/trade/best-sell', label: 'Procurement Intelligence' },
      { href: '/trade/terminal', label: 'Trade Terminal' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    href: '/insights',
    items: [
      { href: '/insights', label: 'Market Briefs' },
      { href: '/reports', label: 'Research Reports' },
    ],
  },
  {
    id: 'about',
    label: 'About',
    href: '/about',
    items: [],
  },
];

/* ============================================================ Navbar ===== */

export function Navbar({
  signedIn = false,
  userEmail,
  workspaceHref = '/dashboard',
  unreadCount = 0,
  freshness,
}: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Track scroll for background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[#E3EAE5] bg-white shadow-sm'
            : 'border-b border-[#E3EAE5] bg-white'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-[72px]">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center flex-shrink-0"
              aria-label="Hatsi360 home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hatsi360-lockup-full.png"
                alt="Hatsi360"
                width={2075}
                height={758}
                className="h-auto w-28 sm:w-32 lg:w-36"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const hasItems = item.items.length > 0;

                return (
                  <div
                    key={item.id}
                    className="group relative"
                    onMouseEnter={() => hasItems && setActiveDropdown(item.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <Link
                      href={item.href}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'text-[#103C2D]'
                          : 'text-[#64736B] hover:text-[#103C2D]'
                      }`}
                      aria-expanded={hasItems && activeDropdown === item.id}
                    >
                      {item.label}
                      {hasItems && (
                        <IconChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            activeDropdown === item.id ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </Link>

                    {/* Active indicator */}
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#1D805A]" />
                    )}

                    {/* Dropdown */}
                    {hasItems && (
                      <div
                        className={`absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border border-[#E3EAE5] bg-white py-1 shadow-lg transition-all ${
                          activeDropdown === item.id
                            ? 'visible translate-y-0 opacity-100'
                            : 'invisible translate-y-1 opacity-0'
                        }`}
                      >
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href + subItem.label}
                            href={subItem.href}
                            className="block px-4 py-2 text-sm text-[#64736B] transition-colors hover:bg-[#F7F9F7] hover:text-[#103C2D]"
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              {signedIn && unreadCount > 0 && (
                <Link
                  href="/trade/alerts"
                  aria-label="Notifications"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#64736B] transition-colors hover:bg-[#F7F9F7] hover:text-[#103C2D]"
                >
                  <IconBell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C7A45A] text-[0.625rem] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </Link>
              )}

              {/* Account / Sign In */}
              {signedIn ? (
                <Link
                  href={workspaceHref}
                  className="hidden items-center gap-2 rounded-lg bg-[#1D805A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#103C2D] sm:inline-flex"
                >
                  <IconUser className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">
                    {userEmail?.split('@')[0] ?? 'Dashboard'}
                  </span>
                </Link>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link
                    href="/login"
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-[#103C2D] transition-colors hover:bg-[#F7F9F7]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg bg-[#1D805A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#103C2D]"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#17241F] transition-colors hover:bg-[#F7F9F7] lg:hidden"
              >
                <IconMenu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close menu"
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#E3EAE5] px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/hatsi360-lockup-full.png"
                alt="Hatsi360"
                width={2075}
                height={758}
                className="h-auto w-28 sm:w-32"
              />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64736B] transition-colors hover:bg-[#F7F9F7]"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <MobileNavItem
                    key={item.id}
                    item={item}
                    active={isActive(item.href)}
                    pathname={pathname}
                  />
                ))}
              </ul>
            </nav>

            {/* Drawer Footer */}
            <div className="border-t border-[#E3EAE5] p-4">
              {signedIn ? (
                <Link
                  href={workspaceHref}
                  className="flex items-center gap-2 rounded-lg bg-[#1D805A] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <IconUser className="h-4 w-4" />
                  {userEmail ?? 'Your workspace'}
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#E3EAE5] px-4 py-2.5 text-sm font-semibold text-[#103C2D]"
                  >
                    <IconSignIn className="h-4 w-4" />
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#1D805A] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================ Mobile Nav Item ===== */

function MobileNavItem({
  item,
  active,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState(active);

  return (
    <li className="rounded-lg border border-[#E3EAE5]">
      <div className="flex items-center">
        <Link
          href={item.href}
          className={`flex-1 rounded-l-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            active
              ? 'bg-[#EAF4EE] text-[#103C2D]'
              : 'text-[#17241F] hover:bg-[#F7F9F7]'
          }`}
        >
          {item.label}
        </Link>
        {item.items.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${item.label} submenu`}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors hover:bg-[#F7F9F7] ${
              expanded ? 'text-[#103C2D]' : 'text-[#64736B]'
            }`}
          >
            <IconChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      {expanded && item.items.length > 0 && (
        <ul className="border-t border-[#E3EAE5] py-1">
          {item.items.map((subItem) => {
            const subActive = pathname === subItem.href;
            return (
              <li key={subItem.href + subItem.label}>
                <Link
                  href={subItem.href}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    subActive
                      ? 'bg-[#EAF4EE] font-medium text-[#103C2D]'
                      : 'text-[#64736B] hover:bg-[#F7F9F7]'
                  }`}
                >
                  {subItem.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
