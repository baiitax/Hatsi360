import Link from 'next/link';
import { BrandLogo } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';

/**
 * A minimal branded frame for the pages that sit outside every route group.
 *
 * The not-found page and the error boundary are reached for URLs that match
 * no route, so they render under the root layout alone — no site header and
 * no footer. They still carry the product's identity, because a page that
 * says something went wrong should at least say whose product it is.
 */
export function BareFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-page flex items-center gap-3 py-4">
          <Link href="/" className="flex items-center" aria-label={`${BRAND.name} home`}>
            <BrandLogo size={36} priority />
          </Link>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-brand-700">
            {BRAND.endorsement}
          </span>
        </div>
      </div>
      <main id="main" className="flex flex-1 items-center">
        <div className="container-page w-full py-12">{children}</div>
      </main>
    </div>
  );
}
