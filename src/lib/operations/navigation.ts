import type { UserRole } from '@/types/domain';

/**
 * Pluck Live — the admin console navigation.
 *
 * Two rules decide what appears here:
 *
 *  1. Only modules that are actually implemented are listed. There is no
 *     "coming soon" entry and no link to a screen that does not exist.
 *  2. Only the modules a role may open are listed for that role.
 *
 * The navigation is a convenience. The server guard and the database policies
 * are the control; a role that forges a URL still gets nothing.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** The roles that may open this module. */
  roles: UserRole[];
  /** The badge counter key, if the module shows a live count. */
  badge?: 'pendingVerification' | 'openTasks' | 'qualityFlags';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Control',
    items: [
      {
        href: '/admin/overview',
        label: 'Overview',
        icon: '◧',
        roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
      },
      {
        href: '/admin/search',
        label: 'Search',
        icon: '⌕',
        roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        href: '/admin/verification',
        label: 'Verification queue',
        icon: '✓',
        roles: ['verification_officer', 'market_supervisor', 'admin', 'super_admin'],
        badge: 'pendingVerification',
      },
      {
        href: '/admin/observations',
        label: 'Observation directory',
        icon: '≡',
        roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
      },
      {
        href: '/admin/quality',
        label: 'Data quality',
        icon: '⚑',
        roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
        badge: 'qualityFlags',
      },
      {
        href: '/admin/tasks',
        label: 'Collection tasks',
        icon: '☑',
        roles: ['market_supervisor', 'analyst', 'admin', 'super_admin'],
        badge: 'openTasks',
      },
      {
        href: '/admin/agents',
        label: 'Agents',
        icon: '☺',
        roles: ['market_supervisor', 'admin', 'super_admin'],
      },
      {
        href: '/admin/markets',
        label: 'Markets',
        icon: '⌂',
        roles: ['market_supervisor', 'analyst', 'admin', 'super_admin'],
      },
      {
        href: '/admin/schedule',
        label: 'Collection plan',
        icon: '◷',
        roles: ['market_supervisor', 'admin', 'super_admin'],
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        href: '/admin/analytics',
        label: 'Analytics',
        icon: '◔',
        roles: ['analyst', 'admin', 'super_admin'],
      },
      {
        href: '/admin/reports',
        label: 'Reports & exports',
        icon: '⤓',
        roles: ['analyst', 'market_supervisor', 'admin', 'super_admin'],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        href: '/admin/notifications',
        label: 'Notifications',
        icon: '✉',
        roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
      },
      {
        href: '/admin/audit',
        label: 'Audit trail',
        icon: '⛨',
        roles: ['admin', 'super_admin'],
      },
      {
        href: '/admin/settings',
        label: 'Settings',
        icon: '⚙',
        roles: ['admin', 'super_admin'],
      },
      {
        href: '/admin/system',
        label: 'Jobs & health',
        icon: '⟳',
        roles: ['admin', 'super_admin'],
      },
    ],
  },
];

/** The navigation for one role, with no badges applied. */
export function navigationForRole(role: UserRole): NavGroup[] {
  return ADMIN_NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/** The badge counters shown next to the navigation entries. */
export interface NavBadges {
  pendingVerification?: number;
  openTasks?: number;
  qualityFlags?: number;
}

/** The navigation in the shape the shell renders. */
export interface RenderedNavGroup {
  label: string;
  items: { href: string; label: string; icon: string; badge?: number }[];
}

export function applyBadges(groups: NavGroup[], badges: NavBadges): RenderedNavGroup[] {
  return groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      badge: item.badge ? badges[item.badge] : undefined,
    })),
  }));
}
