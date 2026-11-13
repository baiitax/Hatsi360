import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/supabase/config';
import { getDataSource } from '@/lib/data';
import { insights } from '@/lib/content/insights';
import { REPORTS } from '@/lib/content/reports';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const source = await getDataSource();
  const [markets, commodities] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/prices`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/commodities`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/markets`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/compare`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/insights`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/reports`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/solutions`, changeFrequency: 'monthly', priority: 0.7 },
    // The public URL. The route is implemented by `/coverage-report`; see
    // `src/lib/route-map.ts`.
    { url: `${base}/coverage`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/methodology`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/pricing`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/api-docs`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/disclaimer`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/api-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const marketRoutes: MetadataRoute.Sitemap = markets.map((market) => ({
    url: `${base}/markets/${market.slug}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  const commodityRoutes: MetadataRoute.Sitemap = commodities.map((commodity) => ({
    url: `${base}/commodities/${commodity.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // The price directory only lists commodities that actually have a published
  // observation, so the sitemap does the same — no thin pages.
  const priceRoutes: MetadataRoute.Sitemap = commodities
    .filter((commodity) => (commodity.observationCount ?? 0) > 0)
    .map((commodity) => ({
      url: `${base}/prices/${commodity.slug}`,
      changeFrequency: 'daily',
      priority: 0.8,
    }));

  const insightRoutes: MetadataRoute.Sitemap = insights.map((article) => ({
    url: `${base}/insights/${article.slug}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const reportRoutes: MetadataRoute.Sitemap = REPORTS.map((report) => ({
    url: `${base}/reports/${report.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...priceRoutes,
    ...commodityRoutes,
    ...marketRoutes,
    ...insightRoutes,
    ...reportRoutes,
  ];
}
