/**
 * Intelligence shell — terminal-native environment.
 *
 * The intelligence pages belong in the dark terminal environment, not the
 * light editorial site. This layout wraps them in the terminal visual
 * language: dark background, monospace accents, proper token usage.
 *
 * This fixes P0-02: Intelligence pages disconnected.
 */

import Link from 'next/link';
import { BrandMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';

export default function IntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text">
      {/* Terminal-native header */}
      <header className="terminal-rail sticky top-0 z-50 border-b border-terminal-border">
        <div className="flex h-[3.25rem] items-center gap-3 px-3 lg:px-4">
          {/* The mark and the product name. */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label={`${BRAND.productName} home`}
          >
            <BrandMark size={26} tone="dark" />
            <span className="hidden font-display text-[0.9375rem] font-extrabold tracking-tight text-terminal-text sm:block">
              {BRAND.productName}
            </span>
          </Link>

          {/* Breadcrumb */}
          <nav className="ml-4 flex items-center gap-2 text-[0.8125rem] text-terminal-muted">
            <Link href="/" className="hover:text-terminal-text transition-colors">
              Terminal
            </Link>
            <span className="text-terminal-border">/</span>
            <span className="text-terminal-text font-medium">Intelligence</span>
          </nav>

          <div className="ml-auto" />
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Minimal terminal footer */}
      <footer className="terminal-rail border-t border-terminal-border px-3 py-6 lg:px-4">
        <div className="container-page">
          <p className="text-[0.6875rem] text-terminal-muted">
            Intelligence data sourced from FAOSTAT and USDA FAS with full provenance tracking.
          </p>
        </div>
      </footer>
    </div>
  );
}
