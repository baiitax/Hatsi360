'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';
import { NotificationCenter } from '@/components/site/navigation';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  IconHome,
  IconCheck,
  IconPlus,
  IconList,
  IconUser,
} from '@/components/ui/icons';

/**
 * Hatsi360 — the market agent shell.
 *
 * Deliberately different from the admin console: a single column, large
 * touch targets, a bottom navigation bar that stays within thumb reach, and
 * as little typing as the work allows. The agent app is used on a phone, in
 * the sun, on a weak network.
 *
 * Phase B: Replaced emoji icons with proper SVG icons, enhanced brand identity.
 */

export interface AgentNavItem {
  href: string;
  label: string;
  icon: string; // Kept for backwards compatibility, but now uses SVG mapping
}

export interface AgentShellProps {
  items: AgentNavItem[];
  userName: string;
  unreadCount: number;
  /** Tasks that are due today. The label says so, rather than implying a sync. */
  dueCount: number;
  children: ReactNode;
}

/** Map emoji icons to proper SVG components for professional appearance */
function getIconComponent(emoji: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    '⌂': IconHome,
    '☑': IconCheck,
    '＋': IconPlus,
    '≡': IconList,
    '☺': IconUser,
  };
  return iconMap[emoji] || IconHome;
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
      {/* Enhanced header with better brand presentation */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href="/agent/home"
            className="flex items-center gap-2.5"
            aria-label={`${BRAND.name} ${BRAND.surfaces.fieldApp}`}
          >
            <BrandMark size={40} tone="light" />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-brand-900">
                {BRAND.name}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                Field Operations
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {!online ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning-200 bg-warning-50 px-2.5 py-1 text-[11px] font-semibold text-warning-700">
                <span className="size-1.5 rounded-full bg-warning-500" />
                Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                <span className="size-1.5 rounded-full bg-brand-500" />
                Online
              </span>
            )}
            <NotificationCenter
              href="/agent/notifications"
              unreadCount={unreadCount}
              label="Alerts"
              className="border border-ink-200 bg-white"
            />
          </div>
        </div>

        {/* Due today indicator */}
        {dueCount > 0 && (
          <div className="border-t border-warning-100 bg-warning-50/50 px-4 py-1.5">
            <p className="text-center text-[11px] font-semibold text-warning-700">
              {dueCount} task{dueCount === 1 ? '' : 's'} due today
            </p>
          </div>
        )}
      </header>

      {/* Main content with better spacing */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-5">{children}</main>

      {/* Enhanced bottom navigation with SVG icons */}
      <nav
        aria-label="Agent sections"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/98 backdrop-blur-md"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((item) => {
            const active = isActive(item.href);
            const IconComponent = getIconComponent(item.icon);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 px-2 py-3 transition-colors ${
                    active
                      ? 'text-brand-700'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  <IconComponent
                    className={`h-5 w-5 ${active ? 'text-brand-700' : 'text-ink-500'}`}
                  />
                  <span className={`text-[10px] font-semibold ${active ? 'text-brand-700' : 'text-ink-500'}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
