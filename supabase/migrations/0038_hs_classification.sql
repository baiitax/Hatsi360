-- Migration 0038: HS Code Classification System
-- Phase 07 Stage 2: Harmonized System codes for trade classification

-- Create HS revisions table
CREATE TABLE IF NOT EXISTS hs_revisions (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HS codes table
CREATE TABLE IF NOT EXISTS hs_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  level VARCHAR(20) NOT NULL, -- 'chapter' (2-digit), 'heading' (4-digit), 'subheading' (6-digit)
  parent_id INTEGER REFERENCES hs_codes(id),
  revision_id INTEGER NOT NULL REFERENCES hs_revisions(id),
  description TEXT NOT NULL,
  -- Unit quantity/weight for this code
  primary_unit TEXT, -- 'kg', 'litre', 'pairs', 'number', 'dozen', 'carat'
  is_agricultural BOOLEAN DEFAULT FALSE,
  is_industrial BOOLEAN DEFAULT FALSE,
  -- Trade statistics cache (populated by data ingestion)
  global_import_value_usd BIGINT,
  global_export_value_usd BIGINT,
  last_trade_data_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, revision_id)
);

-- Create commodity-to-HS mapping
CREATE TABLE IF NOT EXISTS commodity_hs_mappings (
  id SERIAL PRIMARY KEY,
  commodity_id INTEGER NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  hs_code_id INTEGER NOT NULL REFERENCES hs_codes(id) ON DELETE CASCADE,
  mapping_confidence VARCHAR(20) DEFAULT 'high', -- 'high', 'medium', 'approximate'
  notes TEXT,
  is_primary BOOLEAN DEFAULT TRUE, -- A commodity may map to multiple HS codes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity_id, hs_code_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hs_codes_code ON hs_codes(code);
CREATE INDEX IF NOT EXISTS idx_hs_codes_level ON hs_codes(level);
CREATE INDEX IF NOT EXISTS idx_hs_codes_parent ON hs_codes(parent_id);
CREATE INDEX IF NOT EXISTS idx_hs_codes_revision ON hs_codes(revision_id);
CREATE INDEX IF NOT EXISTS idx_hs_codes_agricultural ON hs_codes(is_agricultural);
CREATE INDEX IF NOT EXISTS idx_commodity_hs_mappings_commodity ON commodity_hs_mappings(commodity_id);
CREATE INDEX IF NOT EXISTS idx_commodity_hs_mappings_hs_code ON commodity_hs_mappings(hs_code_id);

-- Insert current HS revision
INSERT INTO hs_revisions (version, effective_date, is_current, description) VALUES
('HS 2022', '2022-01-01', TRUE, 'Harmonized System 2022 edition (7th revision)');

-- Insert HS chapter codes (2-digit level)
-- Only chapters relevant to the 22 commodities in the database
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('01', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Live animals', 'kg', TRUE, FALSE),
('02', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Meat and edible meat offal', 'kg', TRUE, FALSE),
('03', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Fish and crustaceans, molluscs', 'kg', TRUE, FALSE),
('04', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Dairy produce; birds eggs; natural honey; edible products of animal origin', 'kg', TRUE, FALSE),
('06', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Live trees and other plants; bulbs, roots; cut flowers', 'kg', TRUE, FALSE),
('07', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Edible vegetables and certain roots and tubers', 'kg', TRUE, FALSE),
('08', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Edible fruit and nuts; peel of citrus fruit or melons', 'kg', TRUE, FALSE),
('09', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Coffee, tea, maté and spices', 'kg', TRUE, FALSE),
('10', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Cereals', 'kg', TRUE, FALSE),
('11', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Products of the milling industry; malt; starches; inulin; wheat gluten', 'kg', TRUE, FALSE),
('12', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Oil seeds and oleaginous fruits; miscellaneous grains, seeds and fruit; industrial or medicinal plants; straw and fodder', 'kg', TRUE, FALSE),
('13', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Lac; gums, resins and other vegetable saps and extracts', 'kg', TRUE, FALSE),
('14', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Vegetable plaiting materials; vegetable products not elsewhere specified', 'kg', TRUE, FALSE),
('15', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Animal or vegetable fats and oils and their cleavage products; prepared edible fats; animal or vegetable waxes', 'kg', TRUE, FALSE),
('16', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Preparations of meat, of fish or of crustaceans, molluscs or other aquatic invertebrates', 'kg', TRUE, FALSE),
('17', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Sugars and sugar confectionery', 'kg', TRUE, FALSE),
('18', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Cocoa and cocoa preparations', 'kg', TRUE, FALSE),
('19', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Preparations of cereals, flour, starch or milk; pastrycooks'' products', 'kg', TRUE, FALSE),
('20', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Preparations of vegetables, fruit, nuts or other parts of plants', 'kg', TRUE, FALSE),
('21', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Miscellaneous edible preparations', 'kg', TRUE, FALSE),
('22', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Beverages, spirits and vinegar', 'litre', TRUE, FALSE),
('23', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Residues and waste from the food industries; prepared animal fodder', 'kg', TRUE, FALSE),
('24', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Tobacco and manufactured tobacco substitutes', 'kg', TRUE, FALSE),
('25', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Salt; sulphur; earths and stone; plastering materials, lime and cement', 'kg', FALSE, TRUE),
('27', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Mineral fuels, mineral oils and products of their distillation', 'litre', FALSE, TRUE),
('28', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Inorganic chemicals; organic or inorganic compounds of precious metals, of rare-earth metals, of radioactive elements or of isotopes', 'kg', FALSE, TRUE),
('29', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Organic chemicals', 'kg', FALSE, TRUE),
('30', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Pharmaceutical products', 'kg', FALSE, TRUE),
('31', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Fertilisers', 'kg', TRUE, TRUE),
('32', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Tanning or dyeing extracts; dyes, pigments, paints, putty and mastics', 'kg', FALSE, TRUE),
('33', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Essential oils and resinoids; perfumery, cosmetic or toilet preparations', 'kg', FALSE, FALSE),
('38', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Miscellaneous chemical products', 'kg', FALSE, TRUE),
('39', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Plastics and articles thereof', 'kg', FALSE, TRUE),
('40', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Rubber and articles thereof', 'kg', FALSE, TRUE),
('41', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Raw hides and skins (other than furskins) and leather', 'kg', TRUE, FALSE),
('42', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Articles of leather; saddlery and harness; travel goods, handbags; articles of animal gut', 'kg', TRUE, FALSE),
('43', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Furskins and artificial fur; manufactures thereof', 'kg', TRUE, FALSE),
('44', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Wood and articles of wood; wood charcoal', 'kg', TRUE, FALSE),
('45', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Cork and articles of cork', 'kg', TRUE, FALSE),
('46', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Manufactures of straw, of esparto or of other plaiting materials; basketware and wickerwork', 'kg', TRUE, FALSE),
('47', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Pulp of wood or of other fibrous cellulosic material; recovered paper or paperboard', 'kg', FALSE, TRUE),
('48', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Paper and paperboard; articles of paper pulp, of paper or of paperboard', 'kg', FALSE, TRUE),
('49', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Printed books, newspapers, pictures and other products of the printing industry', 'kg', FALSE, FALSE),
('50', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Silk', 'kg', TRUE, FALSE),
('51', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Wool, fine or coarse animal hair; horsehair yarn and woven fabric', 'kg', TRUE, FALSE),
('52', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Cotton', 'kg', TRUE, FALSE),
('53', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Other vegetable textile fibres; paper yarn and woven fabrics thereof', 'kg', TRUE, FALSE),
('54', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Man-made filaments; strip and the like of man-made textile materials', 'kg', FALSE, TRUE),
('55', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Man-made staple fibres', 'kg', FALSE, TRUE),
('56', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Wadding, felt and nonwovens; special yarns; twine, cordage, ropes and cables and articles thereof', 'kg', FALSE, TRUE),
('57', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Carpets and other textile floor coverings', 'kg', FALSE, FALSE),
('58', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Special woven fabrics; tufted textile fabrics; lace; tapestries; trimmings; embroidery', 'kg', FALSE, FALSE),
('59', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Impregnated, coated, covered or laminated textile fabrics; textile articles of a kind suitable for industrial use', 'kg', FALSE, TRUE),
('60', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Knitted or crocheted fabrics', 'kg', FALSE, FALSE),
('61', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Articles of apparel and clothing accessories, knitted or crocheted', 'dozen', FALSE, FALSE),
('62', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Articles of apparel and clothing accessories, not knitted or crocheted', 'dozen', FALSE, FALSE),
('63', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Other made up textile articles; sets; worn clothing and worn textile articles; rags', 'kg', FALSE, FALSE),
('64', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Footwear, gaiters and the like; parts of such articles', 'pairs', FALSE, FALSE),
('65', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Headgear and parts thereof', 'dozen', FALSE, FALSE),
('66', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Umbrellas, sun umbrellas, walking-sticks, seat-sticks, whips, riding-crops and parts thereof', 'number', FALSE, FALSE),
('67', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Prepared feathers and down and articles made of feathers or of down; artificial flowers; articles of human hair', 'kg', FALSE, FALSE),
('68', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Articles of stone, plaster, cement, asbestos, mica or similar materials', 'kg', FALSE, TRUE),
('69', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Ceramic products', 'kg', FALSE, TRUE),
('70', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Glass and glassware', 'kg', FALSE, TRUE),
('71', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Natural or cultured pearls, precious or semi-precious stones, precious metals, metals clad with precious metal, and articles thereof; imitation jewellery; coin', 'kg', FALSE, TRUE),
('72', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Iron and steel', 'kg', FALSE, TRUE),
('73', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Articles of iron or steel', 'kg', FALSE, TRUE),
('74', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Copper and articles thereof', 'kg', FALSE, TRUE),
('75', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Nickel and articles thereof', 'kg', FALSE, TRUE),
('76', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Aluminium and articles thereof', 'kg', FALSE, TRUE),
('78', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Lead and articles thereof', 'kg', FALSE, TRUE),
('79', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Zinc and articles thereof', 'kg', FALSE, TRUE),
('80', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Tin and articles thereof', 'kg', FALSE, TRUE),
('81', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Other base metals; cermets; articles thereof', 'kg', FALSE, TRUE),
('82', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Tools, implements, cutlery, spoons and forks, of base metal; parts thereof of base metal', 'kg', FALSE, TRUE),
('83', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Miscellaneous articles of base metal', 'kg', FALSE, TRUE),
('84', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof', 'kg', FALSE, TRUE),
('85', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Electrical machinery and equipment and parts thereof; sound recorders and reproducers, television image and sound recorders and reproducers', 'kg', FALSE, TRUE),
('86', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Railway or tramway locomotives, rolling-stock and parts thereof; railway or tramway track fixtures and fittings and parts thereof', 'kg', FALSE, TRUE),
('87', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Vehicles other than railway or tramway rolling-stock, and parts and accessories thereof', 'number', FALSE, TRUE),
('88', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Aircraft, spacecraft, and parts thereof', 'kg', FALSE, TRUE),
('89', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Ships, boats and floating structures', 'number', FALSE, TRUE),
('90', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Optical, photographic, cinematographic, measuring, checking, precision, medical or surgical instruments and apparatus; parts and accessories thereof', 'kg', FALSE, TRUE),
('91', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Clocks and watches and parts thereof', 'number', FALSE, FALSE),
('92', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Musical instruments; parts and accessories of such articles', 'kg', FALSE, FALSE),
('93', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Arms and ammunition; parts and accessories thereof', 'kg', FALSE, TRUE),
('94', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Furniture; bedding, mattresses, mattress supports, cushions and similar stuffed furnishings; lamps and lighting fittings, not elsewhere specified or included; illuminated signs, prefabricated buildings', 'kg', FALSE, FALSE),
('95', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Toys, games and sports requisites; parts and accessories thereof', 'kg', FALSE, FALSE),
('96', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Miscellaneous manufactured articles', 'kg', FALSE, FALSE),
('97', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Works of art, collectors'' pieces and antiques', 'kg', FALSE, FALSE),
('99', 'chapter', NULL, (SELECT id FROM hs_revisions WHERE is_current), 'Commodities not specified elsewhere in the nomenclature', 'kg', FALSE, FALSE);

-- Insert key heading-level (4-digit) codes for commodity-relevant chapters
-- Cattle: 0102
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('0102', 'heading', (SELECT id FROM hs_codes WHERE code = '01' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Live bovine animals', 'number', TRUE, FALSE);

-- Subheadings for 0102
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('0102.21', 'subheading', (SELECT id FROM hs_codes WHERE code = '0102' AND level = 'heading'), (SELECT id FROM hs_revisions WHERE is_current), 'Pure-bred breeding animals (cattle)', 'number', TRUE, FALSE),
('0102.29', 'subheading', (SELECT id FROM hs_codes WHERE code = '0102' AND level = 'heading'), (SELECT id FROM hs_revisions WHERE is_current), 'Other (cattle, live)', 'kg', TRUE, FALSE);

-- Beef: 0201, 0202
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('0201', 'heading', (SELECT id FROM hs_codes WHERE code = '02' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Fresh or chilled meat of bovine animals', 'kg', TRUE, FALSE),
('0202', 'heading', (SELECT id FROM hs_codes WHERE code = '02' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Frozen meat of bovine animals', 'kg', TRUE, FALSE),
('0210', 'heading', (SELECT id FROM hs_codes WHERE code = '02' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Meat and edible meat offal, salted, in brine, dried or smoked', 'kg', TRUE, FALSE);

-- Milk & Dairy: 0401, 0402, 0404, 0405, 0406
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('0401', 'heading', (SELECT id FROM hs_codes WHERE code = '04' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Milk and cream, not concentrated nor containing added sugar', 'litre', TRUE, FALSE),
('0402', 'heading', (SELECT id FROM hs_codes WHERE code = '04' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Milk and cream, concentrated or containing added sugar or other sweetening matter', 'kg', TRUE, FALSE),
('0404', 'heading', (SELECT id FROM hs_codes WHERE code = '04' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Whey; products consisting of natural milk constituents', 'kg', TRUE, FALSE),
('0405', 'heading', (SELECT id FROM hs_codes WHERE code = '04' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Butter and other fats and oils derived from milk', 'kg', TRUE, FALSE),
('0406', 'heading', (SELECT id FROM hs_codes WHERE code = '04' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Cheese and curd', 'kg', TRUE, FALSE);

-- Rice: 1006
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1006', 'heading', (SELECT id FROM hs_codes WHERE code = '10' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Rice', 'kg', TRUE, FALSE);

INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1006.10', 'subheading', (SELECT id FROM hs_codes WHERE code = '1006' AND level = 'heading'), (SELECT id FROM hs_revisions WHERE is_current), 'Rice in the husk (paddy or rough)', 'kg', TRUE, FALSE),
('1006.20', 'subheading', (SELECT id FROM hs_codes WHERE code = '1006' AND level = 'heading'), (SELECT id FROM hs_revisions WHERE is_current), 'Husked (brown) rice', 'kg', TRUE, FALSE),
('1006.30', 'subheading', (SELECT id FROM hs_codes WHERE code = '1006' AND level = 'heading'), (SELECT id FROM hs_revisions WHERE is_current), 'Semi-milled or wholly milled rice', 'kg', TRUE, FALSE),
('1006.40', 'subheading', (SELECT id FROM hs_codes WHERE code = '1006' AND level = 'heading'), (SELECT id FROM hs_revisions WHERE is_current), 'Broken rice', 'kg', TRUE, FALSE);

-- Maize: 1005
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1005', 'heading', (SELECT id FROM hs_codes WHERE code = '10' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Maize (corn)', 'kg', TRUE, FALSE);

-- Wheat: 1001
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1001', 'heading', (SELECT id FROM hs_codes WHERE code = '10' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Wheat and meslin', 'kg', TRUE, FALSE);

-- Soybeans: 1201
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1201', 'heading', (SELECT id FROM hs_codes WHERE code = '12' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Soya beans, whether or not broken', 'kg', TRUE, FALSE);

-- Sesame seeds: 1207
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1207', 'heading', (SELECT id FROM hs_codes WHERE code = '12' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Other oil seeds and oleaginous fruits, whether or not broken', 'kg', TRUE, FALSE);

-- Groundnut oil: 1512
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1508', 'heading', (SELECT id FROM hs_codes WHERE code = '15' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Ground-nut oil and its fractions, whether or not refined', 'kg', TRUE, FALSE),
('1511', 'heading', (SELECT id FROM hs_codes WHERE code = '15' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Palm oil and its fractions, whether or not refined', 'kg', TRUE, FALSE);

-- Cocoa: 1801, 1802, 1803, 1804, 1805, 1806
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1801', 'heading', (SELECT id FROM hs_codes WHERE code = '18' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Cocoa beans, whole or broken, raw or roasted', 'kg', TRUE, FALSE),
('1802', 'heading', (SELECT id FROM hs_codes WHERE code = '18' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Cocoa shells, husks, skins and other cocoa waste', 'kg', TRUE, FALSE),
('1803', 'heading', (SELECT id FROM hs_codes WHERE code = '18' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Cocoa paste, whether or not defatted', 'kg', TRUE, FALSE),
('1806', 'heading', (SELECT id FROM hs_codes WHERE code = '18' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Chocolate and other food preparations containing cocoa', 'kg', TRUE, FALSE);

-- Fruit juice: 2009
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('2009', 'heading', (SELECT id FROM hs_codes WHERE code = '20' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Fruit juices (including grape must) and vegetable juices', 'litre', TRUE, FALSE);

-- Animal feed: 2301, 2304, 2309
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('2301', 'heading', (SELECT id FROM hs_codes WHERE code = '23' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Flours, meals and pellets, of meat or meat offal, of fish or of crustaceans, molluscs', 'kg', TRUE, FALSE),
('2304', 'heading', (SELECT id FROM hs_codes WHERE code = '23' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Oil-cake and other solid residues from extraction of soyabean oil', 'kg', TRUE, FALSE),
('2309', 'heading', (SELECT id FROM hs_codes WHERE code = '23' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Preparations of a kind used in animal feeding', 'kg', TRUE, FALSE);

-- Hides and skins: 4101, 4104
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('4101', 'heading', (SELECT id FROM hs_codes WHERE code = '41' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Raw hides and skins of bovine or equine animals (fresh, or salted, dried, etc.)', 'kg', TRUE, FALSE),
('4104', 'heading', (SELECT id FROM hs_codes WHERE code = '41' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Tanned or dressed bovine leather, without hair on', 'kg', TRUE, FALSE);

-- Sugar: 1701
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('1701', 'heading', (SELECT id FROM hs_codes WHERE code = '17' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Cane or beet sugar and chemically pure sucrose, in solid form', 'kg', TRUE, FALSE);

-- Salt: 2501
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('2501', 'heading', (SELECT id FROM hs_codes WHERE code = '25' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Salt (including table salt and denatured salt) and pure sodium chloride', 'kg', FALSE, TRUE);

-- Fertilizer: 3102, 3103, 3105
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('3102', 'heading', (SELECT id FROM hs_codes WHERE code = '31' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Mineral or chemical fertilisers, nitrogenous', 'kg', TRUE, TRUE),
('3103', 'heading', (SELECT id FROM hs_codes WHERE code = '31' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Mineral or chemical fertilisers, phosphatic', 'kg', TRUE, TRUE),
('3105', 'heading', (SELECT id FROM hs_codes WHERE code = '31' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Mineral or chemical fertilisers containing two or three fertilising elements', 'kg', TRUE, TRUE);

-- Pharmaceutical products: 3003, 3004
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('3003', 'heading', (SELECT id FROM hs_codes WHERE code = '30' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Medicaments (excluding goods of heading 30.02, 30.05 or 30.06), not put up for retail sale', 'kg', FALSE, TRUE),
('3004', 'heading', (SELECT id FROM hs_codes WHERE code = '30' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Medicaments (excluding goods of heading 30.02, 30.05 or 30.06), put up for retail sale', 'kg', FALSE, TRUE);

-- Iron and steel: 7208-7229
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('7208', 'heading', (SELECT id FROM hs_codes WHERE code = '72' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Flat-rolled products of iron or non-alloy steel, hot-rolled', 'kg', FALSE, TRUE),
('7210', 'heading', (SELECT id FROM hs_codes WHERE code = '72' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Flat-rolled products of iron or non-alloy steel, clad, plated or coated', 'kg', FALSE, TRUE),
('7214', 'heading', (SELECT id FROM hs_codes WHERE code = '72' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Other bars and rods of iron or steel, not further worked than forged, hot-rolled', 'kg', FALSE, TRUE);

-- Vehicles: 8703
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('8703', 'heading', (SELECT id FROM hs_codes WHERE code = '87' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Motor cars and other motor vehicles principally designed for the transport of persons', 'number', FALSE, TRUE);

-- Machinery: 8401-8487 (key ones)
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('8432', 'heading', (SELECT id FROM hs_codes WHERE code = '84' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Agricultural, horticultural or forestry machinery for soil preparation or cultivation', 'kg', FALSE, TRUE),
('8433', 'heading', (SELECT id FROM hs_codes WHERE code = '84' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Harvesting or threshing machinery; straw or fodder balers; grass or hay mowers', 'kg', FALSE, TRUE),
('8434', 'heading', (SELECT id FROM hs_codes WHERE code = '84' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Dairy machinery', 'kg', FALSE, TRUE);

-- Electrical machinery: 8501-8548 (key ones)
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('8501', 'heading', (SELECT id FROM hs_codes WHERE code = '85' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Electric motors and generators (excluding generating sets)', 'kg', FALSE, TRUE),
('8504', 'heading', (SELECT id FROM hs_codes WHERE code = '85' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Electrical transformers, static converters and inductors', 'kg', FALSE, TRUE),
('8541', 'heading', (SELECT id FROM hs_codes WHERE code = '85' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Diodes, transistors and similar semi-conductor devices', 'kg', FALSE, TRUE);

-- Paper: 4801-4823 (key ones)
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('4802', 'heading', (SELECT id FROM hs_codes WHERE code = '48' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Uncoated paper and paperboard, of a kind used for writing, printing', 'kg', FALSE, TRUE),
('4804', 'heading', (SELECT id FROM hs_codes WHERE code = '48' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Uncoated kraft paper and paperboard', 'kg', FALSE, TRUE),
('4818', 'heading', (SELECT id FROM hs_codes WHERE code = '48' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Toilet or facial tissue stock, towel or napkin stock, toilet paper', 'kg', FALSE, TRUE);

-- Wood: 4401-4421 (key ones)
INSERT INTO hs_codes (code, level, parent_id, revision_id, description, primary_unit, is_agricultural, is_industrial) VALUES
('4401', 'heading', (SELECT id FROM hs_codes WHERE code = '44' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Fuel wood, in logs, in billets, in twigs, in faggots or in similar forms', 'kg', TRUE, FALSE),
('4403', 'heading', (SELECT id FROM hs_codes WHERE code = '44' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Wood in the rough, whether or not stripped of bark or sapwood, or roughly squared', 'kg', TRUE, FALSE),
('4407', 'heading', (SELECT id FROM hs_codes WHERE code = '44' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Wood sawn or chipped lengthwise, sliced or peeled, of a thickness > 6mm', 'kg', TRUE, FALSE),
('4412', 'heading', (SELECT id FROM hs_codes WHERE code = '44' AND level = 'chapter'), (SELECT id FROM hs_revisions WHERE is_current), 'Plywood, veneered panels and similar laminated wood', 'kg', TRUE, FALSE);

-- Insert commodity-to-HS code mappings
INSERT INTO commodity_hs_mappings (commodity_id, hs_code_id, mapping_confidence, notes, is_primary) VALUES
-- Cattle -> 0102
((SELECT id FROM commodities WHERE name = 'Cattle'), (SELECT id FROM hs_codes WHERE code = '0102' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Live bovine animals', TRUE),
-- Beef -> 0201, 0202
((SELECT id FROM commodities WHERE name = 'Beef'), (SELECT id FROM hs_codes WHERE code = '0201' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Fresh/chilled bovine meat', TRUE),
((SELECT id FROM commodities WHERE name = 'Beef'), (SELECT id FROM hs_codes WHERE code = '0202' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Frozen bovine meat', FALSE),
-- Milk -> 0401
((SELECT id FROM commodities WHERE name = 'Milk'), (SELECT id FROM hs_codes WHERE code = '0401' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Milk and cream not concentrated', TRUE),
-- Dairy -> 0406
((SELECT id FROM commodities WHERE name = 'Dairy'), (SELECT id FROM hs_codes WHERE code = '0406' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Cheese and curd', TRUE),
((SELECT id FROM commodities WHERE name = 'Dairy'), (SELECT id FROM hs_codes WHERE code = '0405' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'medium', 'Butter and dairy fats', FALSE),
-- Rice -> 1006
((SELECT id FROM commodities WHERE name = 'Rice'), (SELECT id FROM hs_codes WHERE code = '1006' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Rice (all forms)', TRUE),
-- Maize -> 1005
((SELECT id FROM commodities WHERE name = 'Maize'), (SELECT id FROM hs_codes WHERE code = '1005' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Maize (corn)', TRUE),
-- Wheat -> 1001
((SELECT id FROM commodities WHERE name = 'Wheat'), (SELECT id FROM hs_codes WHERE code = '1001' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Wheat and meslin', TRUE),
-- Soybeans -> 1201
((SELECT id FROM commodities WHERE name = 'Soybeans'), (SELECT id FROM hs_codes WHERE code = '1201' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Soya beans', TRUE),
-- Sesame -> 1207
((SELECT id FROM commodities WHERE name = 'Sesame'), (SELECT id FROM hs_codes WHERE code = '1207' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'medium', 'Sesame seeds (under other oil seeds)', TRUE),
-- Groundnut oil -> 1508
((SELECT id FROM commodities WHERE name = 'Groundnut Oil'), (SELECT id FROM hs_codes WHERE code = '1508' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Ground-nut oil', TRUE),
-- Cocoa -> 1801, 1803, 1806
((SELECT id FROM commodities WHERE name = 'Cocoa'), (SELECT id FROM hs_codes WHERE code = '1801' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Cocoa beans', TRUE),
-- Chocolate -> 1806
((SELECT id FROM commodities WHERE name = 'Chocolate'), (SELECT id FROM hs_codes WHERE code = '1806' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Chocolate preparations', TRUE),
-- Fruit juice -> 2009
((SELECT id FROM commodities WHERE name = 'Fruit Juice'), (SELECT id FROM hs_codes WHERE code = '2009' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Fruit and vegetable juices', TRUE),
-- Animal feed -> 2309
((SELECT id FROM commodities WHERE name = 'Animal Feed'), (SELECT id FROM hs_codes WHERE code = '2309' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Prepared animal feeding stuffs', TRUE),
-- Hides and skins -> 4101, 4104
((SELECT id FROM commodities WHERE name = 'Hides and Skins'), (SELECT id FROM hs_codes WHERE code = '4101' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Raw hides and skins', TRUE),
((SELECT id FROM commodities WHERE name = 'Hides and Skins'), (SELECT id FROM hs_codes WHERE code = '4104' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Tanned leather', FALSE),
-- Sugar -> 1701
((SELECT id FROM commodities WHERE name = 'Sugar'), (SELECT id FROM hs_codes WHERE code = '1701' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Cane or beet sugar', TRUE),
-- Salt -> 2501
((SELECT id FROM commodities WHERE name = 'Salt'), (SELECT id FROM hs_codes WHERE code = '2501' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Salt (sodium chloride)', TRUE),
-- Fertilizer -> 3105
((SELECT id FROM commodities WHERE name = 'Fertilizer'), (SELECT id FROM hs_codes WHERE code = '3105' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'medium', 'Mixed mineral/chemical fertilizers (N, P, K)', TRUE),
((SELECT id FROM commodities WHERE name = 'Fertilizer'), (SELECT id FROM hs_codes WHERE code = '3102' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'medium', 'Nitrogenous fertilizers', FALSE),
((SELECT id FROM commodities WHERE name = 'Fertilizer'), (SELECT id FROM hs_codes WHERE code = '3103' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'medium', 'Phosphatic fertilizers', FALSE),
-- Pharmaceuticals -> 3004
((SELECT id FROM commodities WHERE name = 'Pharmaceuticals'), (SELECT id FROM hs_codes WHERE code = '3004' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Medicaments put up for retail sale', TRUE),
-- Iron and steel -> 7208
((SELECT id FROM commodities WHERE name = 'Iron and Steel'), (SELECT id FROM hs_codes WHERE code = '7208' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Flat-rolled hot-rolled steel', TRUE),
-- Vehicles -> 8703
((SELECT id FROM commodities WHERE name = 'Vehicles'), (SELECT id FROM hs_codes WHERE code = '8703' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Motor cars and vehicles', TRUE),
-- Machinery -> 8432, 8433
((SELECT id FROM commodities WHERE name = 'Machinery'), (SELECT id FROM hs_codes WHERE code = '8432' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Agricultural machinery', TRUE),
-- Electrical equipment -> 8501
((SELECT id FROM commodities WHERE name = 'Electrical Equipment'), (SELECT id FROM hs_codes WHERE code = '8501' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Electric motors and generators', TRUE),
-- Paper -> 4802
((SELECT id FROM commodities WHERE name = 'Paper'), (SELECT id FROM hs_codes WHERE code = '4802' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Writing and printing paper', TRUE),
-- Wood -> 4407
((SELECT id FROM commodities WHERE name = 'Wood'), (SELECT id FROM hs_codes WHERE code = '4407' AND level = 'heading' AND revision_id = (SELECT id FROM hs_revisions WHERE is_current)), 'high', 'Sawn wood', TRUE);

-- Enable RLS
ALTER TABLE hs_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hs_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_hs_mappings ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "HS revisions are viewable by everyone"
ON hs_revisions FOR SELECT USING (true);

CREATE POLICY "HS codes are viewable by everyone"
ON hs_codes FOR SELECT USING (true);

CREATE POLICY "Commodity HS mappings are viewable by everyone"
ON commodity_hs_mappings FOR SELECT USING (true);

-- Add documentation comments
COMMENT ON TABLE hs_revisions IS 'Harmonized System nomenclature revision versions. Currently using HS 2022 (7th revision).';
COMMENT ON TABLE hs_codes IS 'HS tariff classification codes at chapter (2-digit), heading (4-digit), and subheading (6-digit) levels. Based on WCO Harmonized System.';
COMMENT ON TABLE commodity_hs_mappings IS 'Maps platform commodities to HS codes for international trade classification. A commodity may map to multiple HS codes.';
