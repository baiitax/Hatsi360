'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  Wheat,
  BarChart3,
  FileText,
  Star,
  Bell,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Navigation Configuration ──────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  entitlement?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Market Intelligence',
    items: [
      { label: 'Analytics', href: '/client/analytics', icon: BarChart3 },
      { label: 'Watchlists', href: '/client/watchlists', icon: Star, entitlement: 'watchlists' },
      { label: 'Price Alerts', href: '/client/alerts', icon: Bell, entitlement: 'alerts' },
    ],
  },
  {
    title: 'Commodity Intelligence',
    items: [
      { label: 'Commodities', href: '/client/commodities', icon: Wheat },
      { label: 'Markets', href: '/client/markets', icon: LineChart },
    ],
  },
  {
    title: 'Research & Reports',
    items: [
      { label: 'Reports', href: '/client/research', icon: FileText },
      { label: 'Notifications', href: '/client/notifications', icon: Bell },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/client/account', icon: Settings },
      { label: 'Subscription', href: '/client/subscription', icon: CreditCard },
    ],
  },
];

// ─── Sidebar Widths ────────────────────────────────────────────────────────

const EXPANDED_WIDTH = 272;
const COLLAPSED_WIDTH = 72;

// ─── Tooltip Component ─────────────────────────────────────────────────────

function SidebarTooltip({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#17241F] text-white text-xs font-medium rounded-md whitespace-nowrap z-[100] pointer-events-none shadow-lg">
      {text}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#17241F]" />
    </div>
  );
}

// ─── Main Sidebar Component ────────────────────────────────────────────────

interface PremiumSidebarProps {
  userEntitlements: string[];
  userName?: string;
  userRole?: string;
}

export function PremiumSidebar({ userEntitlements, userName, userRole }: PremiumSidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hatsi360-sidebar-collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  // Save collapsed state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hatsi360-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Check if item is active (exact match or prefix for nested routes)
  const isActive = (href: string) => {
    if (href === '/client') return pathname === '/client';
    return pathname.startsWith(href);
  };

  // Check if user has entitlement
  const hasAccess = (item: NavItem) => {
    if (!item.entitlement) return true;
    return userEntitlements.includes(item.entitlement);
  };

  // Filter visible items
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(hasAccess),
  })).filter((section) => section.items.length > 0);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // ─── Navigation Link ───────────────────────────────────────────────────

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const isHovered = hoveredItem === item.href;

    return (
      <Link
        href={item.href}
        className={`group relative flex items-center rounded-lg transition-all duration-150 ${
          isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
        } ${
          active
            ? 'bg-[#1D805A] text-white shadow-sm'
            : 'text-[#E3EAE5]/80 hover:bg-white/[0.08] hover:text-white'
        }`}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
        {!isCollapsed && (
          <span className="ml-3 text-sm font-medium truncate">{item.label}</span>
        )}
        {active && !isCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#C7A45A] rounded-r-full" />
        )}
        {/* Tooltip when collapsed */}
        {isCollapsed && (
          <SidebarTooltip text={item.label} visible={isHovered} />
        )}
      </Link>
    );
  };

  // ─── Mobile Navigation Link ────────────────────────────────────────────

  const MobileNavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 ${
          active
            ? 'bg-[#1D805A] text-white'
            : 'text-[#E3EAE5]/80 hover:bg-white/[0.08] hover:text-white'
        }`}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="ml-3 text-sm font-medium">{item.label}</span>
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#C7A45A] rounded-r-full" />
        )}
      </Link>
    );
  };

  // ─── Sidebar Content ───────────────────────────────────────────────────

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className={`flex items-center border-b border-white/[0.08] ${isCollapsed && !isMobile ? 'justify-center px-2 h-16' : 'px-4 h-16'}`}>
        <Link href="/client" className="flex items-center min-w-0">
          <img
            src="/brand/hatsi360-logo-horizontal-light.png"
            alt="Hatsi360"
            className={`h-8 ${isCollapsed && !isMobile ? 'w-8 object-contain' : 'w-auto object-contain'}`}
          />
        </Link>
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-2 text-white/60 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.title}>
            {(!isCollapsed || isMobile) && (
              <h3 className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) =>
                isMobile ? (
                  <MobileNavLink key={item.href} item={item} />
                ) : (
                  <NavLink key={item.href} item={item} />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/[0.08] ${isCollapsed && !isMobile ? 'px-2 py-3' : 'px-4 py-3'}`}>
        {/* User info (hidden when collapsed) */}
        {(!isCollapsed || isMobile) && userName && (
          <div className="mb-3 px-3">
            <p className="text-xs font-medium text-white/80 truncate">{userName}</p>
            {userRole && (
              <p className="text-[10px] text-white/40 capitalize">{userRole.replace('_', ' ')}</p>
            )}
          </div>
        )}

        {/* Help & Sign Out */}
        <div className={`flex ${isCollapsed && !isMobile ? 'flex-col items-center gap-1' : 'items-center justify-between'}`}>
          {!isMobile && (
            <button
              onClick={toggleCollapse}
              className="p-2 text-white/40 hover:text-white/80 hover:bg-white/[0.08] rounded-lg transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className={`p-2 text-white/40 hover:text-red-400 hover:bg-white/[0.08] rounded-lg transition-colors ${isCollapsed && !isMobile ? '' : ''}`}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────

  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <>
      {/* Mobile Menu Button — rendered in header, not here */}

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen bg-[#0B2A20] border-r border-white/[0.06] flex-shrink-0 transition-all duration-200 ease-in-out sticky top-0"
        style={{ width: sidebarWidth }}
        role="navigation"
        aria-label="Main navigation"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-[999] w-[280px] bg-[#0B2A20] transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <SidebarContent isMobile />
      </aside>

      {/* Expose mobile toggle via custom event */}
      <MobileToggleDispatcher onToggle={() => setMobileOpen((p) => !p)} />
    </>
  );
}

// ─── Mobile Toggle Dispatcher ──────────────────────────────────────────────
// Uses a custom event so the header can trigger mobile sidebar open

function MobileToggleDispatcher({ onToggle }: { onToggle: () => void }) {
  useEffect(() => {
    const handler = () => onToggle();
    window.addEventListener('hatsi360:toggle-sidebar', handler);
    return () => window.removeEventListener('hatsi360:toggle-sidebar', handler);
  }, [onToggle]);
  return null;
}

export { EXPANDED_WIDTH, COLLAPSED_WIDTH };
