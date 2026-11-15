'use client';

import Link from 'next/link';
import { IconBell, IconUser, IconSignOut, IconSettings, IconShieldCheck } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/client';

export function ClientHeader() {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Premium Client Portal</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Link
          href="/client/notifications"
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Notifications"
        >
          <IconBell className="w-5 h-5" />
          {/* Notification badge would go here */}
        </Link>

        {/* User Menu */}
        <div className="relative group">
          <button className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <IconUser className="w-5 h-5" />
            <span className="text-sm font-medium">Account</span>
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="py-1">
              <Link
                href="/client/account"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <IconSettings className="w-4 h-4 mr-2" />
                Profile Settings
              </Link>
              <Link
                href="/client/subscription"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <IconShieldCheck className="w-4 h-4 mr-2" />
                Subscription
              </Link>
              <hr className="my-1 border-gray-200" />
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
              >
                <IconSignOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
