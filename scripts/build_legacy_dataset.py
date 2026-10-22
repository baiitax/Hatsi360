#!/usr/bin/env python3
"""
Reconstruct the Pluck Live legacy price dataset from the publicly rendered pages of
https://liveprice.pluckagro.com and emit a migration-ready JSON payload.

WHY THIS EXISTS
---------------
The legacy PHP site exposes price data only as daily OHLC aggregates
("Date | Open | High | Low | Close | Volume (Entries)"). Individual price
observations are never rendered. This script reconstructs the *underlying*
observations from each aggregate where the aggregate is mathematically sufficient,
and refuses to guess where it is not.

Reconstruction rule (per market x commodity x day group)
--------------------------------------------------------
  volume == 1 -> the single observation is open (== high == low == close).
  volume == 2 -> observations are exactly {open, close}; the aggregate guarantees
                 {open, close} == {low, high}. Order is [open, close] (first, last).
  volume == 3 -> observations are [open, close, X] where X is whichever of
                 {low, high} is not already attained by open or close.
  volume >= 4 -> NOT RECONSTRUCTABLE. Skipped and reported.

Every reconstruction is cross-checked against the "Latest Price" values the site
renders in its Market Comparison tables. The build fails if any mismatch occurs.

NOT RECOVERABLE from the public site (deliberately left unknown, never invented):
  - measurement unit and package weight
  - price type (farmgate / wholesale / retail ...)
  - collection time-of-day (only the calendar date is published)
  - grade / variety
  - verification status and verifying officer
  - currency (site renders the naira sign but stores no currency field)
"""

import json
import os
import re
import sys
from collections import OrderedDict
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
AUDIT = os.path.join(ROOT, 'audit', 'legacy-pages')
OUT = os.path.join(ROOT, 'src', 'data', 'legacy', 'production-observations.json')

MONTHS = {m: i + 1 for i, m in enumerate(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}


# --------------------------------------------------------------------------- HTML
class TableParser(HTMLParser):
    """Minimal tolerant table scraper (regex over raw HTML backtracks catastrophically)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables, self.stack, self.t, self.row, self.cell = [], [], None, None, None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'table':
            self.t = {'rows': []}
            self.tables.append(self.t)
            self.stack.append(self.t)
        elif tag == 'tr' and self.t is not None:
            self.row = []
            self.t['rows'].append(self.row)
        elif tag in ('td', 'th') and self.row is not None:
            self.cell = {'text': [], 'links': []}
        elif tag == 'a' and self.cell is not None:
            self.cell['links'].append(a.get('href', ''))

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            txt = re.sub(r'\s+', ' ', ' '.join(self.cell['text'])).strip()
            self.row.append({'text': txt, 'links': self.cell['links']})
            self.cell = None
        elif tag == 'table' and self.stack:
            self.stack.pop()
            self.t = self.stack[-1] if self.stack else None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell['text'].append(data)


def tables(path):
    p = TableParser()
    p.feed(open(path, encoding='utf-8', errors='replace').read())
    out = []
    for t in p.tables:
        heads = [c['text'] for c in (t['rows'][0] if t['rows'] else [])]
        out.append({'head': heads, 'rows': t['rows'][1:]})
    return out


def num(s):
    if not s:
        return None
    try:
        return float(re.sub(r'[^\d.]', '', s.replace(',', '')))
    except ValueError:
        return None


def pdate(s):
    m = re.search(r'([A-Za-z]{3})\s+(\d+),\s*(\d{4})', s)
    if not m:
        return None
    return '%s-%02d-%02d' % (m.group(3), MONTHS[m.group(1)], int(m.group(2)))


def reconstruct(open_, high, low, close, volume):
    """Return the ordered list of underlying observations, or None if unrecoverable."""
    if volume == 1:
        return [open_]
    if volume == 2:
        if {open_, close} != {low, high}:
            return None
        return [open_, close]
    if volume == 3:
        vals = [open_, close]
        remaining = []
        for bound in (low, high):
            if not any(abs(v - bound) < 1e-9 for v in vals):
                remaining.append(bound)
        if len(remaining) != 1:
            return None
        third = remaining[0]
        if not (low - 1e-9 <= third <= high + 1e-9):
            return None
        # the third observation sits between the first and the last
        if open_ <= close:
            return [open_, third, close]
        return [open_, third, close]
    return None


def main():
    if not os.path.isdir(AUDIT):
        sys.exit('Missing captured pages at %s (run audit/collect_legacy_pages.sh first)' % AUDIT)

    markets, commodities = [], []
    for tb in tables(os.path.join(AUDIT, 'markets.html')):
        if tb['head'][:2] == ['Market Name', 'Location']:
            for r in tb['rows']:
                href = r[3]['links'][0]
                markets.append({
                    'legacy_id': int(re.search(r'market_id=(\d+)', href).group(1)),
                    'name': r[0]['text'],
                    'location': r[1]['text'],
                    'published_entry_count': int(num(r[2]['text']) or 0),
                })
    for tb in tables(os.path.join(AUDIT, 'commodities.html')):
        if tb['head'][:2] == ['Commodity', 'Category']:
            for r in tb['rows']:
                href = r[4]['links'][0]
                commodities.append({
                    'legacy_id': int(re.search(r'\?id=(\d+)', href).group(1)),
                    'name': r[0]['text'],
                    'category': r[1]['text'],
                    'description': r[2]['text'],
                    'published_market_count': int(num(r[3]['text']) or 0),
                })

    mname = {m['legacy_id']: m['name'] for m in markets}
    cname = {c['legacy_id']: c['name'] for c in commodities}

    # ---- daily aggregates from the per-pair market detail pages ----
    groups = []
    for fname in sorted(os.listdir(AUDIT)):
        mt = re.match(r'md_(\d+)_(\d+)\.html$', fname)
        if not mt:
            continue
        mid, cid = int(mt.group(1)), int(mt.group(2))
        for tb in tables(os.path.join(AUDIT, fname)):
            if tb['head'][:2] != ['Date', 'Open']:
                continue
            for r in tb['rows']:
                if len(r) < 5:
                    continue
                d = pdate(r[0]['text'])
                o, h, l, c = num(r[1]['text']), num(r[2]['text']), num(r[3]['text']), num(r[4]['text'])
                v = int(num(r[5]['text']) or 0) if len(r) > 5 else 0
                groups.append({'market_id': mid, 'commodity_id': cid, 'date': d,
                               'open': o, 'high': h, 'low': l, 'close': c, 'volume': v})

    observations, skipped = [], []
    for g in groups:
        vals = reconstruct(g['open'], g['high'], g['low'], g['close'], g['volume'])
        if vals is None:
            skipped.append(g)
            continue
        for i, price in enumerate(vals):
            observations.append({
                'legacy_market_id': g['market_id'],
                'legacy_commodity_id': g['commodity_id'],
                'collection_date': g['date'],
                'sequence': i + 1,
                'reported_amount': price,
                'source_group': {'open': g['open'], 'high': g['high'], 'low': g['low'],
                                 'close': g['close'], 'volume': g['volume']},
            })

    # ---- validation: reconstructed latest-per-market must match published latest ----
    published_latest = {}
    for fname in sorted(os.listdir(AUDIT)):
        mt = re.match(r'commodity_(\d+)\.html$', fname)
        if not mt:
            continue
        cid = int(mt.group(1))
        for tb in tables(os.path.join(AUDIT, fname)):
            if tb['head'][:2] == ['Market', 'State']:
                for r in tb['rows']:
                    if len(r) < 3 or not r[0]['text']:
                        continue
                    price = num(r[2]['text'])
                    if price is not None:
                        published_latest[(cid, r[0]['text'])] = price

    derived_latest = {}
    for o in sorted(observations, key=lambda x: (x['collection_date'], x['sequence'])):
        key = (o['legacy_commodity_id'], mname[o['legacy_market_id']])
        derived_latest[key] = (o['collection_date'], o['reported_amount'])

    mismatches = []
    for key, published in published_latest.items():
        got = derived_latest.get(key)
        if got is None or abs(got[1] - published) > 0.01:
            mismatches.append({'key': key, 'published': published, 'reconstructed': got})

    payload = {
        '_provenance': {
            'source': 'https://liveprice.pluckagro.com',
            'collected_at': '2026-10-22',
            'collection_method': 'Public HTML pages scraped read-only (no credentials, no write access).',
            'licence_note': 'Data below was publicly published by Pluck Agro on the live site.',
            'reconstruction_note': (
                'The live site publishes only daily OHLC aggregates. Individual observations '
                'below were reconstructed deterministically from those aggregates; see '
                'scripts/build_legacy_dataset.py for the rule and its validation.'),
            'known_unknowns': [
                'measurement unit', 'package/bag weight', 'price type', 'collection time of day',
                'grade or variety', 'verification status and officer', 'currency field',
            ],
            'observed_count': len(observations),
            'date_range': [min(o['collection_date'] for o in observations),
                           max(o['collection_date'] for o in observations)],
            'validation': {
                'published_latest_values_checked': len(published_latest),
                'mismatches': mismatches,
            },
            'unreconstructable_groups': skipped,
        },
        'markets': markets,
        'commodities': commodities,
        'observations': observations,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, indent=1)

    print('markets           :', len(markets))
    print('commodities       :', len(commodities))
    print('daily groups      :', len(groups))
    print('observations      :', len(observations))
    print('unreconstructable :', len(skipped))
    print('latest-price checks:', len(published_latest), '| mismatches:', len(mismatches))
    if mismatches:
        print(json.dumps(mismatches, indent=2))
        sys.exit(1)
    print('\nWrote', OUT)


if __name__ == '__main__':
    main()
