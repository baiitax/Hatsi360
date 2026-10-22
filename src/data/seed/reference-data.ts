/**
 * Reference data for Pluck Live.
 *
 * Provenance:
 *  - Countries, states, markets, categories and commodities are transcribed from
 *    the public catalogue pages of https://liveprice.pluckagro.com (captured
 *    2026-10-22, see audit/legacy-pages/).
 *  - Descriptions are verbatim from the live site except where noted.
 *  - No price data lives in this file.
 *
 * These are the *seed* rows. In a Supabase deployment the same content is
 * inserted by `supabase/migrations/0002_seed_reference_data.sql`; this module
 * exists so the application can run locally without a database and so the two
 * can be diffed.
 */

import type {
  Commodity,
  CommodityCategory,
  CommodityGrade,
  CommodityVariety,
  Country,
  Market,
  MarketZone,
  MeasurementUnit,
  State,
} from '@/types/domain';

/* ------------------------------------------------------------------ country */

export const countries: Country[] = [
  { id: 1, code: 'NG', name: 'Nigeria', currencyCode: 'NGN', currencySymbol: '₦' },
];

/* -------------------------------------------------------------------- state */

export const states: State[] = [
  { id: 1, countryId: 1, code: 'LA', name: 'Lagos', slug: 'lagos' },
  { id: 2, countryId: 1, code: 'KN', name: 'Kano', slug: 'kano' },
  { id: 3, countryId: 1, code: 'JI', name: 'Jigawa', slug: 'jigawa' },
  { id: 4, countryId: 1, code: 'KD', name: 'Kaduna', slug: 'kaduna' },
  { id: 5, countryId: 1, code: 'KT', name: 'Katsina', slug: 'katsina' },
  { id: 6, countryId: 1, code: 'ZM', name: 'Zamfara', slug: 'zamfara' },
  { id: 7, countryId: 1, code: 'NA', name: 'Nasarawa', slug: 'nasarawa' },
  { id: 8, countryId: 1, code: 'BO', name: 'Borno', slug: 'borno' },
  { id: 9, countryId: 1, code: 'BA', name: 'Bauchi', slug: 'bauchi' },
  { id: 10, countryId: 1, code: 'BE', name: 'Benue', slug: 'benue' },
  { id: 11, countryId: 1, code: 'SO', name: 'Sokoto', slug: 'sokoto' },
];

/**
 * Market zones are a concept introduced by this rebuild. The legacy system had
 * no zone layer, so no zone is asserted here. The column stays nullable and
 * operations staff populate it from field knowledge.
 */
export const marketZones: MarketZone[] = [];

/* ------------------------------------------------------------------- market */

export const markets: Market[] = [
  {
    id: 1,
    legacyId: 7,
    marketZoneId: null,
    stateId: 2,
    name: 'Dawanau International Grains Market',
    slug: 'dawanau-international-grains-market',
    description:
      "West Africa's largest grain market, trading in sorghum, millet, maize, rice, and beans.",
    address: 'Dawanau, Kano',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 2,
    legacyId: 1,
    marketZoneId: null,
    stateId: 1,
    name: 'Mile 12 Market',
    slug: 'mile-12-market',
    description: null,
    address: 'Mile 12, Lagos',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 3,
    legacyId: 9,
    marketZoneId: null,
    stateId: 3,
    name: 'Gujungu Market',
    slug: 'gujungu-market',
    description: 'A famous weekly market known for a wide variety of grains and livestock.',
    address: 'Gujungu, Jigawa',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 4,
    legacyId: 10,
    marketZoneId: null,
    stateId: 4,
    name: 'Anchau Grains Market',
    slug: 'anchau-grains-market',
    description:
      'A significant local market for grains like maize and sorghum in Kaduna.',
    address: 'Anchau, Kaduna',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 5,
    legacyId: 8,
    marketZoneId: null,
    stateId: 5,
    name: 'Funtua Grains Market',
    slug: 'funtua-grains-market',
    description: 'A major hub for maize, sorghum, and other grains in Katsina State.',
    address: 'Funtua, Katsina',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 6,
    legacyId: 12,
    marketZoneId: null,
    stateId: 6,
    name: 'Gusau Central Market',
    slug: 'gusau-central-market',
    description:
      'The main trading center for agricultural goods, including millet and sorghum, in Zamfara.',
    address: 'Gusau, Zamfara',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 7,
    legacyId: 13,
    marketZoneId: null,
    stateId: 8,
    name: 'Maiduguri Monday Market',
    slug: 'maiduguri-monday-market',
    description:
      'A historic and vital market for the North-East, trading in beans, millet, and imported rice.',
    address: 'Maiduguri, Borno',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 8,
    legacyId: 11,
    marketZoneId: null,
    stateId: 11,
    name: 'Sokoto Central Market',
    slug: 'sokoto-central-market',
    description:
      'A large urban market with a significant section for grains and other agricultural produce.',
    address: 'Sokoto, Sokoto',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 9,
    legacyId: 14,
    marketZoneId: null,
    stateId: 9,
    name: 'Wunti Market',
    slug: 'wunti-market',
    description:
      'The primary market in Bauchi city, with a large section dedicated to local grains.',
    address: 'Wunti, Bauchi',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 10,
    legacyId: 15,
    marketZoneId: null,
    stateId: 10,
    name: 'Zaki Biam International Yam Market',
    slug: 'zaki-biam-international-yam-market',
    description:
      'The largest yam market in the world, which also facilitates the trade of other grains like rice and maize.',
    address: 'Zaki Biam, Benue',
    latitude: null,
    longitude: null,
    isActive: true,
  },
  {
    id: 11,
    legacyId: 16,
    marketZoneId: null,
    stateId: 7,
    name: 'Lafia Modern Market',
    slug: 'lafia-modern-market',
    description:
      'A central market in Nasarawa state for various food items, including locally grown rice and other grains.',
    address: 'Lafia, Nasarawa',
    latitude: null,
    longitude: null,
    isActive: true,
  },
];

/* ---------------------------------------------------------------- categories */

/**
 * The legacy site used five category labels. This rebuild keeps those five as
 * the *source* taxonomy and adds the wider Pluck Live taxonomy underneath, so
 * historical records keep their original classification and new commodities can
 * be filed consistently.
 */
export const commodityCategories: CommodityCategory[] = [
  {
    id: 1,
    slug: 'grains-cereals',
    name: 'Grains & Cereals',
    description: 'Maize, rice, millet, sorghum, wheat and other cereal grains.',
    sortOrder: 10,
  },
  {
    id: 2,
    slug: 'pulses-legumes',
    name: 'Pulses & Legumes',
    description: 'Beans, cowpeas, peas and groundnuts.',
    sortOrder: 20,
  },
  {
    id: 3,
    slug: 'oilseeds',
    name: 'Oilseeds',
    description: 'Soya bean, sesame seed and other oil-bearing seeds.',
    sortOrder: 30,
  },
  {
    id: 4,
    slug: 'roots-tubers',
    name: 'Roots & Tubers',
    description: 'Yam, cassava, sweet potato and related staples.',
    sortOrder: 40,
  },
  {
    id: 5,
    slug: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    description: 'Fresh horticultural produce.',
    sortOrder: 50,
  },
  {
    id: 6,
    slug: 'spices-herbs',
    name: 'Spices & Herbs',
    description: 'Dried chillies, ginger, turmeric and other flavourings.',
    sortOrder: 60,
  },
  {
    id: 7,
    slug: 'tree-crops',
    name: 'Tree Crops',
    description: 'Cocoa, cashew, kola nut, gum arabic and other tree-derived crops.',
    sortOrder: 70,
  },
  {
    id: 8,
    slug: 'livestock-poultry',
    name: 'Livestock & Poultry',
    description: 'Live cattle, goats, sheep and poultry.',
    sortOrder: 80,
  },
  {
    id: 9,
    slug: 'animal-products',
    name: 'Animal Products',
    description: 'Milk, eggs, hides and other animal-derived products.',
    sortOrder: 90,
  },
  {
    id: 10,
    slug: 'processed-agricultural',
    name: 'Processed Agricultural Products',
    description: 'Rice, tomato paste, oil and other value-added agricultural output.',
    sortOrder: 100,
  },
  {
    id: 11,
    slug: 'export-commodities',
    name: 'Export Commodities',
    description: 'Commodities primarily traded for export.',
    sortOrder: 110,
  },
  {
    id: 12,
    slug: 'agricultural-by-products',
    name: 'Agricultural By-Products',
    description: 'Bran, cake, husk and other processing by-products.',
    sortOrder: 120,
  },
  {
    id: 13,
    slug: 'cash-crops',
    name: 'Cash Crops',
    description: 'Legacy grouping for gum arabic and other export cash crops.',
    sortOrder: 130,
  },
  {
    id: 14,
    slug: 'other-agricultural',
    name: 'Other Agricultural Products',
    description: 'Approved agricultural products without a more specific home.',
    sortOrder: 140,
  },
];

/** Legacy category label -> Pluck Live category id. */
export const legacyCategoryMap: Record<string, number> = {
  Grains: 1,
  Legumes: 2,
  Spices: 6,
  'Cash Crops': 13,
  Tubers: 4,
};

/* --------------------------------------------------------------- commodities */

/**
 * `legacyId` maps to the `commodities.id` used by the previous PHP site so that
 * migrated price rows keep pointing at the right product.
 *
 * Two records are named "Paddy Rice" on the live site: id 1 (3 markets, the one
 * that actually carries prices) and id 19 (0 markets). id 19 is an orphan
 * duplicate and is imported deactivated, not deleted.
 */
export const commodities: Commodity[] = [
  { id: 1, legacyId: 1, categoryId: 1, name: 'Paddy Rice', slug: 'paddy-rice', description: 'Locally grown paddy rice, unprocessed.', isActive: true, defaultVarietyId: null },
  { id: 2, legacyId: 19, categoryId: 1, name: 'Paddy Rice (duplicate record)', slug: 'paddy-rice-duplicate-record', description: 'Unhusked rice, a major staple food.', isActive: false, defaultVarietyId: null },
  { id: 3, legacyId: 20, categoryId: 1, name: 'Imported Rice', slug: 'imported-rice', description: 'Rice imported from other countries, typically parboiled.', isActive: true, defaultVarietyId: null },
  { id: 4, legacyId: 21, categoryId: 1, name: 'Local Rice', slug: 'local-rice', description: 'Locally grown and processed rice, such as Ofada or Abakaliki rice.', isActive: true, defaultVarietyId: null },
  { id: 5, legacyId: 32, categoryId: 1, name: 'Wheat', slug: 'wheat', description: 'A cereal grain which is a worldwide staple food.', isActive: true, defaultVarietyId: null },
  { id: 6, legacyId: 14, categoryId: 1, name: 'Maize (White)', slug: 'maize-white', description: 'A common cereal grain, white variety.', isActive: true, defaultVarietyId: null },
  { id: 7, legacyId: 15, categoryId: 1, name: 'Maize (Yellow)', slug: 'maize-yellow', description: 'A common cereal grain, yellow variety.', isActive: true, defaultVarietyId: null },
  { id: 8, legacyId: 18, categoryId: 1, name: 'Millet', slug: 'millet', description: 'A small-seeded grass, highly tolerant of drought and other extreme weather conditions.', isActive: true, defaultVarietyId: null },
  { id: 9, legacyId: 16, categoryId: 1, name: 'Sorghum (White)', slug: 'sorghum-white', description: 'A versatile grain used for food and feed.', isActive: true, defaultVarietyId: null },
  { id: 10, legacyId: 17, categoryId: 1, name: 'Sorghum (Red)', slug: 'sorghum-red', description: 'A variety of sorghum often used in traditional drinks and porages.', isActive: true, defaultVarietyId: null },
  { id: 11, legacyId: 31, categoryId: 3, name: 'Sesame Seed', slug: 'sesame-seed', description: 'A flowering plant in the genus Sesamum, also called benne.', isActive: true, defaultVarietyId: null },
  { id: 12, legacyId: 22, categoryId: 2, name: 'Soya Beans', slug: 'soya-beans', description: 'A species of legume native to East Asia, widely grown for its edible bean.', isActive: true, defaultVarietyId: null },
  { id: 13, legacyId: 25, categoryId: 2, name: 'Groundnut', slug: 'groundnut', description: 'Also known as peanut, a legume crop grown mainly for its edible seeds.', isActive: true, defaultVarietyId: null },
  { id: 14, legacyId: 33, categoryId: 2, name: 'Bambara Nuts', slug: 'bambara-nuts', description: 'A type of groundnut, a popular legume in Nigeria.', isActive: true, defaultVarietyId: null },
  { id: 15, legacyId: 23, categoryId: 2, name: 'Brown Beans (Oloyin)', slug: 'brown-beans-oloyin', description: 'A variety of cowpea known for its sweet taste.', isActive: true, defaultVarietyId: null },
  { id: 16, legacyId: 24, categoryId: 2, name: 'White Beans', slug: 'white-beans', description: 'A variety of cowpea with a white skin.', isActive: true, defaultVarietyId: null },
  { id: 17, legacyId: 30, categoryId: 6, name: 'Dried Chilli Pepper', slug: 'dried-chilli-pepper', description: 'Dried fruit of plants from the genus Capsicum, used as a spice.', isActive: true, defaultVarietyId: null },
  { id: 18, legacyId: 29, categoryId: 6, name: 'Dried Ginger', slug: 'dried-ginger', description: 'The dried rhizome of the ginger plant, used as a spice.', isActive: true, defaultVarietyId: null },
  { id: 19, legacyId: 13, categoryId: 13, name: 'Gum Arabic GR-I', slug: 'gum-arabic-gr-i', description: null, isActive: true, defaultVarietyId: null },
  { id: 20, legacyId: 34, categoryId: 13, name: 'Gum Arabic GR-II', slug: 'gum-arabic-gr-ii', description: null, isActive: true, defaultVarietyId: null },
  { id: 21, legacyId: 35, categoryId: 13, name: 'Gum Arabic GR-III', slug: 'gum-arabic-gr-iii', description: null, isActive: true, defaultVarietyId: null },
  { id: 22, legacyId: 28, categoryId: 4, name: 'Sweet Potato', slug: 'sweet-potato', description: 'A large, starchy, sweet-tasting tuberous root.', isActive: true, defaultVarietyId: null },
];

/** Local names and spelling variants used to widen search. */
export const commoditySynonyms: Record<string, string[]> = {
  'paddy-rice': ['paddy', 'unmilled rice', 'rice paddy', 'paddy rice'],
  'local-rice': ['ofada rice', 'abakaliki rice', 'local rice', 'made-in-nigeria rice'],
  'imported-rice': ['foreign rice', 'imported rice'],
  'maize-white': ['white maize', 'maize', 'corn'],
  'maize-yellow': ['yellow maize', 'maize'],
  'groundnut': ['peanut', 'ground nut', 'groundnut'],
  'soya-beans': ['soybean', 'soy beans', 'soya bean'],
  'sesame-seed': ['benne', 'sesame', 'simsim'],
  'brown-beans-oloyin': ['oloyin', 'brown cowpea', 'brown beans'],
  'white-beans': ['white cowpea', 'white beans'],
  'bambara-nuts': ['bambara', 'okpa', 'bambara groundnut'],
  'sorghum-red': ['red sorghum', 'guinea corn', 'dawawa'],
  'sorghum-white': ['white sorghum', 'guinea corn'],
  'sweet-potato': ['sweet potatoes', 'yam tubers'],
  'gum-arabic-gr-i': ['gum arabic', 'acacia', 'hashab'],
};

export const commodityVarieties: CommodityVariety[] = [];
export const commodityGrades: CommodityGrade[] = [];

/* -------------------------------------------------------------------- units */

/**
 * `bag` deliberately has no base factor: the weight of a bag depends on the
 * commodity and the packer, so it is only convertible through a verified
 * `commodity_unit_conversions` row (or a package weight captured with the
 * observation itself).
 */
export const measurementUnits: MeasurementUnit[] = [
  { id: 1, code: 'kg', name: 'kilogram', pluralName: 'kilograms', dimension: 'mass', baseUnitId: 1, baseFactor: 1, isSpecific: true },
  { id: 2, code: 'g', name: 'gram', pluralName: 'grams', dimension: 'mass', baseUnitId: 1, baseFactor: 0.001, isSpecific: true },
  { id: 3, code: 't', name: 'metric tonne', pluralName: 'metric tonnes', dimension: 'mass', baseUnitId: 1, baseFactor: 1000, isSpecific: true },
  { id: 4, code: 'bag', name: 'bag (commodity-specific weight)', pluralName: 'bags', dimension: 'mass', baseUnitId: 1, baseFactor: null, isSpecific: true },
  { id: 5, code: 'crate', name: 'crate (commodity-specific count)', pluralName: 'crates', dimension: 'count', baseUnitId: 7, baseFactor: null, isSpecific: true },
  { id: 6, code: 'litre', name: 'litre', pluralName: 'litres', dimension: 'volume', baseUnitId: 6, baseFactor: 1, isSpecific: true },
  { id: 7, code: 'piece', name: 'piece', pluralName: 'pieces', dimension: 'count', baseUnitId: 7, baseFactor: 1, isSpecific: true },
  {
    id: 8,
    code: 'unspecified',
    name: 'unit not recorded',
    pluralName: 'unit not recorded',
    dimension: 'unknown',
    baseUnitId: null,
    baseFactor: null,
    isSpecific: false,
  },
];
