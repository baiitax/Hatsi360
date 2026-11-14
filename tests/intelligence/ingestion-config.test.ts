import { describe, expect, it } from 'vitest';
import { getFAOSTATItemMap, getSupportedCountries } from '@/lib/intelligence/ingestion/faostat';
import { getUSDACommodityMap } from '@/lib/intelligence/ingestion/usda-fas';
import { getSupportedSources } from '@/lib/intelligence/ingestion/orchestrator';

/**
 * Intelligence Ingestion — Configuration Tests
 *
 * These tests pin the external source mappings that the ingestion
 * pipeline depends on. If a commodity slug is renamed in our system,
 * these tests will catch the mismatch before it corrupts data.
 *
 * Phase 06 — evidence-backed intelligence requires that every mapping
 * between external codes and our internal slugs is verified and stable.
 */

describe('FAOSTAT item mapping', () => {
  const map = getFAOSTATItemMap();

  it('maps all 20 expected commodities', () => {
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(20);
  });

  it('maps rice to its FAOSTAT item code', () => {
    expect(map['27']).toBe('rice');
  });

  it('maps maize to its FAOSTAT item code', () => {
    expect(map['56']).toBe('maize');
  });

  it('maps cassava to its FAOSTAT item code', () => {
    expect(map['116']).toBe('cassava');
  });

  it('does not contain duplicate commodity slugs', () => {
    const slugs = Object.values(map);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it('all mapped slugs are non-empty strings', () => {
    for (const [code, slug] of Object.entries(map)) {
      expect(slug).toBeTruthy();
      expect(typeof slug).toBe('string');
      expect(slug.length).toBeGreaterThan(0);
    }
  });
});

describe('FAOSTAT supported countries', () => {
  const countries = getSupportedCountries();

  it('includes Nigeria as the primary market', () => {
    expect(countries).toContain('NGA');
  });

  it('includes all West African focus countries', () => {
    const westAfrican = ['NGA', 'GHA', 'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'BEN', 'TGO'];
    for (const code of westAfrican) {
      expect(countries).toContain(code);
    }
  });

  it('uses ISO 3166-1 alpha-3 codes', () => {
    for (const code of countries) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });
});

describe('USDA commodity mapping', () => {
  const map = getUSDACommodityMap();

  it('maps at least 10 commodities', () => {
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(10);
  });

  it('maps rice correctly', () => {
    expect(map['0421100']).toBe('rice');
  });

  it('maps maize correctly', () => {
    expect(map['0440000']).toBe('maize');
  });

  it('does not contain duplicate slugs', () => {
    const slugs = Object.values(map);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });
});

describe('Supported ingestion sources', () => {
  const sources = getSupportedSources();

  it('includes faostat', () => {
    expect(sources).toContain('faostat');
  });

  it('includes usda_fas', () => {
    expect(sources).toContain('usda_fas');
  });

  it('includes cbn', () => {
    expect(sources).toContain('cbn');
  });

  it('includes nbs', () => {
    expect(sources).toContain('nbs');
  });

  it('has exactly 4 supported sources', () => {
    expect(sources.length).toBe(4);
  });
});
