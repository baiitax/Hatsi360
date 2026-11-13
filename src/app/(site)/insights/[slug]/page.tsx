import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/ui';
import { getInsight, insights } from '@/lib/content/insights';
import { formatDate } from '@/lib/money';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';
import { getInsightImage } from '@/lib/images/registry';
import { HatsiImage } from '@/components/media/HatsiImage';

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return insights.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = getInsight(slug);
  if (!article) return { title: 'Insight not found' };

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/insights/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author],
    },
  };
}

export default async function InsightDetailPage({ params }: Params) {
  const { slug } = await params;
  const article = getInsight(slug);
  if (!article) notFound();

  const related = insights.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <div className="section">
      <div className="container-page">
        <BreadcrumbJsonLd
          items={[{ name: 'Insights', url: '/insights' }, { name: article.title }]}
        />
        <Breadcrumbs items={[{ href: '/insights', label: 'Insights' }, { label: article.title }]} />

        <article className="mx-auto max-w-3xl">
          <header>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
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
              <span className="text-ink-400">· {article.author}</span>
              <span className="text-ink-400">· {article.readingMinutes} min read</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">{article.excerpt}</p>
          </header>

          {/*
            The editorial feature image. It is matched to the subject of the
            article through the registry — a yam article shows yam, a fuel
            article shows a loaded truck — and it carries meaningful
            alternative text rather than being marked decorative.
          */}
          <div className="mt-8 overflow-hidden rounded-2xl">
            <HatsiImage
              asset={getInsightImage(article.slug)}
              sizes="(min-width: 768px) 48rem, 100vw"
              ratio="wide"
              priority
            />
          </div>

          <div className="prose-hatsi mt-8">
            {article.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <h2 className="text-base font-bold text-brand-950">See the prices behind the story</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-900">
              Every Hatsi360 price shows the market it came from, the unit, the price type and the
              time it was collected.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/prices"
                className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                Browse prices
              </Link>
              <Link
                href="/markets"
                className="rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-100"
              >
                Our markets
              </Link>
            </div>
          </div>
        </article>

        {related.length > 0 ? (
          <section className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-xl font-bold tracking-tight">More insights</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/insights/${item.slug}`}
                  className="card card-hover group flex flex-col overflow-hidden"
                >
                  <HatsiImage
                    asset={getInsightImage(item.slug)}
                    sizes="(min-width: 640px) 22rem, 92vw"
                    ratio="landscape"
                    className="rounded-t-[0.875rem]"
                    imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {item.category}
                    </span>
                    <span className="mt-2 text-base font-bold leading-snug">{item.title}</span>
                    <span className="mt-2 line-clamp-3 text-sm text-ink-600">{item.excerpt}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
