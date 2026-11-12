'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';

/**
 * GonaPulse — the admin console shell.
 *
 * A collapsible sidebar, a top bar with search and the notification count,
 * and the page body. The navigation is passed in from the server, already
 * filtered to the modules this role may open and to the modules that are
 * actually implemented — nothing links to a screen that does not exist.
 */

export interface NavItem {
  href: string;
  label: string;
  /** A short glyph so the collapsed rail still reads. */
  icon: string;
  /** An optional live count, e.g. the number of prices waiting for review. */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface AdminShellProps {
  groups: NavGroup[];
  userName: string;
  userRole: string;
  unreadCount: number;
  children: ReactNode;
}

export function AdminShell({
  groups,
  userName,
  userRole,
  unreadCount,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <nav aria-label="Admin sections" className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <span aria-hidden="true" className="w-5 shrink-0 text-center text-base">
                      {item.icon}
                    </span>
                    {collapsed ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge ? (
                      <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
              <span className="text-sm font-bold text-brand-900">
                {BRAND.name} Control Centre
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-ink-500 hover:bg-ink-100"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      {/* Desktop rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-ink-200 bg-white transition-all lg:block ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-ink-200 px-4">
          <Link
            href="/admin/overview"
            className="flex items-center gap-2"
            aria-label={`${BRAND.name} ${BRAND.surfaces.controlCentre}`}
          >
            <BrandMark size={36} />
            {!collapsed ? (
              <span className="text-sm font-bold leading-tight text-brand-900">
                {BRAND.name}
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Control Centre
                </span>
              </span>
            ) : null}
          </Link>
        </div>
        {sidebar}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-3 top-20 grid size-6 place-items-center rounded-full border border-ink-200 bg-white text-xs text-ink-500 shadow-sm hover:bg-ink-100"
          aria-label={collapsed ? 'Expand the navigation' : 'Collapse the navigation'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      <div className={`transition-all ${collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>

            <form action="/admin/search" method="get" role="search" className="relative max-w-md flex-1">
              <label htmlFor="admin-search" className="sr-only">
                Search the control centre
              </label>
              <input
                id="admin-search"
                name="q"
                type="search"
                placeholder="Search agents, markets, commodities, prices…"
                className="w-full rounded-lg border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-200"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              >
                ⌕
              </span>
            </form>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/admin/notifications"
                className="relative rounded-lg border border-ink-200 bg-white p-2 text-ink-600 hover:bg-ink-100"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              >
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </Link>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-ink-900">{userName}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink-400">
                  {userRole.replace('_', ' ')}
                </p>
              </div>

              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
