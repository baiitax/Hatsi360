import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CommodityCard } from '@/components/data/Cards';
import { Breadcrumbs, EmptyState, Pagination } from '@/components/ui';
import { getDataSource } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Commodity Catalogue',
  description:
    'The agricultural commodities Pluck Live tracks — grains, pulses, oilseeds, tubers, spices, tree crops and more — with the markets reporting each one.',
  alternates: { canonical: '/commodities' },
};

export default async function CommoditiesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const source = await getDataSource();
  const [commodities, categories] = await Promise.all([
    source.listCommodities(),
    source.listCategories(),
  ]);

  // A legacy link such as commodity-detail.php?id=1 lands here with ?id=. The
  // legacy detail page was the price view, so it resolves to /prices/<slug>.
  if (params.id) {
    const legacyId = Number(params.id);
    const match = commodities.find((c) => c.legacyId === legacyId);
    if (match) redirect(`/prices/${match.slug}`);
  }

  const activeCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : undefined;

  const filtered = activeCategory
    ? commodities.filter((c) => c.categoryId === activeCategory.id)
    : commodities;

  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 18;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (activeCategory) search.set('category', activeCategory.slug);
    search.set('page', String(nextPage));
    return `/commodities?${search.toString()}`;
  };

  const withPrices = commodities.filter((c) => (c.observationCount ?? 0) > 0).length;

  return (
    <div className="section">
      <div className="container-page">
        <Breadcrumbs items={[{ label: 'Commodities' }]} />

        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Commodities we track</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            Our catalogue covers {commodities.length} agricultural commodities across{' '}
            {categories.length} categories. {withPrices} currently have published price
            observations; the rest are listed so the catalogue is complete, and they appear in
            price results only once a price is actually published for them.
          </p>
        </header>

        {/* ------------------------------------------------ category filter -- */}
        <nav aria-label="Filter by category" className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/commodities"
            aria-current={!activeCategory ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              !activeCategory
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/commodities?category=${category.slug}`}
              aria-current={activeCategory?.id === category.id ? 'page' : undefined}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory?.id === category.id
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
              }`}
            >
              {category.name}
            </Link>
          ))}
        </nav>

        {items.length > 0 ? (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((commodity) => (
                <CommodityCard key={commodity.id} commodity={commodity} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="No commodities in this category"
              description="This category has no active commodities. Choose another category to continue browsing."
              action={
                <Link
                  href="/commodities"
                  className="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  All commodities
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
