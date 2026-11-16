# Hatsi360 Markets — Indexing & Sitemap

**Document Version:** 1.0
**Created:** 2026-01-XX

---

## 1. Crawl Rules (robots.txt)

### Allowed
- All public routes under `/`

### Disallowed
| Path | Reason |
|------|--------|
| `/api/` | Internal API endpoints |
| `/admin` and `/admin/` | Staff control centre |
| `/agent` and `/agent/` | Field agent application |
| `/client` and `/client/` | Premium customer workspace |
| `/dashboard` | Legacy authenticated dashboard |
| `/login` | Authentication page |
| `/register` | Authentication page |
| `/forgot-password` | Authentication page |
| `/reset-password` | Authentication page |
| `/auth/` | Auth callback routes |
| `/_next/` | Next.js internals |

### Special allowances
Social crawlers (Googlebot, Facebook, Twitter, LinkedIn) are explicitly allowed to crawl `/brand/` so the social card image is always accessible.

### Production `robots.txt` output
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/
Disallow: /agent
Disallow: /agent/
Disallow: /client
Disallow: /client/
Disallow: /dashboard
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /auth/
Disallow: /_next/

User-agent: Googlebot
Allow: /brand/

User-agent: facebookexternalhit
Allow: /brand/

User-agent: Twitterbot
Allow: /brand/

User-agent: LinkedInBot
Allow: /brand/

Sitemap: https://<site-url>/sitemap.xml
Host: https://<site-url>
```

---

## 2. Sitemap

### Static routes (always included)

| URL | Change frequency | Priority |
|-----|-----------------|----------|
| `/` | daily | 1.0 |
| `/prices` | hourly | 0.9 |
| `/commodities` | daily | 0.85 |
| `/markets` | daily | 0.85 |
| `/compare` | daily | 0.8 |
| `/charts` | daily | 0.8 |
| `/trade` | daily | 0.8 |
| `/trade/best-buy` | daily | 0.75 |
| `/trade/best-sell` | daily | 0.75 |
| `/trade/terminal` | daily | 0.75 |
| `/trade/watchlist` | daily | 0.75 |
| `/insights` | weekly | 0.7 |
| `/reports` | weekly | 0.7 |
| `/solutions` | monthly | 0.7 |
| `/coverage` | weekly | 0.7 |
| `/methodology` | monthly | 0.6 |
| `/pricing` | monthly | 0.6 |
| `/api-docs` | monthly | 0.6 |
| `/about` | monthly | 0.5 |
| `/faq` | monthly | 0.5 |
| `/contact` | monthly | 0.5 |
| `/privacy` | yearly | 0.3 |
| `/terms` | yearly | 0.3 |
| `/disclaimer` | yearly | 0.3 |
| `/api-policy` | yearly | 0.3 |
| `/cookies` | yearly | 0.3 |

### Dynamic routes (from database)

| Source | URL pattern | Change frequency | Priority |
|--------|------------|-----------------|----------|
| Commodities with observations | `/prices/[slug]` | daily | 0.8 |
| All commodities | `/commodities/[slug]` | daily | 0.7 |
| All active markets | `/markets/[slug]` | daily | 0.6 |
| Published insights | `/insights/[slug]` | monthly | 0.5 |
| Published reports | `/reports/[slug]` | weekly | 0.6 |

### Excluded from sitemap
- `/client/*` — authenticated workspace
- `/admin/*` — staff workspace
- `/agent/*` — field agent app
- `/dashboard` — authenticated
- `/login`, `/register` — auth pages
- `/api/*` — API routes
- Commodities with zero observations (thin pages)

### Sitemap revalidation
The sitemap is revalidated every 3600 seconds (1 hour) via `export const revalidate = 3600`.

---

## 3. Indexing by Surface

| Surface | Indexable | How enforced |
|---------|-----------|--------------|
| Public site (`(site)`) | ✅ Yes | Default; no robots override |
| Client portal (`(client)`) | ❌ No | Layout sets `robots: { index: false, follow: false }` |
| Portal auth (`(portal)`) | ❌ No | robots.txt disallows + no sitemap entries |
| Admin (`/admin`) | ❌ No | robots.txt disallows |
| Agent (`/agent`) | ❌ No | robots.txt disallows |

### Client portal double-protection
The client portal is protected both by:
1. **robots.txt** — tells well-behaved crawlers not to crawl
2. **Page-level robots** — the layout sets `noindex`, which tells crawlers that do access the page not to index it

This is defence in depth: robots.txt is a request, not an enforcement mechanism.

---

## 4. Canonical URLs

Every public page sets `alternates: { canonical: '/path' }`. The root layout's `metadataBase` makes these absolute:

```
canonical = metadataBase + alternates.canonical
         = https://<site-url>/commodities/maize
```

### Rules
1. One canonical per page
2. No trailing slash inconsistency — all canonicals omit trailing slash
3. Dynamic pages use the record's slug (not the ID)
4. The homepage canonical is `/`
5. No self-referencing canonicals on noindex pages (harmless but clean)

---

## 5. Structured Data (JSON-LD)

### Organization (homepage only)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "<site-url>/#organization",
  "name": "Hatsi360",
  "url": "<site-url>",
  "logo": { "@type": "ImageObject", "url": "...", "width": 2016, "height": 724 },
  "description": "African Agricultural Market Intelligence. ...",
  "slogan": "Know the harvest. Understand the market. Trade with confidence.",
  "areaServed": "Nigeria",
  "foundingLocation": "Kano, Nigeria"
}
```

### WebSite (homepage only)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "<site-url>/#website",
  "url": "<site-url>",
  "name": "Hatsi360",
  "publisher": { "@id": ".../#organization" },
  "inLanguage": "en-NG",
  "potentialAction": {
    "@type": "SearchAction",
    "target": { "urlTemplate": "<site-url>/prices?q={search_term_string}" },
    "query-input": "required name=search_term_string"
  }
}
```

### BreadcrumbList (interior pages)
Implemented in `src/components/marketing/StructuredData.tsx`. Used on prices, commodities, markets, reports, insights, solutions, compare, coverage pages.

### Dataset (price and market pages)
Provides search engines with structured information about the dataset behind the page (temporal coverage, distribution).

### Article (report detail)
Inline in `reports/[slug]/page.tsx` with headline, description, publisher, and datePublished.

---

## 6. What Not to Do

1. **Do not invent company details** — no fake addresses, phone numbers, social profiles, awards, or certifications in structured data
2. **Do not fabricate statistics** — no "10,000+ prices" or "50 markets" unless verified
3. **Do not expose private data** — authenticated pages must never have their content in public HTML
4. **Do not duplicate canonicals** — each URL appears once in the sitemap
5. **Do not block social crawlers** — `/brand/` must remain accessible
6. **Do not rely on robots.txt for security** — authentication is the real protection

---

## 7. Production Checklist

- [ ] `NEXT_PUBLIC_SITE_URL` is set to the production domain (not `localhost:3000`)
- [ ] `robots.txt` returns 200 and lists correct rules
- [ ] `sitemap.xml` returns 200 and contains only public routes
- [ ] Social card image at `/brand/hatsi360-social-preview.png` returns 200
- [ ] Google Search Console is connected (if available)
- [ ] Facebook debugger shows correct preview
- [ ] LinkedIn Post Inspector shows correct preview
- [ ] WhatsApp share shows correct preview
- [ ] No 404s in sitemap entries
