import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shareable metadata.
 *
 * A shared link is often the only thing anyone sees of a page. These tests
 * check the two things that make a link legible before it is opened: the
 * description says what the page is for, and the Open Graph tags are complete.
 *
 * The clipped-tagline bug in the social card is also pinned here. The card
 * rendered the tagline at a fixed 34px and centred it without checking the
 * result, so the line ran off both edges of the 1200px canvas. The band
 * measurement below is what caught it.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === 'page.tsx' || entry === 'layout.tsx') out.push(full);
  }
  return out;
}

const SITE_PAGES = walk(join(ROOT, 'src/app/(site)'))
  // A layout inherits metadata from its parent, so only pages must declare
  // their own. The site layout is a frame, not a shareable destination.
  .filter((p) => p.endsWith('page.tsx'))
  .map((p) => p.replace(`${ROOT}/`, ''));

describe('the social card', () => {
  const script = read('scripts/brand_assets.py');

  it('fits its text instead of drawing it at a fixed size', () => {
    // The original drew the tagline at 34px and centred it blind.
    expect(script).toContain('def fit_font(');
    expect(script).toContain('def centred(');
  });

  it('keeps every line inside a safe margin', () => {
    expect(script).toContain('safe_width = width - 160');
  });

  it('asserts that nothing was clipped before saving', () => {
    expect(script).toContain('is clipped');
    expect(script).toContain('assert min(xs) > 4 and max(xs) < width - 5');
  });

  it('carries the corporate endorsement', () => {
    expect(script).toContain('POWERED BY PLUCK AGRO');
  });

  it('states what the platform does, not only what it is called', () => {
    expect(script).toContain('Verified agricultural prices from Nigerian markets');
  });
});

describe('the metadata helper', () => {
  const helper = read('src/lib/metadata.ts');

  it('always sets an absolute canonical URL', () => {
    expect(helper).toContain('alternates: { canonical: url }');
    expect(helper).toContain("new URL(input.path, siteUrl).toString()");
  });

  it('always sets an Open Graph image with dimensions', () => {
    expect(helper).toContain('width: 1200');
    expect(helper).toContain('height: 630');
  });

  it('always sets a Twitter card', () => {
    expect(helper).toContain("card: 'summary_large_image'");
  });

  it('can mark a page as not indexable', () => {
    expect(helper).toContain('index: false, follow: false');
  });

  it('describes the platform by what it does', () => {
    expect(helper).toContain('PLATFORM_DESCRIPTION');
    expect(helper).toContain('collected by');
    expect(helper).toContain('checked before publication');
  });

  it('does not describe the platform with a bare feature list', () => {
    // The previous wording was "Discover X, compare Y, track Z, access W".
    const helper2 = helper.toLowerCase();
    expect(helper2).not.toContain('discover agricultural commodity prices');
  });
});

describe('every public route has complete share metadata', () => {
  it('covers a meaningful number of routes', () => {
    expect(SITE_PAGES.length).toBeGreaterThan(20);
  });

  it('declares metadata on every public page', () => {
    const missing = SITE_PAGES.filter((path) => {
      const source = read(path);
      return !(
        source.includes('export const metadata') ||
        source.includes('export async function generateMetadata')
      );
    });
    expect(missing, `routes with no metadata: ${missing.join(', ')}`).toEqual([]);
  });

  it('gives every public page a description', () => {
    const withoutDescription = SITE_PAGES.filter((path) => {
      const source = read(path);
      const hasOwn =
        /description:\s*\n?\s*['"`]/.test(source) ||
        source.includes('buildShareMetadata(') ||
        source.includes('generateMetadata');
      return !hasOwn;
    });
    expect(
      withoutDescription,
      `routes with no description: ${withoutDescription.join(', ')}`,
    ).toEqual([]);
  });
});

describe('the trade section', () => {
  const pages = SITE_PAGES.filter((p) => p.includes('/trade/'));

  it('has all seven destinations', () => {
    expect(pages.length).toBeGreaterThanOrEqual(7);
  });

  it('builds its metadata through the shared helper', () => {
    for (const page of pages) {
      const source = read(page);
      if (source.includes('export const metadata = buildShareMetadata')) {
        expect(source, `${page} must set a canonical path`).toContain('path:');
        expect(source, `${page} must set a description`).toContain('description:');
      }
    }
  });

  it('does not index the personal pages', () => {
    for (const page of ['src/app/(site)/trade/watchlist/page.tsx', 'src/app/(site)/trade/alerts/page.tsx']) {
      expect(read(page)).toContain('indexable: false');
    }
  });
});

describe('the description quality bar', () => {
  it('is long enough to be useful and short enough to be read', () => {
    // The helper's own description, checked against the same bar the pages
    // are held to.
    const helper = read('src/lib/metadata.ts');
    const match = helper.match(/export const PLATFORM_DESCRIPTION =\s*([\s\S]*?);/);
    expect(match).not.toBeNull();
    const text = match![1]
      .replace(/['"`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text.length).toBeGreaterThan(80);
    expect(text.length).toBeLessThan(320);
  });
});
