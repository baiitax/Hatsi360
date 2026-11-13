import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import rawCatalogue from '@/lib/images/catalogue.json';
import {
  SERVED_IMAGE_PATHS,
  SERVED_IMAGES,
} from '@/lib/images/generated-manifest';
import {
  assetPath,
  getAsset,
  getCommodityImage,
  getMarketImage,
  getPageImage,
  listAssetIds,
  resolveImage,
} from '@/lib/images/registry';

const ROOT = process.cwd();
const catalogue = rawCatalogue as unknown as {
  assets: Record<string, Record<string, unknown>>;
  commodities: Record<string, string>;
  markets: Record<string, string>;
  categories: Record<string, string>;
  pages: Record<string, string>;
  insights: Record<string, string>;
};

const servedIds = new Set(Object.keys(SERVED_IMAGE_PATHS));
const publicDir = join(ROOT, 'public');

/* ------------------------------------------------------------ integrity -- */

describe('image registry integrity', () => {
  it('registers every catalogue asset under a unique id', () => {
    const ids = Object.keys(catalogue.assets);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(40);
  });

  it('gives every asset the fields the interface depends on', () => {
    for (const [id, asset] of Object.entries(catalogue.assets)) {
      expect(asset.source, `${id} has no source original`).toBeTruthy();
      expect(asset.folder, `${id} has no folder`).toBeTruthy();
      expect(asset.name, `${id} has no served name`).toBeTruthy();
      expect(typeof asset.alt, `${id} has no alt text`).toBe('string');
      expect(asset.licence, `${id} has no licence`).toBeTruthy();
      expect(asset.width, `${id} has no width`).toBeGreaterThan(0);
      expect(asset.height, `${id} has no height`).toBeGreaterThan(0);
    }
  });

  it('never serves an image from a remote host', () => {
    // An unstable external URL is a broken image waiting for someone else to
    // move a file. Everything the platform shows is a file it owns.
    for (const id of listAssetIds()) {
      const asset = getAsset(id);
      if (!asset) continue;
      expect(asset.src.startsWith('/images/hatsi360/'), `${id} serves ${asset.src}`).toBe(true);
      expect(asset.src.startsWith('http'), `${id} serves a remote URL`).toBe(false);
    }
  });

  it('points every served asset at a file that exists', () => {
    for (const path of Object.values(SERVED_IMAGE_PATHS)) {
      const absolute = join(publicDir, path.replace(/^\//, ''));
      expect(existsSync(absolute), `missing served file: ${path}`).toBe(true);
    }
  });

  it('records dimensions and a weight that match the file on disk', () => {
    for (const [path, served] of Object.entries(SERVED_IMAGES)) {
      const absolute = join(publicDir, path.replace(/^\//, ''));
      if (!existsSync(absolute)) continue;
      const bytes = statSync(absolute).size;
      expect(served.bytes, `${path} records ${served.bytes} bytes but is ${bytes}`).toBe(bytes);
      expect(served.width).toBeGreaterThan(0);
      expect(served.height).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------- alt text -- */

describe('image alternative text', () => {
  it('requires alt text on every asset that carries information', () => {
    // A decorative image may be silent. Anything that illustrates a commodity,
    // a market or a page must describe what it shows — an empty alt on a
    // commodity card leaves a screen-reader user with a card and no subject.
    for (const [id, asset] of Object.entries(catalogue.assets)) {
      if (asset.role === 'ui') continue;
      if (asset.decorative === true) continue;
      expect((asset.alt as string).length, `${id} has no alt text`).toBeGreaterThan(10);
    }
  });

  it('never describes a generic image as a photograph of a named market', () => {
    // The honesty rule. Every market asset is `representative`, because
    // Hatsi360 holds licensed photography of *kinds* of market, not verified
    // photographs of these eleven named ones. An asset that claimed `exact`
    // here would be asserting something the platform cannot support.
    for (const [slug, assetId] of Object.entries(catalogue.markets)) {
      const asset = catalogue.assets[assetId];
      expect(asset, `no asset for market ${slug}`).toBeTruthy();
      expect(asset.representation, `market ${slug} is not marked representative`).toBe(
        'representative',
      );
    }
  });
});

/* --------------------------------------------------- designation mapping -- */

describe('image-to-designation mapping', () => {
  it('files every commodity image under the commodity role', () => {
    for (const [slug, assetId] of Object.entries(catalogue.commodities)) {
      const asset = catalogue.assets[assetId];
      expect(asset, `commodity ${slug} has no asset`).toBeTruthy();
      expect(asset.role, `commodity ${slug} is filed as ${asset.role}`).toBe('commodity');
    }
  });

  it('files every market image under the market role', () => {
    for (const [slug, assetId] of Object.entries(catalogue.markets)) {
      const asset = catalogue.assets[assetId];
      expect(asset, `market ${slug} has no asset`).toBeTruthy();
      expect(asset.role, `market ${slug} is filed as ${asset.role}`).toBe('market');
    }
  });

  it('resolves a commodity by slug through the same call the components use', () => {
    // Asserting through `getCommodityImage` rather than the catalogue keeps
    // this honest: a test that reads the JSON can pass while the component
    // falls back to the placeholder.
    const maize = getCommodityImage('maize-yellow');
    expect(maize.src).toBe('/images/hatsi360/commodities/maize-yellow.jpg');
    expect(maize.id).toBe('commodity.maize-yellow');
    expect(maize.alt.length).toBeGreaterThan(10);
  });

  it('resolves every registered market to its own file, not a shared one', () => {
    const seen = new Map<string, string>();
    for (const slug of Object.keys(catalogue.markets)) {
      const asset = getMarketImage(slug);
      expect(asset.src, `market ${slug} falls back to the placeholder`).not.toBe(
        '/images/hatsi360/ui/placeholder.jpg',
      );
      const previous = seen.get(asset.src);
      expect(previous, `markets ${previous} and ${slug} share ${asset.src}`).toBeUndefined();
      seen.set(asset.src, slug);
    }
  });

  it('gives every page key an asset that exists', () => {
    for (const key of Object.keys(catalogue.pages)) {
      const image = getPageImage(key);
      expect(image.src, `page key ${key} falls back to the placeholder`).not.toBe(
        '/images/hatsi360/ui/placeholder.jpg',
      );
    }
  });

  it('never resolves an unknown id to anything but the neutral placeholder', () => {
    const fallback = resolveImage('does.not.exist');
    expect(fallback.id).toBe('ui.placeholder');
    expect(fallback.decorative).toBe(true);
    expect(fallback.representation).toBe('representative');
    expect(resolveImage(null).id).toBe('ui.placeholder');
    expect(resolveImage(undefined).id).toBe('ui.placeholder');
  });
});

/* ------------------------------------------------------- missing assets -- */

describe('missing image detection', () => {
  it('reports exactly the assets still waiting on a source original', () => {
    // This is the audit's live gap list. It is an assertion, not a comment:
    // when the last source is generated the list empties and this test starts
    // demanding zero.
    const waiting = Object.keys(catalogue.assets).filter((id) => !servedIds.has(id));
    expect(waiting.sort()).toEqual([]);
  });

  it('keeps a source original on disk for every registered asset', () => {
    const sources = new Set(readdirSync(join(ROOT, 'assets', 'image-sources')));
    const missing: string[] = [];
    for (const [id, asset] of Object.entries(catalogue.assets)) {
      if (!sources.has(asset.source as string)) missing.push(`${id} (${asset.source})`);
    }
    expect(missing, `no source original for: ${missing.join(', ')}`).toEqual([]);
  });
});

/* ------------------------------------------------------------- duplicates -- */

function walkFiles(directory: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (['node_modules', '.next', '.git', '.arena'].includes(entry)) continue;
      found.push(...walkFiles(full, extensions));
    } else if (extensions.some((extension) => entry.endsWith(extension))) {
      found.push(full);
    }
  }
  return found;
}

describe('duplicate image detection', () => {
  it('holds no two identical files in the served library', () => {
    // Exact duplicates by content hash. Two files with the same bytes are one
    // image shipped twice, whatever their names say.
    const files = walkFiles(join(publicDir, 'images', 'hatsi360'), ['.jpg', '.jpeg', '.png', '.webp']);
    const byHash = new Map<string, string[]>();
    for (const file of files) {
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
      const list = byHash.get(hash) ?? [];
      list.push(relative(ROOT, file));
      byHash.set(hash, list);
    }
    const duplicates: string[] = [];
    for (const paths of byHash.values()) {
      if (paths.length > 1) duplicates.push(paths.join(' == '));
    }
    expect(duplicates, `identical files: ${duplicates.join(' | ')}`).toEqual([]);
  });

  it('never files two different commodities under the same photograph', () => {
    // The duplication that matters: one generic grain picture doing duty for
    // maize, sesame, ginger and hibiscus.
    //
    // Reuse is legitimate where the records genuinely are the same thing. The
    // three Gum Arabic grades are one commodity at three grades, and
    // `paddy-rice-duplicate-record` is an inactive data-quality artifact of
    // `paddy-rice`. Those are named here rather than left as silent exceptions,
    // so the rule stays "one photograph per commodity" and the exceptions stay
    // visible and reviewable.
    const SHARED_ON_PURPOSE: Record<string, string> = {
      'gum-arabic-gr-ii': 'the same commodity as gum-arabic-gr-i, at another grade',
      'gum-arabic-gr-iii': 'the same commodity as gum-arabic-gr-i, at another grade',
      'paddy-rice-duplicate-record': 'an inactive duplicate of paddy-rice',
    };

    const byAsset = new Map<string, string[]>();
    for (const [slug, assetId] of Object.entries(catalogue.commodities)) {
      const list = byAsset.get(assetId) ?? [];
      list.push(slug);
      byAsset.set(assetId, list);
    }

    for (const [assetId, slugs] of byAsset) {
      // The first slug is the record the photograph belongs to. Every further
      // slug must be an explained reuse, not an accident.
      const [primary, ...others] = slugs;
      const unexplained = others.filter((slug) => !SHARED_ON_PURPOSE[slug]);
      expect(
        unexplained,
        `${assetId} is shared by ${slugs.join(', ')} beyond the explained reuse of ${primary}`,
      ).toEqual([]);
      for (const slug of others) {
        expect(SHARED_ON_PURPOSE[slug], `${assetId} shared with ${slug} for no stated reason`)
          .toBeTruthy();
      }
    }
  });

  it('never files two different markets under the same photograph', () => {
    const byAsset = new Map<string, string[]>();
    for (const [slug, assetId] of Object.entries(catalogue.markets)) {
      const list = byAsset.get(assetId) ?? [];
      list.push(slug);
      byAsset.set(assetId, list);
    }
    for (const [assetId, slugs] of byAsset) {
      expect(slugs, `${assetId} is shared by ${slugs.join(', ')}`).toHaveLength(1);
    }
  });

  it('keeps the served library inside its byte budget', () => {
    const over: string[] = [];
    for (const [path, served] of Object.entries(SERVED_IMAGES)) {
      if (served.bytes > 320 * 1024) over.push(`${path} is ${served.bytes} bytes`);
    }
    expect(over, `over budget: ${over.join(', ')}`).toEqual([]);
  });
});

/* ------------------------------------------------------------- sourcing -- */

describe('image sourcing', () => {
  it('declares a licence on every asset', () => {
    for (const [id, asset] of Object.entries(catalogue.assets)) {
      expect(asset.licence, `${id} has no licence`).toBeTruthy();
      expect(String(asset.licence).length).toBeGreaterThan(10);
    }
  });

  it('discloses generated imagery as generated, not as a photograph of record', () => {
    // Every asset in this library is a generated editorial illustration. The
    // licence says so, uniformly, so nothing can be passed off as a verified
    // photograph of a named market or an observed collection.
    for (const [id, asset] of Object.entries(catalogue.assets)) {
      expect(String(asset.licence)).toMatch(/generated editorial illustration/i);
    }
  });

  it('resolves an asset path through the registry, never a hard-coded string', () => {
    expect(assetPath('commodity.maize-yellow')).toBe(
      '/images/hatsi360/commodities/maize-yellow.jpg',
    );
    expect(assetPath('nope')).toBeNull();
  });
});
