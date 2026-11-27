/**
 * Disposable fixtures for write-capable checks.
 *
 * Rules:
 *   * synthetic data only — fixed slugs prefixed `p7b-`, no customer ids, no
 *     personal data, no commercial values;
 *   * every created row is tracked with its table and id, and cleanup runs in
 *     reverse creation order even when a check throws;
 *   * nothing is deleted unless this run created it.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RUN_TAG = `p7b-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

export function createFixtures({ http, serviceKey }) {
  const created = [];
  const ensured = [];

  const rest = (path, opts = {}) =>
    http.request(`/rest/v1/${path}`, { key: serviceKey, token: serviceKey, ...opts });

  const track = (table, ids) => {
    for (const id of ids) created.push({ table, id });
  };

  const firstCommodityId = async () => {
    const r = await rest('commodities?select=id&limit=1');
    return Array.isArray(r.json) && r.json[0] ? r.json[0].id : null;
  };

  const firstMarketId = async () => {
    const r = await rest('markets?select=id&limit=1');
    return Array.isArray(r.json) && r.json[0] ? r.json[0].id : null;
  };

  /** One public and one premium report, so policy evaluation has rows on both branches. */
  const ensureReportPair = async () => {
    const existing = await rest(`market_reports?select=id,slug,is_premium&slug=like.${RUN_TAG}*`);
    if (Array.isArray(existing.json) && existing.json.length >= 2) {
      ensured.push(...existing.json.map((r) => ({ table: 'market_reports', id: r.id })));
      return existing.json;
    }
    const rows = [
      { slug: `${RUN_TAG}-public`, title: 'P7B public fixture', is_premium: false, published_at: new Date().toISOString() },
      { slug: `${RUN_TAG}-premium`, title: 'P7B premium fixture', is_premium: true, published_at: new Date().toISOString() },
    ];
    const r = await rest('market_reports', {
      method: 'POST', body: rows, headers: { prefer: 'return=representation' },
    });
    if (Array.isArray(r.json)) track('market_reports', r.json.map((x) => x.id));
    return r.json;
  };

  /** Delete only what this run created, newest first, and swallow nothing silently. */
  const cleanup = async (log = () => {}) => {
    const results = [];
    for (const row of [...created].reverse()) {
      const r = await rest(`${row.table}?id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      results.push({ ...row, status: r.status });
      log(`cleanup ${row.table}/${row.id} -> ${r.status}`);
    }
    return results;
  };

  const manifest = async (dir, runId) => {
    const path = join(dir, runId);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'fixtures.json'), JSON.stringify({ runTag: RUN_TAG, created, ensured }, null, 2) + '\n');
  };

  return { tag: RUN_TAG, track, firstCommodityId, firstMarketId, ensureReportPair, cleanup, manifest, created, ensured };
}
