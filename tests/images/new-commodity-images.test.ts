import { describe, expect, it } from 'vitest';
import { getCommodityImage, getInsightImage, getMarketImage } from '@/lib/images/registry';

/**
 * The three commodity images built to close a real gap.
 *
 * These commodities had no source original, so their cards rendered the
 * neutral placeholder — the one place the brand brief forbids a generic
 * fallback ("Never use the same generic image for different commodities
 * unless no suitable image is available and the fallback is clearly
 * appropriate").
 *
 * The assertions go through `getCommodityImage`, the function the components
 * actually call, keyed by the canonical slug from the catalogue. That is the
 * path that was broken; asserting on the asset id directly would have passed
 * even while the cards were still showing a placeholder.
 */
describe('the commodity images built to close a real gap', () => {
  const cases = [
    { slug: 'dried-ginger', subject: 'Dried ginger' },
    { slug: 'gum-arabic-gr-i', subject: 'Gum Arabic resin' },
    { slug: 'gum-arabic-gr-ii', subject: 'Gum Arabic resin' },
    { slug: 'gum-arabic-gr-iii', subject: 'Gum Arabic resin' },
    { slug: 'sweet-potato', subject: 'Fresh sweet potato tubers' },
  ];

  for (const { slug, subject } of cases) {
    it(`resolves a real photograph for ${slug}`, () => {
      const asset = getCommodityImage(slug);
      expect(asset.src).not.toContain('placeholder');
      expect(asset.subject).toBe(subject);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      // The alt text must describe the actual subject, not a generic grain.
      expect(asset.alt.length).toBeGreaterThan(20);
    });
  }

  it('records each as a generated editorial illustration, owned by Hatsi360', () => {
    // Brief §19.2 permits generated imagery only when it is "not presented as
    // documentary evidence". The licence string is what carries that
    // disclosure, and it is already in the catalogue for every commodity
    // asset — these three now have files to match it.
    for (const { slug } of cases) {
      const asset = getCommodityImage(slug);
      expect(asset.licence).toContain('generated editorial illustration');
      expect(asset.credit).toBe('Hatsi360');
    }
  });

  it('treats a photograph of the commodity as an exact representation of it', () => {
    // A picture of a ginger rhizome *is* ginger, so `exact` is the honest
    // value. `representative` is reserved for a market photograph standing in
    // for a named market it does not show.
    for (const { slug } of cases) {
      expect(getCommodityImage(slug).representation).toBe('exact');
    }
  });

  it('keeps every served derivative inside the byte budget', () => {
    // The build script enforces a 320 KB ceiling per served file. The value
    // here is read from the generated manifest, which the script writes from
    // the files it actually produced, so it cannot drift from disk.
    for (const { slug } of cases) {
      expect(getCommodityImage(slug).bytes).toBeLessThanOrEqual(320 * 1024);
    }
  });
});

/**
 * The insight and market images built in the same pass.
 *
 * Insight images back real published articles — an article card with a
 * placeholder is a visible content gap. Market images are registered as
 * `representative`, which is the honest label for a photograph that shows
 * that *kind* of trading environment rather than the named market itself.
 * Brief §19.4 permits exactly this: "If a specific location photograph is
 * unavailable, use a generic but accurately captioned agricultural market
 * image."
 */
describe('the insight and market images built in the same pass', () => {
  const INSIGHTS = [
    'future-of-sustainable-farming-in-nigeria',
    'guide-to-yam-cultivation-for-maximum-yield',
    'impact-of-fuel-prices-on-food-transportation',
    'understanding-market-price-fluctuations-for-cassava',
  ];

  for (const slug of INSIGHTS) {
    it(`resolves a real feature image for the article ${slug}`, () => {
      const asset = getInsightImage(slug);
      expect(asset.src).not.toContain('placeholder');
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.bytes).toBeLessThanOrEqual(320 * 1024);
    });
  }

  const MARKETS = ['lafia-modern-market', 'sokoto-central-market'];

  for (const slug of MARKETS) {
    it(`resolves a real image for ${slug}`, () => {
      const asset = getMarketImage(slug);
      expect(asset.src).not.toContain('placeholder');
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.bytes).toBeLessThanOrEqual(320 * 1024);
    });
  }

  it('labels a market photograph as representative, never as the named market', () => {
    // The registry already carries this flag. It is what stops a photograph of
    // a covered market hall being presented as a verified photograph of Lafia
    // Modern Market, which brief §19.4 forbids.
    for (const slug of MARKETS) {
      expect(getMarketImage(slug).representation).toBe('representative');
    }
  });
});
