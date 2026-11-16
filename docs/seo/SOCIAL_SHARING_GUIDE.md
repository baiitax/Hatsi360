# Hatsi360 Markets — Social Sharing Guide

**Document Version:** 1.0
**Created:** 2026-01-XX

---

## 1. What Happens When Someone Shares a Link

When a user pastes a Hatsi360 URL into WhatsApp, Facebook, LinkedIn, X (Twitter), Slack or iMessage, the platform's crawler fetches the page and reads the Open Graph and Twitter card meta tags from the server-rendered HTML. It then renders a preview card with:

- **Image** — the social card (1200×630 PNG)
- **Title** — the OG title
- **Description** — the OG description
- **Site name** — "Hatsi360 Markets"

The preview is rendered **before** the user clicks through. It is the single most important factor in whether someone opens the link.

---

## 2. Social Card Asset

| Property | Value |
|----------|-------|
| Path | `/public/brand/hatsi360-social-preview.png` |
| Dimensions | 1200 × 630 pixels |
| Aspect ratio | 1.91:1 (Open Graph standard) |
| Format | PNG, 8-bit RGB |
| File size | ~88 KB (optimised) |
| Content | Hatsi360 logo, brand name, descriptor, tagline |

The card is served from the same origin as the page (no CORS issues, no CDN caching complications).

---

## 3. Platform-Specific Behaviour

### WhatsApp
- Uses Open Graph tags (`og:title`, `og:description`, `og:image`)
- Shows image on the left, title and description on the right (landscape card)
- First share caches the preview; subsequent shares of the same URL use the cached version
- **Tip:** WhatsApp's cache can be stale for hours. If the preview doesn't update after a deployment, wait or share a URL with a query parameter (`?v=2`) to force a fresh crawl

### Facebook
- Uses Open Graph tags
- Debugger tool: https://developers.facebook.com/tools/debug/
- Shows a large card with image on top
- Caches aggressively — use the debugger to scrape fresh metadata

### LinkedIn
- Uses Open Graph tags
- Post Inspector: https://www.linkedin.com/post-inspector/
- Shows a large card with image
- Also caches aggressively

### X (Twitter)
- Uses Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
- Falls back to Open Graph if Twitter tags are missing
- Card Validator: https://cards-dev.twitter.com/validator (deprecated but still functional)
- `summary_large_image` gives a full-width image card

### Slack
- Uses Open Graph tags
- Shows a compact preview with image thumbnail
- No caching — always fresh

### iMessage / Messages
- Uses Open Graph tags (since iOS 14)
- Shows a rich preview with image

### Telegram
- Uses Open Graph tags
- Bot: @WebpageBot for debugging

---

## 4. How Hatsi360 Ensures Correct Previews

### Server-side rendering
All metadata is rendered in the server component's HTML. No JavaScript is needed to produce the tags. Social crawlers do not execute JavaScript, so client-side metadata injection would fail.

### Absolute URLs
The root layout sets `metadataBase: new URL(siteUrl)`, which makes all canonical URLs and image URLs absolute. Social crawlers require absolute URLs.

### Consistent card
Every public page references the same social card image. This means any shared Hatsi360 link shows a professional, on-brand preview — even if the page is a deep commodity profile.

### Twitter card type
`summary_large_image` is used on every page. This produces a full-width image card on X, which gets more engagement than the small `summary` card.

### Image alt text
Every OG image has an `alt` attribute describing the card content. This is used by screen readers and as a fallback if the image fails to load.

---

## 5. Testing Previews

### Before deployment
1. Run `npm run build` to confirm metadata compiles
2. Start the dev server and curl a page: `curl -s http://localhost:3000 | grep -i "og:"`
3. Verify `og:title`, `og:description`, `og:image`, `twitter:card` are present

### After deployment
1. **Facebook:** https://developers.facebook.com/tools/debug/ — paste the production URL, click "Scrape Again"
2. **LinkedIn:** https://www.linkedin.com/post-inspector/ — paste the URL
3. **WhatsApp:** Share the link with yourself; if the preview is stale, append `?v=2` to force a re-crawl
4. **X:** Post the link in a draft tweet and check the preview

### Expected preview for homepage

```
Image:  [Hatsi360 social card with logo and tagline]
Title:  Hatsi360 Markets — Agricultural Intelligence for Better Decisions
Site:   hatsi360-app.vercel.app (or production domain)
Desc:   Explore African agricultural markets through commodity prices,
        market trends, price analytics, agricultural research and trade
        intelligence. Discover the information you need to make more
        informed agricultural business decisions.
```

### Expected preview for a commodity page

```
Image:  [Same Hatsi360 social card]
Title:  Maize Prices & Market Intelligence | Hatsi360 Markets
Site:   hatsi360-app.vercel.app
Desc:   Explore Maize prices, available market observations, historical
        trends and related agricultural intelligence on Hatsi360 Markets.
```

---

## 6. Common Issues and Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| No preview at all | Page returns 302/redirect | Ensure the URL resolves to a 200 OK page |
| Wrong image | Cached by the platform | Use Facebook Debugger / LinkedIn Inspector to re-scrape |
| No title | Missing `og:title` | Check page metadata export |
| Image not loading | Image blocked by auth or robots | Ensure `/brand/` is allowed in robots; image must be publicly accessible |
| Preview shows old content | Platform cache | Wait or use debugging tools to force re-scrape |
| WhatsApp shows old preview | WhatsApp cache is long-lived | Append `?v=2` query param to force fresh crawl |

---

## 7. Future Enhancements

| Enhancement | Benefit | Effort |
|-------------|---------|--------|
| Per-commodity social images (with commodity photo) | More relevant preview when sharing commodity pages | Medium |
| Per-report social images (with report cover) | More relevant preview when sharing reports | Medium |
| Dynamic OG image generation (next/og) | Automatic branded images for any page | High |
| Structured data for Articles (`@type: Article`) | Richer Google results for reports | Low |
