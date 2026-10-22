import type { ReactNode } from 'react';
import { Breadcrumbs } from './index';

/**
 * A page header used across the public site.
 *
 * Keeps the eyebrow / title / lede rhythm consistent on every page, and
 * carries the breadcrumb trail where one exists.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  breadcrumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  breadcrumbs?: { href?: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-ink-200 bg-white">
      <div className="container-page py-10 sm:py-14">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
          {lede ? (
            <div className="mt-4 text-base leading-relaxed text-ink-600 sm:text-lg">{lede}</div>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
