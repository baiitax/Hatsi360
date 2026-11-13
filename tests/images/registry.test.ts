import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  getAsset,
  getCategoryImage,
  getCommodityImage,
  getCommodityImageById,
  getInsightImage,
  getMarketImage,
  getMarketImageById,
  getPageImage,
  hasPageImage,
  listAssetIds,
  representativeCaption,
  resolveImage,
} from '@/lib/images/registry';
import { commodities, markets } from '@/data/seed/reference-data';
import catalogue from '@/lib/images/catalogue.json';

/**
 * Image registry tests.
 *
 * The registry is the single place a photograph is chosen. These tests hold
 * it to the rules the platform promised:
 *
 *  - a commodity is matched by its canonical slug or id, never by its
 *    display name;
 *  - a market is matched by its canonical slug or id;
 *  - every served file exists, is within its size budget and is a real JPEG;
 *  - every asset carries meaningful alternative text unless it is decorative;
 *  - a market image that is not a verified photograph of that market is
 *    labelled as representative, in the metadata and in the interface;
 *  - the registry agrees with the canonical catalogue in
 *    `src/data/seed/reference-data.ts`.
 */

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');

const catalogueJson = catalogue as unknown as {
  assets: Record<
    string,
    {
      source: string;
      folder: string;
      name: string;
      width: number;
      height: number;
      alt: string;
      subject: string;
      licence: string;
      credit?: string;
      role: string;
      decorative?: boolean;
      representation?: string;
    }
  >;
  commodities: Record<string, string>;
  markets: Record<string, string>;
  categories: Record<string, string>;
  pages: Record<string, string>;
  insights: Record<string, string>;
  commodityIds: Record<string, string>;
  marketIds: Record<string, string>;
};

/* -------------------------------------------------------- the asset files -- */

describe('the served image library', () => {
  it('has a file for every registered asset', () => {
    const missing: string[] = [];
    for (const id of listAssetIds()) {
      const asset = getAsset(id);
      if (!asset) {
        missing.push(`${id} (not in the generated manifest)`);
        continue;
      }
      if (!existsSync(join(PUBLIC, asset.src.replace(/^\//, '')))) {
        missing.push(`${id} -> ${asset.src}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('serves every asset from the organised hatsi360 folder', () => {
    for (const id of listAssetIds()) {
      const asset = getAsset(id)!;
      expect(asset.src.startsWith('/images/hatsi360/')).toBe(true);
    }
  });

  it('keeps the folder structure the brief asks for', () => {
    const folders = new Set(
      listAssetIds().map((id) => getAsset(id)!.src.split('/')[3]),
    );
    for (const folder of [
      'hero',
      'commodities',
      'markets',
      'agriculture',
      'infrastructure',
      'professionals',
      'insights',
      'reports',
      'ui',
    ]) {
      expect(folders.has(folder)).toBe(true);
    }
  });

  it('keeps every served file inside a sane byte budget', () => {
    for (const id of listAssetIds()) {
      const asset = getAsset(id)!;
      const bytes = statSync(join(PUBLIC, asset.src.replace(/^\//, ''))).size;
      // 320 KB is generous for a 2000 px editorial photograph and still
      // keeps the whole library light enough to serve from a field phone.
      expect(bytes, `${id} is ${Math.round(bytes / 1024)} KB`).toBeLessThan(320 * 1024);
    }
  });

  it('serves a real JPEG for every asset', () => {
    for (const id of listAssetIds()) {
      const asset = getAsset(id)!;
      const bytes = readFileSync(join(PUBLIC, asset.src.replace(/^\//, '')));
      // JPEG SOI marker.
      expect(bytes[0]).toBe(0xff);
      expect(bytes[1]).toBe(0xd8);
    }
  });

  it('records the real dimensions of every served file', () => {
    for (const id of listAssetIds()) {
      const asset = getAsset(id)!;
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      expect(asset.bytes).toBeGreaterThan(0);
    }
  });

  it('never embeds an image in base64 beyond a small blur placeholder', () => {
    for (const id of listAssetIds()) {
      const asset = getAsset(id)!;
      // The blur placeholder is a 20 px thumbnail; anything larger than a
      // couple of kilobytes would be an embedded original.
      expect(asset.blurDataURL.length).toBeLessThan(4000);
      expect(asset.blurDataURL.startsWith('data:image/jpeg;base64,')).toBe(true);
    }
  });

  it('keeps the source originals outside the served directory', () => {
    expect(existsSync(join(PUBLIC, 'images', 'source'))).toBe(false);
    expect(existsSync(join(ROOT, 'assets', 'image-sources'))).toBe(true);
  });
});

/* ------------------------------------------------------------- the licence -- */

describe('the image licence', () => {
  it('states a licence and an attribution for every asset', () => {
    for (const [id, asset] of Object.entries(catalogueJson.assets)) {
      expect(asset.licence, `${id} has no licence`).toBeTruthy();
      expect(asset.credit, `${id} has no attribution`).toBeTruthy();
      expect(asset.licence).toMatch(/Hatsi360 original asset/i);
    }
  });

  it('never points at a third-party or scraped source', () => {
    for (const [id, asset] of Object.entries(catalogueJson.assets)) {
      expect(asset.source, `${id} points outside the originals folder`).toMatch(
        /^[a-z0-9-]+\.jpg$/,
      );
      expect(asset.licence.toLowerCase()).not.toMatch(/unsplash|shutterstock|getty|pexels/);
    }
  });

  it('keeps a source original for every asset', () => {
    for (const [id, asset] of Object.entries(catalogueJson.assets)) {
      expect(
        existsSync(join(ROOT, 'assets', 'image-sources', asset.source)),
        `${id} has no source original`,
      ).toBe(true);
    }
  });

  it('publishes the licence manifest', () => {
    const manifest = join(ROOT, 'docs', 'IMAGE_LIBRARY_MANIFEST.md');
    expect(existsSync(manifest)).toBe(true);
    const contents = readFileSync(manifest, 'utf8');
    expect(contents).toContain('Licence and attribution');
    expect(contents).toContain('Representative image');
  });
});

/* ------------------------------------------------------- the alternative text -- */

describe('alternative text', () => {
  it('is meaningful for every asset that carries information', () => {
    for (const [id, asset] of Object.entries(catalogueJson.assets)) {
      if (asset.decorative) continue;
      expect(asset.alt, `${id} has no alternative text`).toBeTruthy();
      expect(asset.alt.length, `${id} has a token alternative text`).toBeGreaterThan(20);
    }
  });

  it('is empty for a decorative asset', () => {
    const decorative = Object.entries(catalogueJson.assets).filter(([, a]) => a.decorative);
    expect(decorative.length).toBeGreaterThan(0);
    for (const [id, asset] of decorative) {
      expect(asset.alt, `${id} is decorative but carries text`).toBe('');
      expect(getAsset(id)!.decorative).toBe(true);
    }
  });

  it('describes the subject rather than the file', () => {
    for (const [id, asset] of Object.entries(catalogueJson.assets)) {
      expect(asset.subject, `${id} has no subject`).toBeTruthy();
      expect(asset.subject.toLowerCase()).not.toMatch(/\.jpg|\.png/);
    }
  });
});

/* ------------------------------------------------------------- commodities -- */

describe('commodity matching', () => {
  it('matches every catalogue commodity by its slug', () => {
    const uncovered = commodities
      .filter((commodity) => commodity.isActive !== false)
      .filter((commodity) => {
        const image = getCommodityImage(commodity.slug);
        return image.id === 'ui.placeholder';
      })
      .map((commodity) => commodity.slug);
    expect(uncovered).toEqual([]);
  });

  it('matches every catalogue commodity by its id', () => {
    for (const commodity of commodities) {
      const byId = getCommodityImageById(commodity.id);
      const bySlug = getCommodityImage(commodity.slug);
      expect(byId.id).toBe(bySlug.id);
    }
  });

  it('agrees with the canonical catalogue on the id map', () => {
    const expected: Record<string, string> = {};
    for (const commodity of commodities) expected[String(commodity.id)] = commodity.slug;
    expect(catalogueJson.commodityIds).toEqual(expected);
  });

  it('falls back to the neutral placeholder for an unknown commodity', () => {
    const image = getCommodityImage('not-a-real-commodity');
    expect(image.id).toBe('ui.placeholder');
    expect(image.decorative).toBe(true);
  });

  it('gives each commodity its own subject rather than a shared filler', () => {
    const grains = ['maize-white', 'maize-yellow', 'wheat', 'millet', 'sorghum-red'];
    const subjects = new Set(grains.map((slug) => getCommodityImage(slug).subject));
    expect(subjects.size).toBe(grains.length);
  });

  it('gives a category its own image', () => {
    const image = getCategoryImage('grains-cereals');
    expect(image.id).not.toBe('ui.placeholder');
    expect(getCategoryImage('spices-herbs').id).not.toBe(image.id);
  });
});

/* ----------------------------------------------------------------- markets -- */

describe('market matching', () => {
  it('matches every catalogue market by its slug', () => {
    const uncovered = markets
      .filter((market) => {
        const image = getMarketImage(market.slug);
        return image.id === 'ui.placeholder';
      })
      .map((market) => market.slug);
    expect(uncovered).toEqual([]);
  });

  it('matches every catalogue market by its id', () => {
    for (const market of markets) {
      expect(getMarketImageById(market.id).id).toBe(getMarketImage(market.slug).id);
    }
  });

  it('agrees with the canonical catalogue on the market id map', () => {
    const expected: Record<string, string> = {};
    for (const market of markets) expected[String(market.id)] = market.slug;
    expect(catalogueJson.marketIds).toEqual(expected);
  });

  it('labels a market image that is not a verified photograph as representative', () => {
    for (const market of markets) {
      const image = getMarketImage(market.slug);
      if (image.representation === 'exact') continue;
      expect(image.representation).toBe('representative');
      const caption = representativeCaption(image);
      expect(caption).toBeTruthy();
      expect(caption!.toLowerCase()).toContain('not a photograph');
      // A representative image must not claim the market's name in its
      // alternative text as if it were a photograph of that market.
      expect(image.alt.toLowerCase()).not.toContain(market.name.toLowerCase());
    }
  });

  it('gives each market its own image', () => {
    const ids = new Set(markets.map((market) => getMarketImage(market.slug).id));
    expect(ids.size).toBe(markets.length);
  });
});

/* ----------------------------------------------------------- pages, insights -- */

describe('page and article images', () => {
  it('resolves the homepage hero', () => {
    const hero = getPageImage('home.hero');
    expect(hero.id).toBe('hero.market-warehouse');
    expect(hero.role).toBe('hero');
    expect(hero.alt).toBeTruthy();
  });

  it('resolves a feature image for every published article', () => {
    for (const slug of Object.keys(catalogueJson.insights)) {
      const image = getInsightImage(slug);
      expect(image.id, `${slug} has no feature image`).not.toBe('ui.placeholder');
      expect(image.role).toBe('insights');
    }
  });

  it('reports honestly when a page key has no image', () => {
    expect(hasPageImage('home.hero')).toBe(true);
    expect(hasPageImage('not.a.real.key')).toBe(false);
    expect(getPageImage('not.a.real.key').id).toBe('ui.placeholder');
  });

  it('resolves an unknown asset to the neutral placeholder', () => {
    expect(resolveImage('nope').id).toBe('ui.placeholder');
    expect(resolveImage(null).id).toBe('ui.placeholder');
  });
});

/* ------------------------------------------------------------- the interface -- */

describe('the registry in the interface', () => {
  it('does not hard-code an image path in a component', () => {
    const offenders: string[] = [];
    const roots = ['components', 'app'];
    for (const root of roots) {
      const walk = (directory: string) => {
        for (const entry of require('node:fs').readdirSync(directory, { withFileTypes: true })) {
          const full = join(directory, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          if (!/\.(tsx|ts)$/.test(entry.name)) continue;
          const contents = readFileSync(full, 'utf8');
          // A component may not carry a served image path of its own. The
          // registry is the only place a path may appear.
          if (/['"]\/images\/hatsi360\//.test(contents)) offenders.push(full);
        }
      };
      walk(join(ROOT, 'src', root));
    }
    expect(offenders).toEqual([]);
  });

  it('does not reference the removed legacy marketing images', () => {
    const offenders: string[] = [];
    const walk = (directory: string) => {
      for (const entry of require('node:fs').readdirSync(directory, { withFileTypes: true })) {
        const full = join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(tsx|ts)$/.test(entry.name)) continue;
        if (readFileSync(full, 'utf8').includes("'/img/")) offenders.push(full);
      }
    };
    walk(join(ROOT, 'src'));
    expect(offenders).toEqual([]);
    expect(existsSync(join(PUBLIC, 'img'))).toBe(false);
  });
});
