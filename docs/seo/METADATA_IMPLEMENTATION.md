# Hatsi360 Markets — Metadata Implementation Reference

**Document Version:** 1.0
**Created:** 2026-01-XX

---

## 1. Brand Positioning (Source of Truth)

| Field | Value |
|-------|-------|
| Brand name (display) | Hatsi360 Markets |
| Brand name (URL/ID) | Hatsi360 |
| Descriptor | African Agricultural Market Intelligence |
| Tagline | Agricultural Intelligence for Better Decisions |
| Slogan | Know the harvest. Understand the market. Trade with confidence. |
| Operating market | Northern Nigeria (expansion: nationwide, then Africa) |
| Operator | Pluck Agro |
| Primary locale | `en-NG` |

---

## 2. Title Templates

### Root template (fallback)
```
%s | Hatsi360 Markets
```

### Homepage (absolute)
```
Hatsi360 Markets | African Agricultural Market Intelligence & Trade
```

### Page title patterns

| Page | Title |
|------|-------|
| Homepage | `Hatsi360 Markets \| African Agricultural Market Intelligence & Trade` |
| Commodities | `Agricultural Commodity Intelligence \| Hatsi360 Markets` |
| Commodity detail | `[Commodity Name] Prices & Market Intelligence \| Hatsi360 Markets` |
| Markets | `Agricultural Markets & Commodity Prices \| Hatsi360 Markets` |
| Market detail | `[Market Name] Agricultural Market Prices \| Hatsi360 Markets` |
| Prices | `Hatsi360 Markets — Price Directory` |
| Commodity prices | `[Commodity Name] Prices & Market Intelligence \| Hatsi360 Markets` |
| Compare | `Compare Agricultural Commodity Prices \| Hatsi360 Markets` |
| Charts/Analytics | `Agricultural Price Analytics & Historical Trends \| Hatsi360 Markets` |
| Trade | `African Agricultural Trade Intelligence \| Hatsi360 Markets` |
| Reports | `Agricultural Market Research & Reports \| Hatsi360 Markets` |
| Report detail | `[Report Title] \| Hatsi360 Markets` |
| Insights | `Agricultural Market Research & Insights \| Hatsi360 Markets` |
| Insight detail | `[Article Title] \| Hatsi360 Markets` |
| About | `About Hatsi360 Markets \| African Agricultural Intelligence` |
| Solutions | `Business Solutions \| Hatsi360 Markets` |
| Pricing | `Plans & Pricing \| Hatsi360 Markets` |
| FAQ | `Frequently Asked Questions \| Hatsi360 Markets` |
| Contact | `Contact \| Hatsi360 Markets` |
| Coverage | `Market Coverage & Data Freshness \| Hatsi360 Markets` |
| Methodology | (inherits root template) |
| API Docs | (inherits root template) |
| Legal pages | (inherits root template) |
| Auth pages (login/register) | (noindex) |
| Client portal | (noindex) |
| Dashboard | (noindex) |

---

## 3. Description Standards

### Rules
1. Must explain what the page is **for**, not just what it is called
2. 150–160 characters for meta description (SEO display limit)
3. OG description can be longer (no strict limit)
4. Never fabricate statistics or capabilities
5. Use active voice
6. Name the audience where relevant (traders, producers, exporters)

### Canonical descriptions

| Page | Meta Description |
|------|-----------------|
| Homepage | Discover agricultural commodity prices, market intelligence, price analytics, commodity research and trade insights across African agricultural markets. Hatsi360 helps businesses, traders, producers and exporters make better-informed decisions. |
| Commodities | Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets. |
| Markets | Explore agricultural market prices and commodity observations across available African markets. Compare market information and monitor agricultural price movements. |
| Prices | Explore agricultural commodity price observations across African markets. Filter by commodity, market and date with live market intelligence. |
| Compare | Interactive comparison of agricultural commodity prices across African markets. Visual charts, detailed data tables and market-by-market intelligence. |
| Charts | Analyse agricultural commodity price movements, historical observations and market comparisons using available Hatsi360 market intelligence data. |
| Trade | Explore agricultural trade intelligence, commodity export insights, market access information and available buyer and supplier discovery opportunities. |
| Reports | Access agricultural market research, commodity reports, regional insights and published intelligence from Hatsi360 Markets. |
| Insights | Market briefs and published research from the Hatsi360 research desk on African agricultural markets — what the price data shows, and what it does not. |
| About | Learn about Hatsi360 Markets, our mission to improve agricultural market intelligence and our commitment to helping businesses make better-informed decisions across African agricultural markets. |
| Solutions | How farmers, aggregators, traders, processors, exporters, cooperatives, financial institutions and development organisations use verified agricultural market intelligence from Hatsi360 Markets. |
| Pricing | Public price discovery stays free. Professional and enterprise intelligence add extended history, exports, alerts, API access and custom coverage. |
| FAQ | Answers about how Hatsi360 Markets collects, verifies and publishes agricultural commodity prices across African markets. |
| Contact | Talk to the Hatsi360 Markets team about market partnerships, API access, custom reports or a published price you think looks wrong. |

### Dynamic descriptions
For commodity/market/report detail pages, use the record's own `description` or `summary` field if available, otherwise generate from the template:
- Commodity: `Explore [Name] prices, available market observations, historical trends and related agricultural intelligence on Hatsi360 Markets.`
- Market: `Explore agricultural commodity prices collected at [Name][, State]. Compare markets and monitor price movements on Hatsi360 Markets.`

---

## 4. Social Card

| Property | Value |
|----------|-------|
| File | `/public/brand/hatsi360-social-preview.png` |
| Dimensions | 1200 × 630 px (1.91:1) |
| Format | PNG, 8-bit RGB |
| Referenced by | Root layout, all public pages via `buildShareMetadata` |

All public pages share this card. Per-commodity or per-report custom cards are a future enhancement.

---

## 5. Implementation Architecture

```
src/lib/metadata.ts          ← buildShareMetadata() helper + PLATFORM_DESCRIPTION
src/lib/brand.ts             ← BRAND constants (name, descriptor, locale, etc.)
src/app/layout.tsx           ← Root metadata (title, description, OG, Twitter, icons)
src/app/robots.ts            ← Crawl rules
src/app/sitemap.ts           ← XML sitemap (static + dynamic)
src/app/manifest.ts          ← PWA manifest
src/components/marketing/StructuredData.tsx  ← OrganizationJsonLd, WebSiteJsonLd, etc.
```

### How to add metadata to a new page

**Static page:**
```tsx
export const metadata: Metadata = {
  title: 'Page Title | Hatsi360 Markets',
  description: 'One or two sentences describing what the page is for.',
  alternates: { canonical: '/path' },
  openGraph: {
    type: 'website',
    siteName: 'Hatsi360 Markets',
    locale: BRAND.locale,
    title: 'Page Title | Hatsi360 Markets',
    description: 'Same or slightly richer description.',
    url: '/path',
    images: [{ url: '/brand/hatsi360-social-preview.png', width: 1200, height: 630, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Page Title | Hatsi360 Markets',
    description: 'Shorter description for Twitter.',
    images: ['/brand/hatsi360-social-preview.png'],
  },
};
```

**Dynamic page:**
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const record = await getRecord(params.slug);
  if (!record) return { title: 'Not found' };
  return {
    title: `${record.name} | Hatsi360 Markets`,
    description: record.description ?? `Default description for ${record.name}.`,
    alternates: { canonical: `/path/${record.slug}` },
    openGraph: {
      type: 'website',
      siteName: 'Hatsi360 Markets',
      locale: BRAND.locale,
      title: `${record.name} | Hatsi360 Markets`,
      description: record.description ?? `Default description for ${record.name}.`,
      url: `/path/${record.slug}`,
      images: [{ url: '/brand/hatsi360-social-preview.png', width: 1200, height: 630, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${record.name} | Hatsi360 Markets`,
      description: record.description ?? `Default for ${record.name}.`,
      images: ['/brand/hatsi360-social-preview.png'],
    },
  };
}
```

**Using the helper:**
```tsx
import { buildShareMetadata } from '@/lib/metadata';

export const metadata = buildShareMetadata({
  title: 'Page Title',
  description: 'Description...',
  path: '/path',
});
```

---

## 6. Canonical URL Rules

1. Every public page must set `alternates: { canonical: '/path' }`
2. The root layout sets `metadataBase: new URL(siteUrl)` so canonical URLs are absolute
3. Dynamic pages use the record's slug: `canonical: /commodities/${record.slug}`
4. The homepage canonical is `/`
5. No duplicate canonicals — each route has exactly one

---

## 7. Indexing Rules

| Surface | Index | Notes |
|---------|-------|-------|
| Public site (`/`) | ✅ Yes | All public routes |
| Client portal (`/client`) | ❌ No | Authenticated workspace |
| Dashboard (`/dashboard`) | ❌ No | Legacy authenticated page |
| Admin (`/admin`) | ❌ No | Staff workspace |
| Agent (`/agent`) | ❌ No | Field agent app |
| Auth pages | ❌ No | Login, register, reset |
| API routes | ❌ No | `/api/*` |

---

## 8. Validation Checklist

- [ ] `npm run build` passes with 0 errors
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Every public page has OG title, description, image
- [ ] Every public page has Twitter card, title, description, image
- [ ] Every public page sets canonical URL
- [ ] Private pages return `robots: { index: false }`
- [ ] Social card image is accessible at `/brand/hatsi360-social-preview.png`
- [ ] `robots.txt` disallows `/client`, `/admin`, `/agent`
- [ ] `sitemap.xml` contains only eligible public routes
- [ ] No fabricated statistics in any description
- [ ] No duplicate titles across pages
- [ ] All dynamic pages handle missing records gracefully
