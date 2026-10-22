import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CommodityPriceView, PRICE_RANGES } from '@/components/data/CommodityPriceView';
import { getDataSource } from '@/lib/data';

interface Params {
  params: Promise<{ commodity: string }>;
  searchParams: Promise<{ range?: string }>;
}

/**
 * The price view for one commodity, addressed from the price directory.
 *
 * This is the modern equivalent of the legacy `commodity-detail.php?id=N`
 * page. The dynamic segment accepts either the commodity slug or its legacy
 * numeric id, so old links keep resolving.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { commodity: key } = await params;
  const source = await getDataSource();

  const commodity =
    (await source.getCommodityBySlug(key)) ??
    (await source.getCommodityById(Number(key)));

  if (!commodity) return { title: 'Commodity not found' };

  return {
    title: `${commodity.name} prices`,
    description:
      commodity.description ??
      `Published prices, price history and market-by-market comparison for ${commodity.name} on Pluck Live.`,
    alternates: { canonical: `/prices/${commodity.slug}` },
    openGraph: {
      title: `${commodity.name} prices — Pluck Live`,
      description: commodity.description ?? `Published prices for ${commodity.name}.`,
      url: `/prices/${commodity.slug}`,
    },
  };
}

export default async function CommodityPricePage({ params, searchParams }: Params) {
  const { commodity: key } = await params;
  const query = await searchParams;
  const source = await getDataSource();

  const commodity =
    (await source.getCommodityBySlug(key)) ??
    (await source.getCommodityById(Number(key)));

  if (!commodity) notFound();

  const rangeKey = query.range ?? 'all';
  const range = PRICE_RANGES.find((r) => r.key === rangeKey) ?? PRICE_RANGES[PRICE_RANGES.length - 1]!;

  const observations = await source.listObservationsForAnalysis({ commodityId: commodity.id });

  return (
    <CommodityPriceView
      commodity={commodity}
      observations={observations}
      range={range}
      basePath={`/prices/${commodity.slug}`}
      eyebrow="Price directory"
      breadcrumbs={[
        { href: '/prices', label: 'Prices' },
        { label: commodity.name },
      ]}
    />
  );
}
