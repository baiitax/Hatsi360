import Link from 'next/link';
import { BareFrame } from '@/components/site/BareFrame';

export default function NotFound() {
  return (
    <BareFrame>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          We could not find that page
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-600">
          The page may have moved, or the link may be wrong. Nothing is wrong with the price data —
          you can browse everything we publish from the price directory.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/prices"
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Browse prices
          </Link>
          <Link
            href="/"
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
          >
            Back to the homepage
          </Link>
        </div>
      </div>
    </BareFrame>
  );
}
