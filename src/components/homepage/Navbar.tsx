/**
 * Hatsi360 — Professional Navigation Bar.
 *
 * Light-themed navbar using logo color palette:
 * - Primary: #0B3D2C (deep forest green)
 * - Gold: #E5A020 (warm amber)
 * - Accent: #1A6B40 (medium green)
 *
 * Features:
 * - Sticky with backdrop blur
 * - Professional desktop dropdown menus
 * - Modern mobile drawer with smooth animations
 * - Active route indicators
 * - Integrated search
 * - Accessibility: keyboard navigation, ARIA labels
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MARKET_NAV } from '@/lib/brand';
import {
  IconBell,
  IconChevronDown,
  IconClose,
  IconMenu,
  IconSearch,
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

  // Track scroll for background opacity
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
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
            ? 'border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md'
            : 'border-b border-gray-100 bg-white'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-18">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Hatsi360 home"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#0B3D2C]">
                <span className="text-sm font-extrabold text-[#E5A020]">H</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[1.0625rem] font-extrabold leading-none tracking-tight text-[#0B3D2C]">
                  Hatsi360
                </span>
                <span className="text-[0.5625rem] font-medium uppercase tracking-widest text-gray-500">
                  Market Intelligence
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
              {MARKET_NAV.map((module) => {
                const active = isActive(module.href);
                return (
                  <div
                    key={module.id}
                    className="group/nav relative"
                    onMouseEnter={() => setActiveDropdown(module.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <Link
                      href={module.href}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
                        active
                          ? 'bg-[#0B3D2C]/5 text-[#0B3D2C]'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-[#0B3D2C]'
                      }`}
                    >
                      {module.label}
                      {module.items.length > 0 && (
                        <IconChevronDown className={`size-3 transition-transform ${activeDropdown === module.id ? 'rotate-180' : ''}`} />
                      )}
                      {active && <span className="absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-[#E5A020]" />}
                    </Link>

                    {/* Dropdown */}
                    {module.items.length > 0 && (
                      <div
                        className={`absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg transition-all ${
                          activeDropdown === module.id
                            ? 'visible translate-y-0 opacity-100'
                            : 'invisible translate-y-2 opacity-0'
                        }`}
                      >
                        <p className="px-3 pb-2 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-400">
                          {module.label}
                        </p>
                        {module.items.map((item) => (
                          <Link
                            key={item.href + item.label}
                            href={item.href}
                            className="block rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                          >
                            <span className="block text-[0.8125rem] font-medium text-[#0B3D2C]">
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="block text-[0.6875rem] text-gray-500">
                                {item.description}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Search - Desktop */}
              <button
                type="button"
                aria-label="Search commodities"
                className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[0.8125rem] text-gray-500 transition-colors hover:border-[#0B3D2C]/30 hover:bg-white lg:flex"
                onClick={() => window.location.href = '/prices'}
              >
                <IconSearch className="size-3.5" />
                <span className="text-gray-400">Search markets...</span>
                <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[0.625rem] font-medium text-gray-500">
                  ⌘K
                </span>
              </button>

              {/* Notifications */}
              {signedIn && (
                <Link
                  href="/trade/alerts"
                  aria-label="Notifications"
                  className="relative inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-[#0B3D2C]/30 hover:bg-gray-50 hover:text-[#0B3D2C]"
                >
                  <IconBell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#E5A020] text-[0.5625rem] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Account / Sign In */}
              {signedIn ? (
                <Link
                  href={workspaceHref}
                  className="hidden items-center gap-2 rounded-lg bg-[#0B3D2C] px-4 py-2 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#1A6B40] sm:inline-flex"
                >
                  <IconUser className="size-3.5" />
                  <span className="max-w-[8rem] truncate">{userEmail?.split('@')[0] ?? 'Dashboard'}</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hidden items-center gap-2 rounded-lg bg-[#0B3D2C] px-4 py-2 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#1A6B40] sm:inline-flex"
                >
                  <IconSignIn className="size-3.5" />
                  Sign In
                </Link>
              )}

              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 lg:hidden"
              >
                <IconMenu className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Freshness strip */}
        {freshness && (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-1.5 lg:px-8">
              <div className="flex items-center gap-2 text-[0.6875rem] text-gray-600">
                <span className={`size-1.5 rounded-full ${
                  freshness.state === 'fresh' || freshness.state === 'today' ? 'bg-[#4CAF50]' : 'bg-[#E5A020]'
                }`} />
                <span className="font-medium">{freshness.label}</span>
                {freshness.observedAt && (
                  <span className="text-gray-500">
                    · Last observation {new Date(freshness.observedAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close menu"
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#0B3D2C]">
                  <span className="text-sm font-extrabold text-[#E5A020]">H</span>
                </div>
                <span className="font-display text-[0.9375rem] font-extrabold text-[#0B3D2C]">
                  Hatsi360
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
              >
                <IconClose className="size-5" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-gray-100 p-4">
              <Link
                href="/prices"
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[0.8125rem] text-gray-500"
              >
                <IconSearch className="size-4" />
                Search commodities and markets
              </Link>
            </div>

            {/* Navigation */}
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {MARKET_NAV.map((module) => {
                  const active = isActive(module.href);
                  return (
                    <li key={module.id}>
                      <MobileModule module={module} active={active} pathname={pathname} />
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Drawer Footer */}
            <div className="border-t border-gray-200 p-4">
              {signedIn ? (
                <Link
                  href={workspaceHref}
                  className="flex items-center gap-2 rounded-lg bg-[#0B3D2C] px-4 py-2.5 text-[0.8125rem] font-semibold text-white"
                >
                  <IconUser className="size-4" />
                  {userEmail ?? 'Your workspace'}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3D2C] px-4 py-2.5 text-[0.8125rem] font-semibold text-white"
                >
                  <IconSignIn className="size-4" />
                  Sign In
                </Link>
              )}
              <p className="mt-3 text-center text-[0.625rem] uppercase tracking-wider text-gray-400">
                Powered by Pluck Agro
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================ Mobile Module ===== */

function MobileModule({
  module,
  active,
  pathname,
}: {
  module: (typeof MARKET_NAV)[number];
  active: boolean;
  pathname: string;
}) {
  const [expanded, setExpanded] = useState(active);

  return (
    <div className="rounded-lg border border-gray-100">
      <div className="flex items-center">
        <Link
          href={module.href}
          className={`flex-1 rounded-l-lg px-3 py-2.5 text-[0.875rem] font-semibold transition-colors ${
            active
              ? 'bg-[#0B3D2C]/5 text-[#0B3D2C]'
              : 'text-gray-800 hover:bg-gray-50'
          }`}
        >
          {module.label}
        </Link>
        {module.items.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${module.label} submenu`}
            className={`inline-flex size-9 items-center justify-center rounded-r-lg transition-colors hover:bg-gray-50 ${
              expanded ? 'text-[#0B3D2C]' : 'text-gray-400'
            }`}
          >
            <IconChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {expanded && module.items.length > 0 && (
        <ul className="border-t border-gray-100 py-1">
          {module.items.map((item) => {
            const itemActive = pathname === item.href;
            return (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  className={`block px-4 py-2 text-[0.8125rem] transition-colors ${
                    itemActive
                      ? 'bg-[#E5A020]/10 font-medium text-[#0B3D2C]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                  {item.description && (
                    <div className="text-[0.6875rem] text-gray-400">{item.description}</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
