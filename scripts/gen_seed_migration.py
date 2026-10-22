#!/usr/bin/env python3
"""Generate supabase/migrations/0007_seed_reference_data.sql from src/data/seed/reference-data.ts.

Keeping the SQL generated from one source prevents the seed and the local
fixture from drifting apart. Re-run after editing reference-data.ts:
    python3 scripts/gen_seed_migration.py
"""
import re, json, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ts = (ROOT / 'src' / 'data' / 'seed' / 'reference-data.ts').read_text(encoding='utf-8')

def block(name):
    m = re.search(r'export const %s[^=]*=\s*\[(.*?)\n\];' % name, ts, re.S)
    if not m:
        raise SystemExit('array not found: ' + name)
    return m.group(1)

def objects(name):
    body = block(name)
    out = []
    depth = 0; cur = ''
    for ch in body:
        if ch == '{':
            depth += 1
            if depth == 1:
                cur = ''; continue
        if ch == '}':
            depth -= 1
            if depth == 0:
                out.append(cur); continue
        if depth >= 1:
            cur += ch
    res = []
    for o in out:
        d = {}
        for k, v in re.findall(r"(\w+):\s*(null|'[^']*'|\"[^\"]*\"|true|false|-?[\d.]+)", o):
            # TypeScript uses camelCase; SQL uses snake_case.
            key = re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
            d[key] = v.strip("'\"")
        res.append(d)
    return res

def q(v):
    if v is None: return 'null'
    if v == 'null': return 'null'
    if re.fullmatch(r'-?[\d.]+', v): return v
    return "'" + v.replace("'", "''") + "'"

countries = objects('countries')
states = objects('states')
markets = objects('markets')
cats = objects('commodityCategories')
commodities = objects('commodities')
units = objects('measurementUnits')

syn_raw = re.search(r'export const commoditySynonyms[^=]*=\s*\{(.*?)\n\};', ts, re.S).group(1)
synonyms = []
for m in re.finditer(r"'([^']+)':\s*\[(.*?)\]", syn_raw, re.S):
    slug = m.group(1)
    for s in re.findall(r"'([^']+)'", m.group(2)):
        synonyms.append((slug, s))

slug_to_id = {c['slug']: int(c['id']) for c in commodities}

L = []
A = L.append
A("-- =============================================================================")
A("-- Pluck Live — 0007 reference data seed")
A("-- =============================================================================")
A("-- GENERATED FILE — edit src/data/seed/reference-data.ts and re-run")
A("--   python3 scripts/gen_seed_migration.py")
A("--")
A("-- This seed contains REFERENCE DATA ONLY. It creates no price observations and")
A("-- no prices of any kind. Migrated price records live in the separate, explicitly")
A("-- authorised data migration documented in docs/DATA_MIGRATION.md.")
A("-- =============================================================================")
A("")
A("set check_function_bodies = off;")
A("")

A("-- ------------------------------------------------------------- countries ---")
A("insert into public.countries (id, code, name, currency_code, currency_symbol) overriding system value")
A("values")
vals = []
for c in countries:
    vals.append("  (%s, %s, %s, %s, %s)" % (c['id'], q(c['code']), q(c['name']), q(c['currency_code']), q(c['currency_symbol'])))
A(",\n".join(vals) + ";")
A("select setval(pg_get_serial_sequence('public.countries','id'), coalesce(max(id),1)) from public.countries;")
A("")

A("-- ---------------------------------------------------------------- states ---")
A("insert into public.states (id, country_id, code, name, slug) overriding system value")
A("values")
vals = []
for s in states:
    vals.append("  (%s, %s, %s, %s, %s)" % (s['id'], s['country_id'], q(s.get('code')), q(s['name']), q(s['slug'])))
A(",\n".join(vals) + ";")
A("select setval(pg_get_serial_sequence('public.states','id'), coalesce(max(id),1)) from public.states;")
A("")

A("-- ---------------------------------------------------------------- markets ---")
A("-- market_zone_id is left null: the legacy system had no zone concept and none")
A("-- is asserted here. Operations staff populate it from field knowledge.")
A("insert into public.markets (id, legacy_id, state_id, name, slug, description, address) overriding system value")
A("values")
vals = []
for m in markets:
    vals.append("  (%s, %s, %s, %s, %s, %s, %s)" % (
        m['id'], q(m.get('legacy_id')), m['state_id'], q(m['name']), q(m['slug']),
        q(m.get('description')), q(m.get('address'))))
A(",\n".join(vals) + ";")
A("select setval(pg_get_serial_sequence('public.markets','id'), coalesce(max(id),1)) from public.markets;")
A("")

A("-- ----------------------------------------------------- commodity categories -")
A("insert into public.commodity_categories (id, slug, name, description, sort_order) overriding system value")
A("values")
vals = []
for c in cats:
    vals.append("  (%s, %s, %s, %s, %s)" % (c['id'], q(c['slug']), q(c['name']), q(c.get('description')), c.get('sort_order','100')))
A(",\n".join(vals) + ";")
A("select setval(pg_get_serial_sequence('public.commodity_categories','id'), coalesce(max(id),1)) from public.commodity_categories;")
A("")

A("-- ------------------------------------------------------------ commodities --")
A("insert into public.commodities (id, legacy_id, category_id, name, slug, description, is_active) overriding system value")
A("values")
vals = []
for c in commodities:
    vals.append("  (%s, %s, %s, %s, %s, %s, %s)" % (
        c['id'], q(c.get('legacy_id')), c['category_id'], q(c['name']), q(c['slug']),
        q(c.get('description')), c.get('is_active','true')))
A(",\n".join(vals) + ";")
A("select setval(pg_get_serial_sequence('public.commodities','id'), coalesce(max(id),1)) from public.commodities;")
A("")

A("-- ------------------------------------------------------- measurement units --")
A("insert into public.measurement_units (id, code, name, plural_name, dimension, base_unit_id, base_factor, is_specific) overriding system value")
A("values")
vals = []
for u in units:
    vals.append("  (%s, %s, %s, %s, %s, %s, %s, %s)" % (
        u['id'], q(u['code']), q(u['name']), q(u.get('plural_name')), q(u['dimension']),
        q(u.get('base_unit_id')), q(u.get('base_factor')), q(u.get('is_specific','true'))))
A(",\n".join(vals) + ";")
A("select setval(pg_get_serial_sequence('public.measurement_units','id'), coalesce(max(id),1)) from public.measurement_units;")
A("")

A("-- -------------------------------------------------------------- synonyms ---")
A("insert into public.commodity_synonyms (commodity_id, synonym)")
A("values")
vals = []
for slug, syn in synonyms:
    cid = slug_to_id.get(slug)
    if cid is None:
        continue
    vals.append("  (%s, %s)" % (cid, q(syn)))
A(",\n".join(vals) + ";")
A("")

A("-- =============================================================================")
A("-- NOTE ON commodity_unit_conversions")
A("--")
A("-- This table is intentionally EMPTY. A bag of maize and a bag of cocoa do not")
A("-- weigh the same, so a conversion may only exist once its weight has been")
A("-- verified in the field. Agents record the actual package weight on each")
A("-- observation instead, and operations staff add a conversion row once a")
A("-- commodity-specific pack weight has been confirmed.")
A("-- =============================================================================")

out = ROOT / 'supabase' / 'migrations' / '0007_seed_reference_data.sql'
out.write_text("\n".join(L) + "\n", encoding='utf-8')
print('wrote', out, '(%d lines)' % len(L))
