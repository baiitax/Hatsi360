-- =============================================================================
-- Pluck Live — 0007 reference data seed
-- =============================================================================
-- GENERATED FILE — edit src/data/seed/reference-data.ts and re-run
--   python3 scripts/gen_seed_migration.py
--
-- This seed contains REFERENCE DATA ONLY. It creates no price observations and
-- no prices of any kind. Migrated price records live in the separate, explicitly
-- authorised data migration documented in docs/DATA_MIGRATION.md.
-- =============================================================================

set check_function_bodies = off;

-- ------------------------------------------------------------- countries ---
insert into public.countries (id, code, name, currency_code, currency_symbol) overriding system value
values
  (1, 'NG', 'Nigeria', 'NGN', '₦');
select setval(pg_get_serial_sequence('public.countries','id'), coalesce(max(id),1)) from public.countries;

-- ---------------------------------------------------------------- states ---
insert into public.states (id, country_id, code, name, slug) overriding system value
values
  (1, 1, 'LA', 'Lagos', 'lagos'),
  (2, 1, 'KN', 'Kano', 'kano'),
  (3, 1, 'JI', 'Jigawa', 'jigawa'),
  (4, 1, 'KD', 'Kaduna', 'kaduna'),
  (5, 1, 'KT', 'Katsina', 'katsina'),
  (6, 1, 'ZM', 'Zamfara', 'zamfara'),
  (7, 1, 'NA', 'Nasarawa', 'nasarawa'),
  (8, 1, 'BO', 'Borno', 'borno'),
  (9, 1, 'BA', 'Bauchi', 'bauchi'),
  (10, 1, 'BE', 'Benue', 'benue'),
  (11, 1, 'SO', 'Sokoto', 'sokoto');
select setval(pg_get_serial_sequence('public.states','id'), coalesce(max(id),1)) from public.states;

-- ---------------------------------------------------------------- markets ---
-- market_zone_id is left null: the legacy system had no zone concept and none
-- is asserted here. Operations staff populate it from field knowledge.
insert into public.markets (id, legacy_id, state_id, name, slug, description, address) overriding system value
values
  (1, 7, 2, 'Dawanau International Grains Market', 'dawanau-international-grains-market', 'West Africa''s largest grain market, trading in sorghum, millet, maize, rice, and beans.', 'Dawanau, Kano'),
  (2, 1, 1, 'Mile 12 Market', 'mile-12-market', null, 'Mile 12, Lagos'),
  (3, 9, 3, 'Gujungu Market', 'gujungu-market', 'A famous weekly market known for a wide variety of grains and livestock.', 'Gujungu, Jigawa'),
  (4, 10, 4, 'Anchau Grains Market', 'anchau-grains-market', 'A significant local market for grains like maize and sorghum in Kaduna.', 'Anchau, Kaduna'),
  (5, 8, 5, 'Funtua Grains Market', 'funtua-grains-market', 'A major hub for maize, sorghum, and other grains in Katsina State.', 'Funtua, Katsina'),
  (6, 12, 6, 'Gusau Central Market', 'gusau-central-market', 'The main trading center for agricultural goods, including millet and sorghum, in Zamfara.', 'Gusau, Zamfara'),
  (7, 13, 8, 'Maiduguri Monday Market', 'maiduguri-monday-market', 'A historic and vital market for the North-East, trading in beans, millet, and imported rice.', 'Maiduguri, Borno'),
  (8, 11, 11, 'Sokoto Central Market', 'sokoto-central-market', 'A large urban market with a significant section for grains and other agricultural produce.', 'Sokoto, Sokoto'),
  (9, 14, 9, 'Wunti Market', 'wunti-market', 'The primary market in Bauchi city, with a large section dedicated to local grains.', 'Wunti, Bauchi'),
  (10, 15, 10, 'Zaki Biam International Yam Market', 'zaki-biam-international-yam-market', 'The largest yam market in the world, which also facilitates the trade of other grains like rice and maize.', 'Zaki Biam, Benue'),
  (11, 16, 7, 'Lafia Modern Market', 'lafia-modern-market', 'A central market in Nasarawa state for various food items, including locally grown rice and other grains.', 'Lafia, Nasarawa');
select setval(pg_get_serial_sequence('public.markets','id'), coalesce(max(id),1)) from public.markets;

-- ----------------------------------------------------- commodity categories -
insert into public.commodity_categories (id, slug, name, description, sort_order) overriding system value
values
  (1, 'grains-cereals', 'Grains & Cereals', 'Maize, rice, millet, sorghum, wheat and other cereal grains.', 10),
  (2, 'pulses-legumes', 'Pulses & Legumes', 'Beans, cowpeas, peas and groundnuts.', 20),
  (3, 'oilseeds', 'Oilseeds', 'Soya bean, sesame seed and other oil-bearing seeds.', 30),
  (4, 'roots-tubers', 'Roots & Tubers', 'Yam, cassava, sweet potato and related staples.', 40),
  (5, 'fruits-vegetables', 'Fruits & Vegetables', 'Fresh horticultural produce.', 50),
  (6, 'spices-herbs', 'Spices & Herbs', 'Dried chillies, ginger, turmeric and other flavourings.', 60),
  (7, 'tree-crops', 'Tree Crops', 'Cocoa, cashew, kola nut, gum arabic and other tree-derived crops.', 70),
  (8, 'livestock-poultry', 'Livestock & Poultry', 'Live cattle, goats, sheep and poultry.', 80),
  (9, 'animal-products', 'Animal Products', 'Milk, eggs, hides and other animal-derived products.', 90),
  (10, 'processed-agricultural', 'Processed Agricultural Products', 'Rice, tomato paste, oil and other value-added agricultural output.', 100),
  (11, 'export-commodities', 'Export Commodities', 'Commodities primarily traded for export.', 110),
  (12, 'agricultural-by-products', 'Agricultural By-Products', 'Bran, cake, husk and other processing by-products.', 120),
  (13, 'cash-crops', 'Cash Crops', 'Legacy grouping for gum arabic and other export cash crops.', 130),
  (14, 'other-agricultural', 'Other Agricultural Products', 'Approved agricultural products without a more specific home.', 140);
select setval(pg_get_serial_sequence('public.commodity_categories','id'), coalesce(max(id),1)) from public.commodity_categories;

-- ------------------------------------------------------------ commodities --
insert into public.commodities (id, legacy_id, category_id, name, slug, description, is_active) overriding system value
values
  (1, 1, 1, 'Paddy Rice', 'paddy-rice', 'Locally grown paddy rice, unprocessed.', true),
  (2, 19, 1, 'Paddy Rice (duplicate record)', 'paddy-rice-duplicate-record', 'Unhusked rice, a major staple food.', false),
  (3, 20, 1, 'Imported Rice', 'imported-rice', 'Rice imported from other countries, typically parboiled.', true),
  (4, 21, 1, 'Local Rice', 'local-rice', 'Locally grown and processed rice, such as Ofada or Abakaliki rice.', true),
  (5, 32, 1, 'Wheat', 'wheat', 'A cereal grain which is a worldwide staple food.', true),
  (6, 14, 1, 'Maize (White)', 'maize-white', 'A common cereal grain, white variety.', true),
  (7, 15, 1, 'Maize (Yellow)', 'maize-yellow', 'A common cereal grain, yellow variety.', true),
  (8, 18, 1, 'Millet', 'millet', 'A small-seeded grass, highly tolerant of drought and other extreme weather conditions.', true),
  (9, 16, 1, 'Sorghum (White)', 'sorghum-white', 'A versatile grain used for food and feed.', true),
  (10, 17, 1, 'Sorghum (Red)', 'sorghum-red', 'A variety of sorghum often used in traditional drinks and porages.', true),
  (11, 31, 3, 'Sesame Seed', 'sesame-seed', 'A flowering plant in the genus Sesamum, also called benne.', true),
  (12, 22, 2, 'Soya Beans', 'soya-beans', 'A species of legume native to East Asia, widely grown for its edible bean.', true),
  (13, 25, 2, 'Groundnut', 'groundnut', 'Also known as peanut, a legume crop grown mainly for its edible seeds.', true),
  (14, 33, 2, 'Bambara Nuts', 'bambara-nuts', 'A type of groundnut, a popular legume in Nigeria.', true),
  (15, 23, 2, 'Brown Beans (Oloyin)', 'brown-beans-oloyin', 'A variety of cowpea known for its sweet taste.', true),
  (16, 24, 2, 'White Beans', 'white-beans', 'A variety of cowpea with a white skin.', true),
  (17, 30, 6, 'Dried Chilli Pepper', 'dried-chilli-pepper', 'Dried fruit of plants from the genus Capsicum, used as a spice.', true),
  (18, 29, 6, 'Dried Ginger', 'dried-ginger', 'The dried rhizome of the ginger plant, used as a spice.', true),
  (19, 13, 13, 'Gum Arabic GR-I', 'gum-arabic-gr-i', null, true),
  (20, 34, 13, 'Gum Arabic GR-II', 'gum-arabic-gr-ii', null, true),
  (21, 35, 13, 'Gum Arabic GR-III', 'gum-arabic-gr-iii', null, true),
  (22, 28, 4, 'Sweet Potato', 'sweet-potato', 'A large, starchy, sweet-tasting tuberous root.', true);
select setval(pg_get_serial_sequence('public.commodities','id'), coalesce(max(id),1)) from public.commodities;

-- ------------------------------------------------------- measurement units --
insert into public.measurement_units (id, code, name, plural_name, dimension, base_unit_id, base_factor, is_specific) overriding system value
values
  (1, 'kg', 'kilogram', 'kilograms', 'mass', 1, 1, 'true'),
  (2, 'g', 'gram', 'grams', 'mass', 1, 0.001, 'true'),
  (3, 't', 'metric tonne', 'metric tonnes', 'mass', 1, 1000, 'true'),
  (4, 'bag', 'bag (commodity-specific weight)', 'bags', 'mass', 1, null, 'true'),
  (5, 'crate', 'crate (commodity-specific count)', 'crates', 'count', 7, null, 'true'),
  (6, 'litre', 'litre', 'litres', 'volume', 6, 1, 'true'),
  (7, 'piece', 'piece', 'pieces', 'count', 7, 1, 'true'),
  (8, 'unspecified', 'unit not recorded', 'unit not recorded', 'unknown', null, null, 'false');
select setval(pg_get_serial_sequence('public.measurement_units','id'), coalesce(max(id),1)) from public.measurement_units;

-- -------------------------------------------------------------- synonyms ---
insert into public.commodity_synonyms (commodity_id, synonym)
values
  (1, 'paddy'),
  (1, 'unmilled rice'),
  (1, 'rice paddy'),
  (1, 'paddy rice'),
  (4, 'ofada rice'),
  (4, 'abakaliki rice'),
  (4, 'local rice'),
  (4, 'made-in-nigeria rice'),
  (3, 'foreign rice'),
  (3, 'imported rice'),
  (6, 'white maize'),
  (6, 'maize'),
  (6, 'corn'),
  (7, 'yellow maize'),
  (7, 'maize'),
  (13, 'peanut'),
  (13, 'ground nut'),
  (13, 'groundnut'),
  (12, 'soybean'),
  (12, 'soy beans'),
  (12, 'soya bean'),
  (11, 'benne'),
  (11, 'sesame'),
  (11, 'simsim'),
  (15, 'oloyin'),
  (15, 'brown cowpea'),
  (15, 'brown beans'),
  (16, 'white cowpea'),
  (16, 'white beans'),
  (14, 'bambara'),
  (14, 'okpa'),
  (14, 'bambara groundnut'),
  (10, 'red sorghum'),
  (10, 'guinea corn'),
  (10, 'dawawa'),
  (9, 'white sorghum'),
  (9, 'guinea corn'),
  (22, 'sweet potatoes'),
  (22, 'yam tubers'),
  (19, 'gum arabic'),
  (19, 'acacia'),
  (19, 'hashab');

-- =============================================================================
-- NOTE ON commodity_unit_conversions
--
-- This table is intentionally EMPTY. A bag of maize and a bag of cocoa do not
-- weigh the same, so a conversion may only exist once its weight has been
-- verified in the field. Agents record the actual package weight on each
-- observation instead, and operations staff add a conversion row once a
-- commodity-specific pack weight has been confirmed.
-- =============================================================================
