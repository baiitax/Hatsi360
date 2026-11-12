import { BRAND, ORGANISATION } from '@/lib/brand';
import { getSiteUrl } from '@/lib/supabase/config';

/**
 * Structured data.
 *
 * One place that emits the JSON-LD, so every page describes the same
 * organisation with the same vocabulary:
 *
 *  - `Organization` and `WebSite` on the homepage.
 *  - `BreadcrumbList` on interior pages.
 *  - `Dataset` on the price, commodity and market pages, because those pages
 *    really are datasets with a distribution and a temporal coverage.
 */

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: ORGANISATION.name,
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}${ORGANISATION.logo}`,
          width: 512,
          height: 512,
        },
        description: `${ORGANISATION.descriptor}. ${ORGANISATION.ownershipStatement}`,
        slogan: BRAND.tagline,
        email: ORGANISATION.email,
        telephone: ORGANISATION.telephone,
        areaServed: ORGANISATION.areaServed,
        foundingLocation: ORGANISATION.foundingPlace,
        brand: {
          '@type': 'Brand',
          name: ORGANISATION.name,
          slogan: BRAND.tagline,
          logo: `${siteUrl}${ORGANISATION.logo}`,
        },
      }}
    />
  );
}

export function WebSiteJsonLd() {
  const siteUrl = getSiteUrl();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: BRAND.name,
        description: ORGANISATION.descriptor,
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: BRAND.locale,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/prices?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  );
}

/**
 * The breadcrumb trail as structured data.
 *
 * The final crumb is the page itself and carries no URL, so its `item` is
 * omitted — which is what schema.org expects and what search engines read.
 */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url?: string }[] }) {
  const siteUrl = getSiteUrl();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          ...(item.url
            ? { item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}` }
            : {}),
        })),
      }}
    />
  );
}

/**
 * A published price dataset.
 *
 * The page really is a dataset: it has a distribution (per market), a
 * temporal coverage, and an attribution statement. Declaring it as one is
 * more honest than leaving it as an ordinary web page.
 */
export function DatasetJsonLd({
  name,
  description,
  url,
  keywords,
  temporalCoverage,
  creator,
}: {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  temporalCoverage?: string;
  creator?: string;
}) {
  const siteUrl = getSiteUrl();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name,
        description,
        url: url.startsWith('http') ? url : `${siteUrl}${url}`,
        creator: {
          '@type': 'Organization',
          name: creator ?? ORGANISATION.name,
          url: siteUrl,
        },
        isAccessibleForFree: true,
        license: `${siteUrl}/terms`,
        ...(keywords ? { keywords: keywords.join(', ') } : {}),
        ...(temporalCoverage ? { temporalCoverage } : {}),
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${siteUrl}/api/v1/prices/latest`,
          },
        ],
      }}
    />
  );
}
