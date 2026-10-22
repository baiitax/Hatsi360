import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { insights } from '@/lib/content/insights';
import { formatDate } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Market Insights',
  description:
    'Analysis from the Pluck Agro team on Nigerian agricultural markets — seasonal patterns, input costs, trade and what the price data shows.',
  alternates: { canonical: '/insights' },
};

export default function InsightsPage() {
  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Latest agricultural insights"
        lede="Analysis from the Pluck Agro team. We separate what we observed from what we think it means — and we do not publish forecasts."
        breadcrumbs={[{ label: 'Insights' }]}
      />

      <div className="section">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((article, index) => (
              <article
                key={article.slug}
                className={`card card-hover flex flex-col overflow-hidden ${
                  index === 0 ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
              >
                <div className={`relative w-full overflow-hidden ${index === 0 ? 'h-60' : 'h-44'}`}>
                  <Image
                    src={article.coverImage}
                    alt=""
                    width={800}
                    height={400}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-800">
                      {article.category}
                    </span>
                    {article.publishedAt ? (
                      <span className="text-ink-500">{formatDate(article.publishedAt)}</span>
                    ) : (
                      <span
                        className="text-ink-500"
                        title="The original publication did not display a date, so none is asserted here."
                      >
                        Publication date not recorded
                      </span>
                    )}
                    <span className="text-ink-400">{article.readingMinutes} min read</span>
                  </div>

                  <h2 className="mt-3 text-xl font-bold leading-snug">
                    <Link href={`/insights/${article.slug}`} className="hover:text-brand-700">
                      {article.title}
                    </Link>
                  </h2>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">
                    {article.excerpt}
                  </p>

                  <Link
                    href={`/insights/${article.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Read the article
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-10 rounded-xl border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-600">
            <span className="font-semibold text-ink-900">A note on forecasts.</span> The previous
            Pluck Live site displayed a &ldquo;Price Forecast&rdquo; figure on every commodity page
            without explaining how it was produced. We have removed it. Pluck Live publishes
            observations and analysis; it does not publish predictions dressed up as data. See the{' '}
            <Link href="/disclaimer" className="font-semibold text-brand-700 underline">
              price data disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
