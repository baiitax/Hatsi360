import Link from 'next/link';
import { BrandLogo } from '@/components/brand/Logo';
import { BRAND } from '@/lib/brand';

/**
 * The branded header for the access portal.
 *
 * The sign-in page has its own two-panel layout. The other portal pages —
 * registration, password recovery and password reset — share this compact
 * header instead, so the product name and the subordinate corporate
 * endorsement appear on every surface a person signs in through.
 */
export function PortalFrame({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="border-b border-ink-200 bg-white">
        <div className="container-page flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo size={36} />
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-brand-700">
              {BRAND.endorsement}
            </span>
          </Link>
          <span className="hidden text-xs text-ink-500 sm:block">{BRAND.surfaces.portal}</span>
        </div>
      </div>

      <div className="container-page flex max-w-md flex-col py-12">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-950">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{lede}</p>
        <div className="card mt-6 p-6 sm:p-8">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-ink-600">{footer}</div> : null}
      </div>
    </div>
  );
}
