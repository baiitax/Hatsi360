# Legacy source capture

These files are the **raw output of the audit scrape** of
`https://liveprice.pluckagro.com`. They are the independent source of truth for
the migrated dataset and are kept in the repository so that
`tests/data-integrity.test.ts` can prove the migration did not invent,
interpolate or alter any price.

| File | Contents |
| --- | --- |
| `legacy-price-history.json` | 15 daily groups of the OHLC history the live site published, covering 28 price points across 5 (market, commodity) pairs. |
| `legacy-catalogue.json` | The 11 markets and 22 commodities the live site listed, with descriptions. |
| `legacy-pairs.json` | The 5 (market, commodity) pairs that actually had price history. |

`../legacy-pages/` holds the **46 raw HTML captures** these files were extracted from — the
homepage, the commodity and market directories, 22 commodity pages, 10 market pages, the 5
price-history pages, the three blog articles and a search result.

The scrape was performed with `hparse.py` (a stdlib `html.parser` table
extractor) after two regex-based attempts timed out — see
`docs/AUDIT_REPORT.md`.

**Provenance classification: VERIFIED_IN_UI.** These captures are what the
public site actually displayed. They are not an authoritative price source and
carry no unit, price type, collection time or verification trail.
