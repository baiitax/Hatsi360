import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CommodityPriceView, PRICE_RANGES } from '@/components/data/CommodityPriceView';
import { getDataSource } from '@/lib/data';
import { DatasetJsonLd } from '@/components/marketing/StructuredData';

interface Params {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const source = await getDataSource();
  const commodity = await source.getCommodityBySlug(slug);
  if (!commodity) return { title: 'Commodity not found' };

  return {
    title: `${commodity.name} prices`,
    description:
      commodity.description ??
      `Price history, market comparison and observation details for ${commodity.name} on Hatsi360.`,
    alternates: { canonical: `/commodities/${commodity.slug}` },
    openGraph: {
      title: `${commodity.name} prices — Hatsi360`,
      description: commodity.description ?? `Price history for ${commodity.name}.`,
      url: `/commodities/${commodity.slug}`,
    },
  };
}

export default async function CommodityDetailPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const query = await searchParams;
  const source = await getDataSource();

  const commodity = await source.getCommodityBySlug(slug);
  if (!commodity) notFound();

  const rangeKey = query.range ?? 'all';
  const range = PRICE_RANGES.find((r) => r.key === rangeKey) ?? PRICE_RANGES[PRICE_RANGES.length - 1]!;

  const observations = await source.listObservationsForAnalysis({ commodityId: commodity.id });

  const oldest = observations.reduce<string | null>(
    (earliest, observation) =>
      !earliest || observation.collectedAt < earliest ? observation.collectedAt : earliest,
    null,
  );
  const newest = observations.reduce<string | null>(
    (latest, observation) =>
      !latest || observation.collectedAt > latest ? observation.collectedAt : latest,
    null,
  );

  return (
    <>
      <DatasetJsonLd
        name={`${commodity.name} price observations`}
        description={
          commodity.description ??
          `Published price observations for ${commodity.name}, by market, with unit, price type and collection time.`
        }
        url={`/commodities/${commodity.slug}`}
        keywords={[commodity.name, commodity.categoryName ?? undefined, 'agricultural prices'].filter(
          (value): value is string => Boolean(value),
        )}
        temporalCoverage={
          oldest && newest ? `${oldest.slice(0, 10)}/${newest.slice(0, 10)}` : undefined
        }
      />
      <CommodityPriceView
        commodity={commodity}
        observations={observations}
        range={range}
        basePath={`/commodities/${commodity.slug}`}
        breadcrumbs={[
          { href: '/commodities', label: 'Commodities' },
          { label: commodity.name },
        ]}
      />
    </>
  );
}
