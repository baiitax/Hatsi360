'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, Bell, Search, ChevronDown, User, Settings, CreditCard, LogOut, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PremiumHeaderProps {
  userName?: string;
  userAvatarUrl?: string;
  unreadNotifications?: number;
}

export function PremiumHeader({ userName, userAvatarUrl, unreadNotifications = 0 }: PremiumHeaderProps) {
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const toggleMobileSidebar = () => {
    window.dispatchEvent(new Event('hatsi360:toggle-sidebar'));
  };

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-14 bg-white border-b border-[#E3EAE5] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-[90] flex-shrink-0">
      {/* Left side: Mobile menu + Page title */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 text-[#64736B] hover:text-[#17241F] hover:bg-[#EAF4EE] rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar (desktop) */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
            <input
              type="text"
              placeholder="Search commodities, markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 lg:w-80 h-9 pl-9 pr-4 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#64736B] hover:text-[#17241F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 -ml-2 text-[#64736B] hover:text-[#17241F] hover:bg-[#EAF4EE] rounded-lg transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Right side: Notifications + User menu */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Link
          href="/client/notifications"
          className="relative p-2 text-[#64736B] hover:text-[#17241F] hover:bg-[#EAF4EE] rounded-lg transition-colors"
          aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 bg-[#C7A45A] text-white text-[10px] font-bold rounded-full">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
              dropdownOpen ? 'bg-[#EAF4EE]' : 'hover:bg-[#F7F9F7]'
            }`}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            {userAvatarUrl ? (
              <img
                src={userAvatarUrl}
                alt={userName || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-[#E3EAE5]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#103C2D] flex items-center justify-center">
                <span className="text-xs font-semibold text-white">{initials}</span>
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium text-[#17241F] max-w-[120px] truncate">
              {userName || 'Account'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#64736B] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-[#E3EAE5] shadow-lg shadow-black/[0.04] py-1.5 z-[100]">
              {/* User info */}
              <div className="px-4 py-2.5 border-b border-[#E3EAE5]">
                <p className="text-sm font-medium text-[#17241F] truncate">{userName || 'User'}</p>
                <p className="text-xs text-[#64736B] mt-0.5">Premium Client</p>
              </div>

              <div className="py-1">
                <Link
                  href="/client/account"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-[#17241F] hover:bg-[#F7F9F7] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#64736B]" />
                  Profile Settings
                </Link>
                <Link
                  href="/client/subscription"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-[#17241F] hover:bg-[#F7F9F7] transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-[#64736B]" />
                  Subscription
                </Link>
              </div>

              <div className="border-t border-[#E3EAE5] pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-[#E3EAE5] p-3 shadow-sm z-[80]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
            <input
              type="text"
              placeholder="Search commodities, markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full h-10 pl-9 pr-10 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#64736B]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
