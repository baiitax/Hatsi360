# Phase 07 — Data Source Register

**Phase:** 07 — Global Trade Intelligence  
**Date:** 2026-01-XX  
**Status:** Stage 1 Complete

---

## Executive Summary

This document catalogs all external data sources required for Phase 07 Global Trade Intelligence implementation. Each source is evaluated for data coverage, access method, licensing terms, integration complexity, and priority for Phase 07 implementation.

---

## 1. Data Source Categories

Phase 07 requires data from five main categories:

1. **International Trade Statistics** — Import/export flows, values, quantities
2. **Tariff and Regulatory Data** — Duties, market access requirements, regulations
3. **Trade Agreements** — Preferential arrangements, rules of origin
4. **Agricultural Production and Supply** — Production volumes, supply/demand balances
5. **Economic and Geographic Data** — Country metadata, exchange rates, regions

---

## 2. International Trade Statistics Sources

### 2.1 UN Comtrade Database

**Source Overview:**
- **Provider:** United Nations Statistics Division
- **URL:** https://comtrade.un.org/
- **Coverage:** 200+ countries, 1988-present
- **Update Frequency:** Monthly/quarterly
- **Data Volume:** 200+ million records

**Data Available:**
- Bilateral trade flows (reporter × partner × commodity)
- Trade values (USD) and quantities (kg, units, etc.)
- HS code classifications (HS 1988, 1992, 1996, 2002, 2007, 2012, 2017, 2022)
- Trade by product group (SITC, BEC, EBOPS)
- Re-exports and re-imports
- Mirror statistics (partner data)

**Access Method:**
- **API:** RESTful API with JSON/XML responses
- **Web Interface:** Bulk downloads available
- **Authentication:** API key required

**Licensing:**
- **Type:** Commercial subscription
- **Cost:** $5,000-20,000/year (depending on access level)
- **Free Tier:** Limited to 100 records per query
- **Redistribution:** Not permitted without agreement
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Excellent (well-documented, stable)
- **Data Format:** JSON, easy to parse
- **Volume:** Very large (requires pagination, incremental loading)
- **Transformation:** Moderate (HS code mapping, currency conversion)

**Phase 07 Priority:** **HIGH** (if budget allows)

**Pros:**
- ✅ Most comprehensive global trade database
- ✅ Historical data back to 1988
- ✅ Multiple HS revisions supported
- ✅ Mirror statistics for validation
- ✅ Well-maintained and reliable

**Cons:**
- ❌ Expensive subscription required
- ❌ Cannot redistribute raw data
- ❌ Complex pricing tiers
- ❌ Requires budget approval

**Recommendation:**
Evaluate based on commercial requirements. If budget allows, this is the gold standard for trade data. Otherwise, use free alternatives (ITC Trade Map, WITS).

---

### 2.2 ITC Trade Map

**Source Overview:**
- **Provider:** International Trade Centre (ITC, WTO/UN)
- **URL:** https://www.trademap.org/
- **Coverage:** 220+ countries, 2001-present
- **Update Frequency:** Monthly/quarterly
- **Data Volume:** 50+ million records

**Data Available:**
- Bilateral trade flows
- Trade values (USD) and quantities
- HS code classifications (HS 2002, 2007, 2012, 2017)
- Trade indicators (market share, growth, concentration)
- Demand indicators (import penetration, supply capacity)
- Tariff data (applied and bound rates)
- Trade promotion indicators

**Access Method:**
- **Web Interface:** Free registration, interactive queries
- **API:** Limited API access (requires special agreement)
- **Bulk Downloads:** Available for registered users

**Licensing:**
- **Type:** Free for non-commercial use
- **Cost:** Free with registration
- **Commercial Use:** Requires separate agreement
- **Redistribution:** Not permitted without agreement
- **Attribution:** Required ("Source: ITC Trade Map")

**Integration Complexity:**
- **API Quality:** Limited (web scraping may be required)
- **Data Format:** Excel, CSV downloads
- **Volume:** Large (requires batch processing)
- **Transformation:** Moderate (formatting, validation)

**Phase 07 Priority:** **CRITICAL** (free, comprehensive)

**Pros:**
- ✅ Free for non-commercial use
- ✅ Comprehensive coverage
- ✅ Includes tariff data
- ✅ Trade indicators and analytics
- ✅ Well-maintained by ITC/WTO

**Cons:**
- ❌ Limited API access (may need web scraping)
- ❌ Commercial use requires agreement
- ❌ Bulk downloads in Excel format
- ❌ Rate limiting on queries

**Recommendation:**
**Integrate immediately.** This is the best free source for comprehensive trade data. Build web scraper or negotiate API access for automated ingestion.

---

### 2.3 World Integrated Trade Solution (WITS)

**Source Overview:**
- **Provider:** World Bank
- **URL:** https://wits.worldbank.org/
- **Coverage:** 180+ countries, 1988-present
- **Update Frequency:** Annual
- **Data Volume:** 30+ million records

**Data Available:**
- Bilateral trade flows
- Trade values and quantities
- HS code classifications (HS 1988-2017)
- Tariff data (applied, bound, MFN rates)
- Non-tariff measures
- Trade indicators
- Simulation tools (partial equilibrium analysis)

**Access Method:**
- **API:** RESTful API with JSON responses
- **Web Interface:** Interactive queries
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** Public domain (World Bank data)
- **Cost:** Free
- **Redistribution:** Permitted with attribution
- **Attribution:** Required ("Source: World Bank WITS")

**Integration Complexity:**
- **API Quality:** Good (documented, stable)
- **Data Format:** JSON, CSV
- **Volume:** Large (requires pagination)
- **Transformation:** Low (well-structured data)

**Phase 07 Priority:** **HIGH** (free, comprehensive)

**Pros:**
- ✅ Free and open data
- ✅ Includes tariff data
- ✅ Non-tariff measures
- ✅ World Bank backing (reliable)
- ✅ Good API documentation

**Cons:**
- ❌ Less comprehensive than UN Comtrade
- ❌ Annual updates (less frequent)
- ❌ Some data gaps for African countries

**Recommendation:**
**Integrate early.** Excellent free source with tariff data. Complements ITC Trade Map.

---

### 2.4 UNCTAD TRAINS / STAT

**Source Overview:**
- **Provider:** United Nations Conference on Trade and Development
- **URL:** https://trains.unctad.org/ / https://stat.unctad.org/
- **Coverage:** 200+ countries, 1988-present
- **Update Frequency:** Annual
- **Data Volume:** 40+ million records

**Data Available:**
- Bilateral trade flows
- Trade values and quantities
- HS code classifications
- Tariff and non-tariff measures
- Trade in services
- Foreign direct investment
- Commodity dependency indicators

**Access Method:**
- **API:** RESTful API
- **Web Interface:** Interactive queries
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** Public domain (UN data)
- **Cost:** Free
- **Redistribution:** Permitted with attribution
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Good
- **Data Format:** JSON, CSV
- **Volume:** Large
- **Transformation:** Low

**Phase 07 Priority:** **MEDIUM** (complementary source)

**Pros:**
- ✅ Free and open data
- ✅ Includes services trade
- ✅ UN backing (reliable)
- ✅ Complementary to other sources

**Cons:**
- ❌ Less comprehensive than UN Comtrade
- ❌ Annual updates
- ❌ Some overlap with WITS

**Recommendation:**
Integrate as complementary source. Useful for services trade and FDI data.

---

### 2.5 FAOSTAT Trade Data

**Source Overview:**
- **Provider:** Food and Agriculture Organization
- **URL:** https://www.fao.org/faostat/
- **Coverage:** 200+ countries, 1961-present
- **Update Frequency:** Annual
- **Data Volume:** 10+ million records (agricultural trade)

**Data Available:**
- Agricultural trade flows
- Trade values and quantities
- HS code classifications (limited to agricultural products)
- Commodity balances (production, imports, exports, stocks)
- Food supply data

**Access Method:**
- **API:** RESTful API (already integrated in Phase 06)
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** CC BY-NC-SA 3.0 IGO
- **Cost:** Free
- **Redistribution:** Permitted with attribution, share-alike
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Excellent (already integrated)
- **Data Format:** JSON
- **Volume:** Moderate (agricultural focus)
- **Transformation:** Low (extend existing integration)

**Phase 07 Priority:** **HIGH** (extend existing integration)

**Pros:**
- ✅ Already integrated (Phase 06)
- ✅ Free and open data
- ✅ Agricultural focus (aligned with Hatsi360)
- ✅ Historical data back to 1961

**Cons:**
- ❌ Limited to agricultural products
- ❌ Less detailed than UN Comtrade
- ❌ Annual updates

**Recommendation:**
**Extend existing FAOSTAT integration** to include trade data. Quick win given existing infrastructure.

---

## 3. Tariff and Regulatory Data Sources

### 3.1 WTO Tariff Database (IDB)

**Source Overview:**
- **Provider:** World Trade Organization
- **URL:** https://tariffdata.wto.org/
- **Coverage:** 164 WTO members
- **Update Frequency:** Annual
- **Data Volume:** 5+ million records

**Data Available:**
- Bound tariff rates (WTO commitments)
- Applied tariff rates (actual rates)
- MFN tariffs
- Preferential tariffs
- HS code classifications (HS 2002, 2007, 2012, 2017)
- Tariff quotas
- Tariff peaks and escalation

**Access Method:**
- **API:** Limited API (web interface primary)
- **Web Interface:** Interactive queries
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** Public domain (WTO data)
- **Cost:** Free
- **Redistribution:** Permitted with attribution
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Limited (may need web scraping)
- **Data Format:** Excel, CSV
- **Volume:** Moderate
- **Transformation:** Moderate (tariff interpretation)

**Phase 07 Priority:** **HIGH** (essential for market access)

**Pros:**
- ✅ Free and authoritative
- ✅ Official WTO data
- ✅ Bound and applied rates
- ✅ Comprehensive coverage

**Cons:**
- ❌ Limited API (web scraping may be needed)
- ❌ Excel format (requires parsing)
- ❌ Complex tariff structures

**Recommendation:**
**Integrate for tariff intelligence.** Essential for market access analysis. May require web scraping.

---

### 3.2 MAcMAP (Market Access Map)

**Source Overview:**
- **Provider:** ITC / World Bank
- **URL:** https://www.macmap.org/
- **Coverage:** 220+ countries
- **Update Frequency:** Annual
- **Data Volume:** 2+ million records

**Data Available:**
- Applied tariff rates
- Preferential tariffs (by trade agreement)
- Tariff-rate quotas
- Non-tariff measures
- Rules of origin
- Trade remedies (anti-dumping, countervailing)

**Access Method:**
- **Web Interface:** Free registration
- **API:** Limited API (requires agreement)
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** Free for non-commercial use
- **Cost:** Free with registration
- **Commercial Use:** Requires agreement
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Limited
- **Data Format:** Excel, CSV
- **Volume:** Moderate
- **Transformation:** Moderate

**Phase 07 Priority:** **HIGH** (comprehensive market access)

**Pros:**
- ✅ Free for non-commercial use
- ✅ Includes preferential tariffs
- ✅ Non-tariff measures
- ✅ ITC/World Bank backing

**Cons:**
- ❌ Limited API access
- ❌ Commercial use requires agreement
- ❌ Complex data structures

**Recommendation:**
**Integrate for market access intelligence.** Complements WTO tariff data with preferential rates and NTMs.

---

## 4. Trade Agreement Sources

### 4.1 WTO RTA Database

**Source Overview:**
- **Provider:** World Trade Organization
- **URL:** https://rta.wto.org/
- **Coverage:** 300+ regional trade agreements
- **Update Frequency:** As agreements are notified
- **Data Volume:** 5,000+ records

**Data Available:**
- RTA text and provisions
- Rules of origin
- Tariff commitments
- Services commitments
- Trade facilitation provisions
- Dispute settlement mechanisms

**Access Method:**
- **Web Interface:** Free access
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** Public domain (WTO data)
- **Cost:** Free
- **Redistribution:** Permitted with attribution
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Limited (web interface primary)
- **Data Format:** PDF, HTML, Excel
- **Volume:** Moderate
- **Transformation:** High (unstructured text, legal language)

**Phase 07 Priority:** **MEDIUM** (requires significant processing)

**Pros:**
- ✅ Free and authoritative
- ✅ Comprehensive RTA coverage
- ✅ Official WTO source

**Cons:**
- ❌ Unstructured data (PDFs, HTML)
- ❌ Requires significant text processing
- ❌ Legal language complexity

**Recommendation:**
**Integrate selectively.** Focus on key agreements (AfCFTA, ECOWAS) with manual curation. Full automation is complex.

---

### 4.2 AfCFTA Secretariat Data

**Source Overview:**
- **Provider:** African Continental Free Trade Area Secretariat
- **URL:** https://cfilafcfta.org/
- **Coverage:** 54 African countries
- **Update Frequency:** As implementation progresses
- **Data Volume:** Limited (new agreement)

**Data Available:**
- AfCFTA agreement text
- Schedules of concessions
- Rules of origin
- Implementation status
- Trade facilitation measures

**Access Method:**
- **Web Interface:** Limited public access
- **Direct Contact:** May require agreement

**Licensing:**
- **Type:** Varies (requires agreement)
- **Cost:** May require partnership
- **Redistribution:** Requires permission

**Integration Complexity:**
- **API Quality:** Limited or non-existent
- **Data Format:** PDF, Word documents
- **Volume:** Limited
- **Transformation:** High

**Phase 07 Priority:** **HIGH** (critical for African trade focus)

**Pros:**
- ✅ Critical for African trade intelligence
- ✅ Authoritative source
- ✅ Aligns with Hatsi360 mission

**Cons:**
- ❌ Limited public access
- ❌ Requires partnership/agreement
- ❌ New agreement (data still evolving)

**Recommendation:**
**Pursue partnership with AfCFTA Secretariat.** Critical for African trade focus. May require formal agreement.

---

## 5. Economic and Geographic Data Sources

### 5.1 World Bank Open Data

**Source Overview:**
- **Provider:** World Bank
- **URL:** https://data.worldbank.org/
- **Coverage:** 200+ countries
- **Update Frequency:** Varies by indicator
- **Data Volume:** 10,000+ indicators

**Data Available:**
- Country metadata (population, GDP, regions)
- Economic indicators
- Business environment indicators
- Development indicators
- Geographic data

**Access Method:**
- **API:** RESTful API with JSON responses
- **Web Interface:** Interactive queries
- **Bulk Downloads:** Available

**Licensing:**
- **Type:** Public domain (World Bank data)
- **Cost:** Free
- **Redistribution:** Permitted with attribution
- **Attribution:** Required

**Integration Complexity:**
- **API Quality:** Excellent
- **Data Format:** JSON, CSV
- **Volume:** Large
- **Transformation:** Low

**Phase 07 Priority:** **HIGH** (country metadata, economic context)

**Pros:**
- ✅ Free and open data
- ✅ Excellent API
- ✅ Comprehensive country data
- ✅ World Bank backing

**Cons:**
- ❌ Not trade-specific
- ❌ Some indicators have gaps

**Recommendation:**
**Integrate for country profiles.** Essential for geographic and economic context.

---

### 5.2 ISO Country Codes

**Source Overview:**
- **Provider:** International Organization for Standardization
- **URL:** https://www.iso.org/iso-3166-country-codes.html
- **Coverage:** 249 countries
- **Update Frequency:** As needed
- **Data Volume:** 249 records

**Data Available:**
- ISO 3166-1 alpha-2 codes (2-letter)
- ISO 3166-1 alpha-3 codes (3-letter)
- ISO 3166-1 numeric codes
- Country names
- Subdivision codes

**Access Method:**
- **Bulk Downloads:** Available
- **API:** Third-party APIs available

**Licensing:**
- **Type:** ISO standard (requires license for redistribution)
- **Cost:** Free for reference, license for redistribution
- **Redistribution:** Requires ISO license

**Integration Complexity:**
- **API Quality:** N/A (static data)
- **Data Format:** CSV, XML
- **Volume:** Small
- **Transformation:** Low

**Phase 07 Priority:** **CRITICAL** (foundation for all country data)

**Pros:**
- ✅ International standard
- ✅ Complete coverage
- ✅ Static data (one-time import)

**Cons:**
- ❌ ISO license required for redistribution
- ❌ No API (static data only)

**Recommendation:**
**Import ISO country codes immediately.** Foundation for all country data. Use third-party API or bulk download.

---

## 6. Data Source Integration Priority

### 6.1 Phase 1 (Months 1-3): Foundation Sources

| Source | Priority | Action | Timeline |
|--------|----------|--------|----------|
| ISO Country Codes | **CRITICAL** | Import country reference data | Week 1-2 |
| FAOSTAT (trade data) | **HIGH** | Extend existing integration | Week 3-6 |
| ITC Trade Map | **CRITICAL** | Register, build scraper/API | Week 5-10 |
| World Bank Data | **HIGH** | Import country metadata | Week 7-8 |

### 6.2 Phase 2 (Months 4-6): Tariff and Market Access

| Source | Priority | Action | Timeline |
|--------|----------|--------|----------|
| WTO Tariffs | **HIGH** | Integrate tariff data | Week 11-14 |
| WITS | **HIGH** | Integrate trade + tariff data | Week 13-16 |
| MAcMAP | **HIGH** | Integrate market access data | Week 15-18 |
| UNCTAD TRAINS | **MEDIUM** | Integrate as complement | Week 17-20 |

### 6.3 Phase 3 (Months 7-9): Agreements and African Focus

| Source | Priority | Action | Timeline |
|--------|----------|--------|----------|
| UN Comtrade | **HIGH** | Evaluate, subscribe if budget allows | Week 21-24 |
| AfCFTA Data | **HIGH** | Pursue partnership | Week 23-26 |
| WTO RTA Database | **MEDIUM** | Integrate key agreements | Week 25-28 |

---

## 7. Data Source Licensing Summary

| Source | License Type | Cost | Commercial Use | Redistribution | Attribution |
|--------|-------------|------|----------------|----------------|-------------|
| UN Comtrade | Commercial | $5K-20K/year | ✅ With subscription | ❌ Without agreement | ✅ Required |
| ITC Trade Map | Free non-commercial | Free | ❌ Requires agreement | ❌ Without agreement | ✅ Required |
| WITS | Public domain | Free | ✅ Permitted | ✅ Permitted | ✅ Required |
| UNCTAD | Public domain | Free | ✅ Permitted | ✅ Permitted | ✅ Required |
| FAOSTAT | CC BY-NC-SA | Free | ❌ Non-commercial only | ✅ With attribution | ✅ Required |
| WTO Tariffs | Public domain | Free | ✅ Permitted | ✅ Permitted | ✅ Required |
| MAcMAP | Free non-commercial | Free | ❌ Requires agreement | ❌ Without agreement | ✅ Required |
| World Bank | Public domain | Free | ✅ Permitted | ✅ Permitted | ✅ Required |
| ISO Codes | ISO license | Free (reference) | ✅ With license | ✅ With license | ✅ Required |
| AfCFTA | Varies | Varies | ❌ Requires agreement | ❌ Requires permission | ✅ Required |

---

## 8. Data Source Integration Architecture

### 8.1 Source Adapter Pattern

Each data source will be integrated using a standardized adapter pattern:

```typescript
interface TradeDataSourceAdapter {
  // Source metadata
  getSourceInfo(): SourceInfo;
  
  // Authentication
  authenticate(): Promise<void>;
  
  // Data retrieval
  fetchTradeData(params: QueryParams): Promise<RawTradeRecord[]>;
  fetchTariffData(params: QueryParams): Promise<RawTariffRecord[]>;
  fetchCountryData(params: QueryParams): Promise<RawCountryRecord[]>;
  
  // Data transformation
  transformTradeData(raw: RawTradeRecord[]): Promise<TradeRecord[]>;
  transformTariffData(raw: RawTariffRecord[]): Promise<TariffRecord[]>;
  
  // Validation
  validateData(records: TradeRecord[]): Promise<ValidationResult>;
  
  // Provenance
  getProvenanceMetadata(): ProvenanceMetadata;
}
```

### 8.2 Provenance Tracking

Every record will include provenance metadata:

```typescript
interface ProvenanceMetadata {
  source_id: number;              // Reference to evidence_sources
  source_dataset: string;         // Specific dataset within source
  source_url: string;             // URL where data was retrieved
  retrieval_date: Date;           // When data was retrieved
  publication_date: Date;         // When data was published by source
  last_updated: Date;             // When source data was last updated
  original_record_id: string;     // ID in source system
  methodology: string;            // Data collection methodology
  license_type: string;           // License under which data is provided
  attribution_text: string;       // Required attribution text
}
```

---

## 9. Data Source Risk Assessment

| Source | Access Risk | Cost Risk | Integration Risk | Licensing Risk | Overall Risk |
|--------|------------|-----------|------------------|----------------|--------------|
| UN Comtrade | LOW | **HIGH** | LOW | MEDIUM | MEDIUM |
| ITC Trade Map | MEDIUM | LOW | MEDIUM | MEDIUM | MEDIUM |
| WITS | LOW | LOW | LOW | LOW | **LOW** |
| UNCTAD | LOW | LOW | LOW | LOW | **LOW** |
| FAOSTAT | LOW | LOW | **LOW** (existing) | LOW | **LOW** |
| WTO Tariffs | MEDIUM | LOW | MEDIUM | LOW | MEDIUM |
| MAcMAP | MEDIUM | LOW | MEDIUM | MEDIUM | MEDIUM |
| World Bank | LOW | LOW | LOW | LOW | **LOW** |
| ISO Codes | LOW | LOW | LOW | MEDIUM | LOW |
| AfCFTA | **HIGH** | MEDIUM | **HIGH** | **HIGH** | **HIGH** |

---

## 10. Recommendations

### 10.1 Immediate Actions (Week 1-4)

1. ✅ Import ISO country codes (200+ countries)
2. ✅ Extend FAOSTAT integration for trade data
3. ⏳ Register for ITC Trade Map access
4. ⏳ Begin WITS API integration
5. ⏳ Import World Bank country metadata

### 10.2 Budget Decisions

**Decision 1: UN Comtrade Subscription**
- **If budget allows ($5K-20K/year):** Subscribe for comprehensive data
- **If budget constrained:** Use ITC Trade Map + WITS + FAOSTAT (free alternatives)
- **Recommendation:** Start with free sources, evaluate UN Comtrade after MVP

**Decision 2: ITC Trade Map Commercial Use**
- **If commercial product:** Negotiate commercial license with ITC
- **If non-commercial/research:** Use free registration
- **Recommendation:** Clarify commercial status before integration

**Decision 3: AfCFTA Partnership**
- **Critical for African trade focus:** Pursue formal partnership
- **May require:** Formal agreement, data sharing agreement
- **Recommendation:** Begin outreach to AfCFTA Secretariat immediately

### 10.3 Implementation Strategy

1. **Start with free, open sources:** WITS, FAOSTAT, World Bank, WTO
2. **Add ITC Trade Map:** Best free comprehensive source
3. **Evaluate UN Comtrade:** Based on budget and requirements
4. **Pursue AfCFTA partnership:** Critical for African focus
5. **Build abstraction layer:** Support multiple sources seamlessly

---

## 11. Conclusion

Phase 07 requires integration with 10+ external data sources across trade statistics, tariffs, market access, trade agreements, and economic data. The strategy is to:

1. ✅ Start with free, open sources (WITS, FAOSTAT, World Bank, WTO)
2. ✅ Add ITC Trade Map (best free comprehensive source)
3. ⏳ Evaluate UN Comtrade (based on budget)
4. ⏳ Pursue AfCFTA partnership (critical for African focus)
5. ✅ Build abstraction layer for multiple sources

**Estimated Data Source Costs:**
- **Free sources:** $0/year
- **UN Comtrade (optional):** $5,000-20,000/year
- **AfCFTA partnership:** Varies (may require formal agreement)

**Total Estimated Cost:**
- **Conservative (free sources only):** $0/year
- **Comprehensive (with UN Comtrade):** $5,000-20,000/year

**Recommendation:**
Start with free sources for MVP, evaluate UN Comtrade subscription based on user feedback and commercial requirements.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-XX  
**Next Review:** Before each integration phase
