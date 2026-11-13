import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { REPORTS } from '@/lib/content/reports';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Market Intelligence Reports',
  description:
    'Published Hatsi360 market intelligence: grain market reviews, recorded price movement and an honest statement of collection coverage.',
  alternates: { canonical: '/reports' },
  openGraph: {
    title: `Market intelligence reports | ${BRAND.name}`,
    description:
      'Published Hatsi360 market intelligence, with every figure computed from published price observations.',
  },
};

export default function ReportsIndexPage() {
  return (
    <>
      <PageHero
        eyebrow="Reports"
        title="Market intelligence reports"
        lede="Each report is written by the Hatsi360 editorial desk and computed from published price observations at the moment you open it. The figures are never typed in by hand."
        breadcrumbs={[{ label: 'Reports' }]}
        image={getPageImage('reports.hero')}
      />

      <div className="section bg-ink-50">
        <div className="container-page">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((report) => (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className="card card-hover flex flex-col p-6"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  {report.category}
                </p>
                <h2 className="mt-3 font-display text-lg font-bold leading-snug text-ink-950">
                  {report.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">
                  {report.summary}
                </p>
                <p className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500">
                  {report.cadence} &middot; {report.readingMinutes} min read
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-ink-900">
              How these reports are produced
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              A report separates two things. The argument and the interpretation are ours, and they
              are written by the editorial desk. The figures are not: each one is computed at
              request time from the observations that have actually been published, and a report
              with no data behind it says so rather than showing a placeholder. The method note on
              every report states exactly how its numbers were produced.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Nothing here is a forecast. Hatsi360 does not publish projected prices, and a report
              never presents an expected future value as an observed one.
            </p>
            <Link
              href="/methodology"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Read the full methodology &rarr;
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
