-- ============================================================================
-- Migration 0035: Intelligence Analytics Views
-- Phase 06 / Stage 3 — Unified Analytical Data Layer
--
-- Creates analytical views that join across intelligence tables for
-- cross-dimensional analysis. These views are read-only and serve as the
-- query foundation for intelligence pages, reports, and the AI analyst.
-- ============================================================================

-- ── 1. Production Trends View ───────────────────────────────────────────────

create or replace view analytics_production_trends as
select
  cp.commodity_id,
  c.name as commodity_name,
  c.slug as commodity_slug,
  cp.country_code,
  cp.year,
  cp.production_quantity_mt,
  cp.yield_mt_per_ha,
  cp.harvested_area_ha,
  cp.verification_status,

  -- Year-over-year change
  lag(cp.production_quantity_mt) over w as prev_year_production_mt,
  case
    when lag(cp.production_quantity_mt) over w is not null
      and lag(cp.production_quantity_mt) over w > 0
    then round(
      ((cp.production_quantity_mt - lag(cp.production_quantity_mt) over w) /
       lag(cp.production_quantity_mt) over w) * 100, 2
    )
    else null
  end as yoy_change_percent,

  -- 3-year average
  avg(cp.production_quantity_mt) over (
    partition by cp.commodity_id, cp.country_code
    order by cp.year
    rows between 2 preceding and current row
  ) as three_year_avg_mt,

  -- 5-year average
  avg(cp.production_quantity_mt) over (
    partition by cp.commodity_id, cp.country_code
    order by cp.year
    rows between 4 preceding and current row
  ) as five_year_avg_mt,

  -- Trend classification
  case
    when lag(cp.production_quantity_mt, 3) over w is null then null
    when cp.production_quantity_mt > lag(cp.production_quantity_mt, 3) over w * 1.05
      then 'increasing'
    when cp.production_quantity_mt < lag(cp.production_quantity_mt, 3) over w * 0.95
      then 'decreasing'
    else 'stable'
  end as trend_direction,

  -- Source attribution
  es.code as source_code,
  es.name as source_name,
  es.reliability as source_reliability

from commodity_production cp
join commodities c on c.id = cp.commodity_id
left join evidence_sources es on es.id = cp.source_id
window w as (
  partition by cp.commodity_id, cp.country_code
  order by cp.year
);

grant select on analytics_production_trends to authenticated;
revoke all on analytics_production_trends from anon;

-- ── 2. Supply-Demand Balance View ───────────────────────────────────────────

create or replace view analytics_supply_demand_balance as
select
  coalesce(s.commodity_id, d.commodity_id) as commodity_id,
  c.name as commodity_name,
  c.slug as commodity_slug,
  coalesce(s.country_code, d.country_code) as country_code,
  coalesce(s.year, d.year) as year,

  -- Supply components
  s.domestic_production_mt,
  s.imports_mt,
  s.beginning_stocks_mt,
  s.other_supply_mt,
  s.total_supply_mt,

  -- Demand components
  d.food_consumption_mt,
  d.industrial_use_mt,
  d.feed_use_mt,
  d.exports_mt,
  d.ending_stocks_mt,
  d.total_domestic_mt,
  d.total_demand_mt,

  -- Balance metrics
  case
    when s.total_supply_mt is not null and d.total_demand_mt is not null
      and d.total_demand_mt > 0
    then round(((s.total_supply_mt - d.total_demand_mt) / d.total_demand_mt) * 100, 2)
    else null
  end as supply_demand_balance_percent,

  -- Stock-to-use ratio (key food security indicator)
  case
    when d.ending_stocks_mt is not null and d.total_demand_mt is not null
      and d.total_demand_mt > 0
    then round((d.ending_stocks_mt / d.total_demand_mt) * 100, 2)
    else null
  end as stock_to_use_percent,

  -- Self-sufficiency ratio
  case
    when d.total_demand_mt is not null and d.total_demand_mt > 0
      and s.domestic_production_mt is not null
    then round((s.domestic_production_mt / d.total_demand_mt) * 100, 2)
    else null
  end as self_sufficiency_percent,

  -- Import dependency ratio
  case
    when d.total_demand_mt is not null and d.total_demand_mt > 0
      and s.imports_mt is not null
    then round((s.imports_mt / d.total_demand_mt) * 100, 2)
    else null
  end as import_dependency_percent

from commodity_supply s
full outer join commodity_demand d on
  s.commodity_id = d.commodity_id
  and s.country_code = d.country_code
  and s.year = d.year
join commodities c on c.id = coalesce(s.commodity_id, d.commodity_id);

grant select on analytics_supply_demand_balance to authenticated;
revoke all on analytics_supply_demand_balance from anon;

-- ── 3. Trade Summary View ───────────────────────────────────────────────────

create or replace view analytics_trade_summary as
select
  ct.commodity_id,
  c.name as commodity_name,
  c.slug as commodity_slug,
  ct.reporter_country,
  ct.year,
  ct.flow_type,

  -- Aggregated trade for this flow type
  sum(ct.quantity_mt) as total_quantity_mt,
  sum(ct.value_usd) as total_value_usd,

  -- Unit value
  case
    when sum(ct.quantity_mt) > 0 and sum(ct.value_usd) is not null
    then round(sum(ct.value_usd) / sum(ct.quantity_mt), 2)
    else null
  end as avg_unit_value_usd_per_mt,

  -- Number of partner countries
  count(distinct ct.partner_country) as partner_count,

  -- Top partners (aggregated as JSON)
  json_agg(
    json_build_object(
      'partner', ct.partner_country,
      'quantity_mt', ct.quantity_mt,
      'value_usd', ct.value_usd
    )
    order by ct.quantity_mt desc nulls last
  ) filter (where ct.quantity_mt is not null) as partner_details,

  -- Source info
  es.code as source_code,
  es.name as source_name

from commodity_trade ct
join commodities c on c.id = ct.commodity_id
left join evidence_sources es on es.id = ct.source_id
group by ct.commodity_id, c.name, c.slug, ct.reporter_country, ct.year,
         ct.flow_type, es.code, es.name;

grant select on analytics_trade_summary to authenticated;
revoke all on analytics_trade_summary from anon;

-- ── 4. Commodity Intelligence Overview View ─────────────────────────────────

create or replace view analytics_commodity_overview as
select
  c.id as commodity_id,
  c.name as commodity_name,
  c.slug as commodity_slug,

  -- Latest production year
  (select max(year) from commodity_production cp
   where cp.commodity_id = c.id and cp.country_code = 'NGA') as latest_production_year,

  -- Latest production quantity
  (select cp.production_quantity_mt from commodity_production cp
   where cp.commodity_id = c.id and cp.country_code = 'NGA'
   order by cp.year desc limit 1) as latest_production_mt,

  -- Latest yield
  (select cp.yield_mt_per_ha from commodity_production cp
   where cp.commodity_id = c.id and cp.country_code = 'NGA'
   order by cp.year desc limit 1) as latest_yield_mt_per_ha,

  -- Self-sufficiency (latest)
  (select self_sufficiency_percent from analytics_supply_demand_balance sd
   where sd.commodity_id = c.id and sd.country_code = 'NGA'
   order by sd.year desc limit 1) as self_sufficiency_percent,

  -- Stock-to-use ratio (latest)
  (select stock_to_use_percent from analytics_supply_demand_balance sd
   where sd.commodity_id = c.id and sd.country_code = 'NGA'
   order by sd.year desc limit 1) as stock_to_use_percent,

  -- Total exports (latest year)
  (select sum(quantity_mt) from commodity_trade
   where commodity_id = c.id and flow_type = 'export' and reporter_country = 'NGA'
   and year = (select max(year) from commodity_trade
               where commodity_id = c.id and flow_type = 'export' and reporter_country = 'NGA')
  ) as latest_exports_mt,

  -- Total imports (latest year)
  (select sum(quantity_mt) from commodity_trade
   where commodity_id = c.id and flow_type = 'import' and reporter_country = 'NGA'
   and year = (select max(year) from commodity_trade
               where commodity_id = c.id and flow_type = 'import' and reporter_country = 'NGA')
  ) as latest_imports_mt,

  -- Evidence count
  (select count(*) from commodity_production cp
   where cp.commodity_id = c.id) +
  (select count(*) from commodity_supply cs
   where cs.commodity_id = c.id) +
  (select count(*) from commodity_demand cd
   where cd.commodity_id = c.id) +
  (select count(*) from commodity_trade ct
   where ct.commodity_id = c.id) as total_evidence_records

from commodities c
order by c.name;

grant select on analytics_commodity_overview to authenticated;
revoke all on analytics_commodity_overview from anon;

-- ── 5. Intelligence Dashboard Stats View ────────────────────────────────────

create or replace view analytics_intelligence_dashboard as
select
  'production' as dimension,
  count(*) as total_records,
  count(distinct commodity_id) as commodity_count,
  count(distinct country_code) as country_count,
  min(year) as year_from,
  max(year) as year_to
from commodity_production

union all

select
  'supply' as dimension,
  count(*) as total_records,
  count(distinct commodity_id) as commodity_count,
  count(distinct country_code) as country_count,
  min(year) as year_from,
  max(year) as year_to
from commodity_supply

union all

select
  'demand' as dimension,
  count(*) as total_records,
  count(distinct commodity_id) as commodity_count,
  count(distinct country_code) as country_count,
  min(year) as year_from,
  max(year) as year_to
from commodity_demand

union all

select
  'trade' as dimension,
  count(*) as total_records,
  count(distinct commodity_id) as commodity_count,
  count(distinct reporter_country || '-' || partner_country) as country_count,
  min(year) as year_from,
  max(year) as year_to
from commodity_trade;

grant select on analytics_intelligence_dashboard to authenticated;
revoke all on analytics_intelligence_dashboard from anon;
