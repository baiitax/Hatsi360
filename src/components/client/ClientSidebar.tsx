'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconHome, 
  IconSave,
  IconBell, 
  IconResearch,
  IconTrendingUp,
  IconBriefcase,
  IconSettings,
  IconShieldCheck,
  IconCode,
  IconUser
} from '@/components/ui/icons';
import type { SVGProps, ReactElement } from 'react';

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

interface NavItem {
  title: string;
  href: string;
  icon: IconComponent;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/client', icon: IconHome },
    ],
  },
  {
    title: 'Market Intelligence',
    items: [
      { title: 'My Watchlists', href: '/client/watchlists', icon: IconSave },
      { title: 'Price Alerts', href: '/client/alerts', icon: IconBell },
      { title: 'Saved Research', href: '/client/research', icon: IconResearch },
    ],
  },
  {
    title: 'Trade & Sourcing',
    items: [
      { title: 'Trade Overview', href: '/client/trade', icon: IconTrendingUp },
      { title: 'My RFQs', href: '/client/trade/rfqs', icon: IconBriefcase },
      { title: 'Orders', href: '/client/trade/orders', icon: IconBriefcase },
      { title: 'Suppliers', href: '/client/trade/suppliers', icon: IconUser },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Profile', href: '/client/account', icon: IconSettings },
      { title: 'Subscription', href: '/client/subscription', icon: IconShieldCheck },
      { title: 'API Keys', href: '/client/api', icon: IconCode },
    ],
  },
];

export function ClientSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/client" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#1D805A] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-gray-900">Hatsi360</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {navigation.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/client' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={
                          isActive
                            ? 'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors bg-[#EAF4EE] text-[#103C2D]'
                            : 'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-700 hover:bg-gray-100'
                        }
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="px-3 py-2 text-xs text-gray-500">
            <p className="font-medium">Premium Client Portal</p>
            <p className="mt-1">v4.0 • Stage 4</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
