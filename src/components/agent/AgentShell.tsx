'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';
import { NotificationCenter } from '@/components/site/navigation';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Hatsi360 — the market agent shell.
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
  /** Tasks that are due today. The label says so, rather than implying a sync. */
  dueCount: number;
  children: ReactNode;
}

export function AgentShell({
  items,
  userName,
  unreadCount,
  dueCount,
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
          <Link
            href="/agent/home"
            className="flex items-center gap-2"
            aria-label={`${BRAND.name} ${BRAND.surfaces.fieldApp}`}
          >
            <BrandMark size={36} />
            <span className="text-sm font-bold leading-tight text-brand-900">
              {BRAND.name}
              <span className="block text-[11px] font-medium uppercase tracking-wide text-brand-600">
                Field
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {!online ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                Offline
              </span>
            ) : null}
            <NotificationCenter
              href="/agent/notifications"
              unreadCount={unreadCount}
              label="Alerts"
              className="border border-ink-200 bg-white"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav
        aria-label="Agent sections"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/98 backdrop-blur"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
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
        {dueCount > 0 ? (
          <span className="ml-1 font-semibold text-amber-700">
            · {dueCount} task(s) due today
          </span>
        ) : null}
      </footer>
    </div>
  );
}
