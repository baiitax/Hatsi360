'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Pluck Live — the market agent shell.
 *
 * Deliberately different from the admin console: a single column, large
 * touch targets, a bottom navigation bar that stays within thumb reach, and
 * as little typing as the work allows. The agent app is used on a phone, in
 * the sun, on a weak network.
 */

export interface AgentNavItem {
  href: string;
  label: string;
  icon: string;
}

export interface AgentShellProps {
  items: AgentNavItem[];
  userName: string;
  unreadCount: number;
  pendingCount: number;
  children: ReactNode;
}

export function AgentShell({
  items,
  userName,
  unreadCount,
  pendingCount,
  children,
}: AgentShellProps) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/agent/home" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-brand-700 text-sm font-black text-white"
            >
              PL
            </span>
            <span className="text-sm font-bold leading-tight text-brand-900">
              Pluck Live
              <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-400">
                Field collection
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {!online ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                Offline
              </span>
            ) : null}
            <Link
              href="/agent/notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              className="relative rounded-lg border border-ink-200 bg-white p-2 text-ink-700"
            >
              <span aria-hidden="true">🔔</span>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav
        aria-label="Agent sections"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/98 backdrop-blur"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-semibold ${
                    active ? 'text-brand-700' : 'text-ink-500'
                  }`}
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <footer className="mx-auto w-full max-w-lg px-4 pb-6 text-center text-[11px] text-ink-400">
        Signed in as {userName}
        {pendingCount > 0 ? (
          <span className="ml-1 font-semibold text-amber-700">
            · {pendingCount} price(s) waiting to sync
          </span>
        ) : null}
      </footer>
    </div>
  );
}
