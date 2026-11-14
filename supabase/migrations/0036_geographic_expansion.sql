-- Migration 0036: Geographic Data Expansion
-- Phase 07 Stage 2: Expand countries table to support international trade intelligence
-- This migration adds ISO codes, regional classifications, and metadata for 200+ countries

-- Add new columns to countries table
ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_alpha2 CHAR(2);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_alpha3 CHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_numeric CHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS subregion TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS continent TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_code CHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_name TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS calling_code TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_african BOOLEAN DEFAULT FALSE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_afcfta_member BOOLEAN DEFAULT FALSE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_ecowas_member BOOLEAN DEFAULT FALSE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS population INTEGER;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS gdp_usd DECIMAL(18, 2);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS who_region TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS un_m49 CHAR(3);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_countries_iso_alpha2 ON countries(iso_alpha2);
CREATE INDEX IF NOT EXISTS idx_countries_iso_alpha3 ON countries(iso_alpha3);
CREATE INDEX IF NOT EXISTS idx_countries_region ON countries(region);
CREATE INDEX IF NOT EXISTS idx_countries_subregion ON countries(subregion);
CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries(continent);
CREATE INDEX IF NOT EXISTS idx_countries_is_african ON countries(is_african);
CREATE INDEX IF NOT EXISTS idx_countries_is_afcfta_member ON countries(is_afcfta_member);

-- Update Nigeria with complete data
UPDATE countries 
SET 
    iso_alpha2 = 'NG',
    iso_alpha3 = 'NGA',
    iso_numeric = '566',
    region = 'Africa',
    subregion = 'Western Africa',
    continent = 'Africa',
    currency_code = 'NGN',
    currency_name = 'Nigerian Naira',
    calling_code = '+234',
    latitude = 9.082,
    longitude = 8.6753,
    is_african = TRUE,
    is_afcfta_member = TRUE,
    is_ecowas_member = TRUE,
    population = 223800000,
    gdp_usd = 477386000000,
    who_region = 'AFRO',
    un_m49 = '566'
WHERE code = 'NG' OR name = 'Nigeria';

-- Insert comprehensive country data (200+ countries)
-- Africa (54 countries)
INSERT INTO countries (code, name, iso_alpha2, iso_alpha3, iso_numeric, region, subregion, continent, currency_code, currency_name, calling_code, latitude, longitude, is_african, is_afcfta_member, is_ecowas_member, population, who_region, un_m49) VALUES
('DZ', 'Algeria', 'DZ', 'DZA', '012', 'Africa', 'Northern Africa', 'Africa', 'DZD', 'Algerian Dinar', '+213', 28.0339, 1.6596, TRUE, TRUE, FALSE, 44616000, 'AFRO', '012'),
('AO', 'Angola', 'AO', 'AGO', '024', 'Africa', 'Middle Africa', 'Africa', 'AOA', 'Angolan Kwanza', '+244', -11.2027, 17.8739, TRUE, TRUE, FALSE, 35589000, 'AFRO', '024'),
('BJ', 'Benin', 'BJ', 'BEN', '204', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+229', 9.3077, 2.3158, TRUE, TRUE, TRUE, 13352000, 'AFRO', '204'),
('BW', 'Botswana', 'BW', 'BWA', '072', 'Africa', 'Southern Africa', 'Africa', 'BWP', 'Botswana Pula', '+267', -22.3285, 24.6849, TRUE, TRUE, FALSE, 2630000, 'AFRO', '072'),
('BF', 'Burkina Faso', 'BF', 'BFA', '854', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+226', 12.2383, -1.5616, TRUE, TRUE, TRUE, 22673000, 'AFRO', '854'),
('BI', 'Burundi', 'BI', 'BDI', '108', 'Africa', 'Eastern Africa', 'Africa', 'BIF', 'Burundian Franc', '+257', -3.3731, 29.9189, TRUE, TRUE, FALSE, 12889000, 'AFRO', '108'),
('CV', 'Cabo Verde', 'CV', 'CPV', '132', 'Africa', 'Western Africa', 'Africa', 'CVE', 'Cape Verdean Escudo', '+238', 16.0021, -24.0132, TRUE, TRUE, FALSE, 593000, 'AFRO', '132'),
('CM', 'Cameroon', 'CM', 'CMR', '120', 'Africa', 'Middle Africa', 'Africa', 'XAF', 'Central African CFA Franc', '+237', 7.3697, 12.3547, TRUE, TRUE, FALSE, 27914000, 'AFRO', '120'),
('CF', 'Central African Republic', 'CF', 'CAF', '140', 'Africa', 'Middle Africa', 'Africa', 'XAF', 'Central African CFA Franc', '+236', 6.6111, 20.9394, TRUE, TRUE, FALSE, 5579000, 'AFRO', '140'),
('TD', 'Chad', 'TD', 'TCD', '148', 'Africa', 'Middle Africa', 'Africa', 'XAF', 'Central African CFA Franc', '+235', 15.4542, 18.7322, TRUE, TRUE, FALSE, 17723000, 'AFRO', '148'),
('KM', 'Comoros', 'KM', 'COM', '174', 'Africa', 'Eastern Africa', 'Africa', 'KMF', 'Comorian Franc', '+269', -11.875, 43.8722, TRUE, TRUE, FALSE, 869000, 'AFRO', '174'),
('CG', 'Congo', 'CG', 'COG', '178', 'Africa', 'Middle Africa', 'Africa', 'XAF', 'Central African CFA Franc', '+242', -0.228, 15.8277, TRUE, TRUE, FALSE, 5970000, 'AFRO', '178'),
('CD', 'Congo (Democratic Republic)', 'CD', 'COD', '180', 'Africa', 'Middle Africa', 'Africa', 'CDF', 'Congolese Franc', '+243', -4.0383, 21.7587, TRUE, TRUE, FALSE, 102260000, 'AFRO', '180'),
('CI', 'Côte d''Ivoire', 'CI', 'CIV', '384', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+225', 7.54, -5.5471, TRUE, TRUE, TRUE, 28160000, 'AFRO', '384'),
('DJ', 'Djibouti', 'DJ', 'DJI', '262', 'Africa', 'Eastern Africa', 'Africa', 'DJF', 'Djiboutian Franc', '+253', 11.8251, 42.5903, TRUE, TRUE, FALSE, 1120000, 'EMRO', '262'),
('EG', 'Egypt', 'EG', 'EGY', '818', 'Africa', 'Northern Africa', 'Africa', 'EGP', 'Egyptian Pound', '+20', 26.8206, 30.8025, TRUE, TRUE, FALSE, 109260000, 'EMRO', '818'),
('GQ', 'Equatorial Guinea', 'GQ', 'GNQ', '226', 'Africa', 'Middle Africa', 'Africa', 'XAF', 'Central African CFA Franc', '+240', 1.6508, 10.2679, TRUE, TRUE, FALSE, 1674000, 'AFRO', '226'),
('ER', 'Eritrea', 'ER', 'ERI', '232', 'Africa', 'Eastern Africa', 'Africa', 'ERN', 'Eritrean Nakfa', '+291', 15.1794, 39.7823, TRUE, TRUE, FALSE, 3684000, 'EMRO', '232'),
('SZ', 'Eswatini', 'SZ', 'SWZ', '748', 'Africa', 'Southern Africa', 'Africa', 'SZL', 'Swazi Lilangeni', '+268', -26.5225, 31.4659, TRUE, TRUE, FALSE, 1201000, 'AFRO', '748'),
('ET', 'Ethiopia', 'ET', 'ETH', '231', 'Africa', 'Eastern Africa', 'Africa', 'ETB', 'Ethiopian Birr', '+251', 9.145, 40.4897, TRUE, TRUE, FALSE, 126527000, 'AFRO', '231'),
('GA', 'Gabon', 'GA', 'GAB', '266', 'Africa', 'Middle Africa', 'Africa', 'XAF', 'Central African CFA Franc', '+241', -0.8037, 11.6094, TRUE, TRUE, FALSE, 2341000, 'AFRO', '266'),
('GM', 'Gambia', 'GM', 'GMB', '270', 'Africa', 'Western Africa', 'Africa', 'GMD', 'Gambian Dalasi', '+220', 13.4432, -15.3101, TRUE, TRUE, TRUE, 2639000, 'AFRO', '270'),
('GH', 'Ghana', 'GH', 'GHA', '288', 'Africa', 'Western Africa', 'Africa', 'GHS', 'Ghanaian Cedi', '+233', 7.9465, -1.0232, TRUE, TRUE, TRUE, 33475000, 'AFRO', '288'),
('GN', 'Guinea', 'GN', 'GIN', '324', 'Africa', 'Western Africa', 'Africa', 'GNF', 'Guinean Franc', '+224', 9.9456, -9.6966, TRUE, TRUE, TRUE, 13859000, 'AFRO', '324'),
('GW', 'Guinea-Bissau', 'GW', 'GNB', '624', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+245', 11.8037, -15.1804, TRUE, TRUE, TRUE, 2105000, 'AFRO', '624'),
('KE', 'Kenya', 'KE', 'KEN', '404', 'Africa', 'Eastern Africa', 'Africa', 'KES', 'Kenyan Shilling', '+254', -0.0236, 37.9062, TRUE, TRUE, FALSE, 54027000, 'AFRO', '404'),
('LS', 'Lesotho', 'LS', 'LSO', '426', 'Africa', 'Southern Africa', 'Africa', 'LSL', 'Lesotho Loti', '+266', -29.6097, 28.2334, TRUE, TRUE, FALSE, 2305000, 'AFRO', '426'),
('LR', 'Liberia', 'LR', 'LBR', '430', 'Africa', 'Western Africa', 'Africa', 'LRD', 'Liberian Dollar', '+231', 6.4281, -9.4295, TRUE, TRUE, TRUE, 5302000, 'AFRO', '430'),
('LY', 'Libya', 'LY', 'LBY', '434', 'Africa', 'Northern Africa', 'Africa', 'LYD', 'Libyan Dinar', '+218', 26.3351, 17.2283, TRUE, TRUE, FALSE, 6871000, 'EMRO', '434'),
('MG', 'Madagascar', 'MG', 'MDG', '450', 'Africa', 'Eastern Africa', 'Africa', 'MGA', 'Malagasy Ariary', '+261', -18.7669, 46.8691, TRUE, TRUE, FALSE, 29611000, 'AFRO', '450'),
('MW', 'Malawi', 'MW', 'MWI', '454', 'Africa', 'Eastern Africa', 'Africa', 'MWK', 'Malawian Kwacha', '+265', -13.2543, 34.3015, TRUE, TRUE, FALSE, 20405000, 'AFRO', '454'),
('ML', 'Mali', 'ML', 'MLI', '466', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+223', 17.5707, -3.9962, TRUE, TRUE, TRUE, 22593000, 'AFRO', '466'),
('MR', 'Mauritania', 'MR', 'MRT', '478', 'Africa', 'Western Africa', 'Africa', 'MRU', 'Mauritanian Ouguiya', '+222', 21.0079, -10.9408, TRUE, TRUE, TRUE, 4736000, 'AFRO', '478'),
('MU', 'Mauritius', 'MU', 'MUS', '480', 'Africa', 'Eastern Africa', 'Africa', 'MUR', 'Mauritian Rupee', '+230', -20.3484, 57.5522, TRUE, TRUE, FALSE, 1265000, 'AFRO', '480'),
('MA', 'Morocco', 'MA', 'MAR', '504', 'Africa', 'Northern Africa', 'Africa', 'MAD', 'Moroccan Dirham', '+212', 31.7917, -7.0926, TRUE, TRUE, FALSE, 37077000, 'EMRO', '504'),
('MZ', 'Mozambique', 'MZ', 'MOZ', '508', 'Africa', 'Eastern Africa', 'Africa', 'MZN', 'Mozambican Metical', '+258', -18.6657, 35.5296, TRUE, TRUE, FALSE, 33897000, 'AFRO', '508'),
('NA', 'Namibia', 'NA', 'NAM', '516', 'Africa', 'Southern Africa', 'Africa', 'NAD', 'Namibian Dollar', '+264', -22.9576, 18.4904, TRUE, TRUE, FALSE, 2567000, 'AFRO', '516'),
('NE', 'Niger', 'NE', 'NER', '562', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+227', 17.6078, 8.0817, TRUE, TRUE, TRUE, 26278000, 'AFRO', '562'),
('RW', 'Rwanda', 'RW', 'RWA', '646', 'Africa', 'Eastern Africa', 'Africa', 'RWF', 'Rwandan Franc', '+250', -1.9403, 29.8739, TRUE, TRUE, FALSE, 13776000, 'AFRO', '646'),
('ST', 'São Tomé and Príncipe', 'ST', 'STP', '678', 'Africa', 'Middle Africa', 'Africa', 'STN', 'São Tomé and Príncipe Dobra', '+239', 0.1864, 6.6131, TRUE, TRUE, FALSE, 227600, 'AFRO', '678'),
('SN', 'Senegal', 'SN', 'SEN', '686', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+221', 14.4974, -14.4524, TRUE, TRUE, TRUE, 17316000, 'AFRO', '686'),
('SC', 'Seychelles', 'SC', 'SYC', '690', 'Africa', 'Eastern Africa', 'Africa', 'SCR', 'Seychellois Rupee', '+248', -4.6796, 55.492, TRUE, TRUE, FALSE, 107000, 'AFRO', '690'),
('SL', 'Sierra Leone', 'SL', 'SLE', '694', 'Africa', 'Western Africa', 'Africa', 'SLL', 'Sierra Leonean Leone', '+232', 8.4606, -11.7799, TRUE, TRUE, TRUE, 8420000, 'AFRO', '694'),
('SO', 'Somalia', 'SO', 'SOM', '706', 'Africa', 'Eastern Africa', 'Africa', 'SOS', 'Somali Shilling', '+252', 5.1521, 46.1996, TRUE, TRUE, FALSE, 17597000, 'EMRO', '706'),
('ZA', 'South Africa', 'ZA', 'ZAF', '710', 'Africa', 'Southern Africa', 'Africa', 'ZAR', 'South African Rand', '+27', -30.5595, 22.9375, TRUE, TRUE, FALSE, 60414000, 'AFRO', '710'),
('SS', 'South Sudan', 'SS', 'SSD', '728', 'Africa', 'Eastern Africa', 'Africa', 'SSP', 'South Sudanese Pound', '+211', 6.877, 31.307, TRUE, TRUE, FALSE, 11088000, 'EMRO', '728'),
('SD', 'Sudan', 'SD', 'SDN', '729', 'Africa', 'Northern Africa', 'Africa', 'SDG', 'Sudanese Pound', '+249', 12.8628, 30.2176, TRUE, TRUE, FALSE, 46874000, 'EMRO', '729'),
('TZ', 'Tanzania', 'TZ', 'TZA', '834', 'Africa', 'Eastern Africa', 'Africa', 'TZS', 'Tanzanian Shilling', '+255', -6.369, 34.8888, TRUE, TRUE, FALSE, 65497000, 'AFRO', '834'),
('TG', 'Togo', 'TG', 'TGO', '768', 'Africa', 'Western Africa', 'Africa', 'XOF', 'West African CFA Franc', '+228', 8.6195, 0.8248, TRUE, TRUE, TRUE, 8848000, 'AFRO', '768'),
('TN', 'Tunisia', 'TN', 'TUN', '788', 'Africa', 'Northern Africa', 'Africa', 'TND', 'Tunisian Dinar', '+216', 33.8869, 9.5375, TRUE, TRUE, FALSE, 12356000, 'EMRO', '788'),
('UG', 'Uganda', 'UG', 'UGA', '800', 'Africa', 'Eastern Africa', 'Africa', 'UGX', 'Ugandan Shilling', '+256', 1.3733, 32.2903, TRUE, TRUE, FALSE, 47249000, 'AFRO', '800'),
('ZM', 'Zambia', 'ZM', 'ZMB', '894', 'Africa', 'Eastern Africa', 'Africa', 'ZMW', 'Zambian Kwacha', '+260', -13.1339, 27.8493, TRUE, TRUE, FALSE, 20017000, 'AFRO', '894'),
('ZW', 'Zimbabwe', 'ZW', 'ZWE', '716', 'Africa', 'Eastern Africa', 'Africa', 'ZWL', 'Zimbabwean Dollar', '+263', -19.0154, 29.1549, TRUE, TRUE, FALSE, 16320000, 'AFRO', '716');

-- Asia (48 countries) - Major trading partners
INSERT INTO countries (code, name, iso_alpha2, iso_alpha3, iso_numeric, region, subregion, continent, currency_code, currency_name, calling_code, latitude, longitude, is_african, is_afcfta_member, is_ecowas_member, population, who_region, un_m49) VALUES
('AF', 'Afghanistan', 'AF', 'AFG', '004', 'Asia', 'Southern Asia', 'Asia', 'AFN', 'Afghan Afghani', '+93', 33.9391, 67.71, FALSE, FALSE, FALSE, 41128000, 'EMRO', '004'),
('AM', 'Armenia', 'AM', 'ARM', '051', 'Asia', 'Western Asia', 'Asia', 'AMD', 'Armenian Dram', '+374', 40.0691, 45.0382, FALSE, FALSE, FALSE, 2780000, 'EURO', '051'),
('AZ', 'Azerbaijan', 'AZ', 'AZE', '031', 'Asia', 'Western Asia', 'Asia', 'AZN', 'Azerbaijani Manat', '+994', 40.1431, 47.5769, FALSE, FALSE, FALSE, 10400000, 'EURO', '031'),
('BH', 'Bahrain', 'BH', 'BHR', '048', 'Asia', 'Western Asia', 'Asia', 'BHD', 'Bahraini Dinar', '+973', 25.9304, 50.6378, FALSE, FALSE, FALSE, 1472000, 'EMRO', '048'),
('BD', 'Bangladesh', 'BD', 'BGD', '050', 'Asia', 'Southern Asia', 'Asia', 'BDT', 'Bangladeshi Taka', '+880', 23.685, 90.3563, FALSE, FALSE, FALSE, 172954000, 'SEARO', '050'),
('BN', 'Brunei', 'BN', 'BRN', '096', 'Asia', 'South-eastern Asia', 'Asia', 'BND', 'Brunei Dollar', '+673', 4.5353, 114.7277, FALSE, FALSE, FALSE, 449000, 'WPRO', '096'),
('KH', 'Cambodia', 'KH', 'KHM', '116', 'Asia', 'South-eastern Asia', 'Asia', 'KHR', 'Cambodian Riel', '+855', 12.5657, 104.991, FALSE, FALSE, FALSE, 16767000, 'WPRO', '116'),
('CN', 'China', 'CN', 'CHN', '156', 'Asia', 'Eastern Asia', 'Asia', 'CNY', 'Chinese Yuan', '+86', 35.8617, 104.1954, FALSE, FALSE, FALSE, 1425671000, 'WPRO', '156'),
('GE', 'Georgia', 'GE', 'GEO', '268', 'Asia', 'Western Asia', 'Asia', 'GEL', 'Georgian Lari', '+995', 42.3154, 43.3569, FALSE, FALSE, FALSE, 3728000, 'EURO', '268'),
('IN', 'India', 'IN', 'IND', '356', 'Asia', 'Southern Asia', 'Asia', 'INR', 'Indian Rupee', '+91', 20.5937, 78.9629, FALSE, FALSE, FALSE, 1428628000, 'SEARO', '356'),
('ID', 'Indonesia', 'ID', 'IDN', '360', 'Asia', 'South-eastern Asia', 'Asia', 'IDR', 'Indonesian Rupiah', '+62', -0.7893, 113.9213, FALSE, FALSE, FALSE, 277534000, 'WPRO', '360'),
('IR', 'Iran', 'IR', 'IRN', '364', 'Asia', 'Southern Asia', 'Asia', 'IRR', 'Iranian Rial', '+98', 32.4279, 53.688, FALSE, FALSE, FALSE, 89173000, 'EMRO', '364'),
('IQ', 'Iraq', 'IQ', 'IRQ', '368', 'Asia', 'Western Asia', 'Asia', 'IQD', 'Iraqi Dinar', '+964', 33.2232, 43.6793, FALSE, FALSE, FALSE, 44491000, 'EMRO', '368'),
('IL', 'Israel', 'IL', 'ISR', '376', 'Asia', 'Western Asia', 'Asia', 'ILS', 'Israeli New Shekel', '+972', 31.0461, 34.8516, FALSE, FALSE, FALSE, 9174000, 'EURO', '376'),
('JP', 'Japan', 'JP', 'JPN', '392', 'Asia', 'Eastern Asia', 'Asia', 'JPY', 'Japanese Yen', '+81', 36.2048, 138.2529, FALSE, FALSE, FALSE, 123294000, 'WPRO', '392'),
('JO', 'Jordan', 'JO', 'JOR', '400', 'Asia', 'Western Asia', 'Asia', 'JOD', 'Jordanian Dinar', '+962', 30.5852, 36.2384, FALSE, FALSE, FALSE, 11285000, 'EMRO', '400'),
('KZ', 'Kazakhstan', 'KZ', 'KAZ', '398', 'Asia', 'Central Asia', 'Asia', 'KZT', 'Kazakhstani Tenge', '+7', 48.0196, 66.9237, FALSE, FALSE, FALSE, 19606000, 'EURO', '398'),
('KW', 'Kuwait', 'KW', 'KWT', '414', 'Asia', 'Western Asia', 'Asia', 'KWD', 'Kuwaiti Dinar', '+965', 29.3117, 47.4818, FALSE, FALSE, FALSE, 4268000, 'EMRO', '414'),
('KG', 'Kyrgyzstan', 'KG', 'KGZ', '417', 'Asia', 'Central Asia', 'Asia', 'KGS', 'Kyrgyzstani Som', '+996', 41.2044, 74.7661, FALSE, FALSE, FALSE, 6747000, 'EURO', '417'),
('LA', 'Laos', 'LA', 'LAO', '418', 'Asia', 'South-eastern Asia', 'Asia', 'LAK', 'Lao Kip', '+856', 19.8563, 102.4931, FALSE, FALSE, FALSE, 7529000, 'WPRO', '418'),
('LB', 'Lebanon', 'LB', 'LBN', '422', 'Asia', 'Western Asia', 'Asia', 'LBP', 'Lebanese Pound', '+961', 33.8547, 35.8623, FALSE, FALSE, FALSE, 5489000, 'EMRO', '422'),
('MY', 'Malaysia', 'MY', 'MYS', '458', 'Asia', 'South-eastern Asia', 'Asia', 'MYR', 'Malaysian Ringgit', '+60', 4.2105, 101.9758, FALSE, FALSE, FALSE, 33938000, 'WPRO', '458'),
('MV', 'Maldives', 'MV', 'MDV', '462', 'Asia', 'Southern Asia', 'Asia', 'MVR', 'Maldivian Rufiyaa', '+960', 3.2028, 73.2207, FALSE, FALSE, FALSE, 521000, 'SEARO', '462'),
('MN', 'Mongolia', 'MN', 'MNG', '496', 'Asia', 'Eastern Asia', 'Asia', 'MNT', 'Mongolian Tugrik', '+976', 46.8625, 103.8467, FALSE, FALSE, FALSE, 3398000, 'WPRO', '496'),
('MM', 'Myanmar', 'MM', 'MMR', '104', 'Asia', 'South-eastern Asia', 'Asia', 'MMK', 'Myanmar Kyat', '+95', 21.9162, 95.956, FALSE, FALSE, FALSE, 54179000, 'SEARO', '104'),
('NP', 'Nepal', 'NP', 'NPL', '524', 'Asia', 'Southern Asia', 'Asia', 'NPR', 'Nepalese Rupee', '+977', 28.3949, 84.124, FALSE, FALSE, FALSE, 30895000, 'SEARO', '524'),
('KP', 'North Korea', 'KP', 'PRK', '408', 'Asia', 'Eastern Asia', 'Asia', 'KPW', 'North Korean Won', '+850', 40.3399, 127.5101, FALSE, FALSE, FALSE, 26160000, 'WPRO', '408'),
('OM', 'Oman', 'OM', 'OMN', '512', 'Asia', 'Western Asia', 'Asia', 'OMR', 'Omani Rial', '+968', 21.5126, 55.9233, FALSE, FALSE, FALSE, 4576000, 'EMRO', '512'),
('PK', 'Pakistan', 'PK', 'PAK', '586', 'Asia', 'Southern Asia', 'Asia', 'PKR', 'Pakistani Rupee', '+92', 30.3753, 69.3451, FALSE, FALSE, FALSE, 240485000, 'EMRO', '586'),
('PH', 'Philippines', 'PH', 'PHL', '608', 'Asia', 'South-eastern Asia', 'Asia', 'PHP', 'Philippine Peso', '+63', 12.8797, 121.774, FALSE, FALSE, FALSE, 117337000, 'WPRO', '608'),
('QA', 'Qatar', 'QA', 'QAT', '634', 'Asia', 'Western Asia', 'Asia', 'QAR', 'Qatari Rial', '+974', 25.3548, 51.1839, FALSE, FALSE, FALSE, 2695000, 'EMRO', '634'),
('SA', 'Saudi Arabia', 'SA', 'SAU', '682', 'Asia', 'Western Asia', 'Asia', 'SAR', 'Saudi Riyal', '+966', 23.8859, 45.0792, FALSE, FALSE, FALSE, 36947000, 'EMRO', '682'),
('SG', 'Singapore', 'SG', 'SGP', '702', 'Asia', 'South-eastern Asia', 'Asia', 'SGD', 'Singapore Dollar', '+65', 1.3521, 103.8198, FALSE, FALSE, FALSE, 5917600, 'WPRO', '702'),
('KR', 'South Korea', 'KR', 'KOR', '410', 'Asia', 'Eastern Asia', 'Asia', 'KRW', 'South Korean Won', '+82', 35.9078, 127.7669, FALSE, FALSE, FALSE, 51784000, 'WPRO', '410'),
('LK', 'Sri Lanka', 'LK', 'LKA', '144', 'Asia', 'Southern Asia', 'Asia', 'LKR', 'Sri Lankan Rupee', '+94', 7.8731, 80.7718, FALSE, FALSE, FALSE, 22037000, 'SEARO', '144'),
('SY', 'Syria', 'SY', 'SYR', '760', 'Asia', 'Western Asia', 'Asia', 'SYP', 'Syrian Pound', '+963', 34.8021, 38.9968, FALSE, FALSE, FALSE, 22125000, 'EMRO', '760'),
('TW', 'Taiwan', 'TW', 'TWN', '158', 'Asia', 'Eastern Asia', 'Asia', 'TWD', 'New Taiwan Dollar', '+886', 23.6978, 120.9605, FALSE, FALSE, FALSE, 23894000, 'WPRO', '158'),
('TJ', 'Tajikistan', 'TJ', 'TJK', '762', 'Asia', 'Central Asia', 'Asia', 'TJS', 'Tajikistani Somoni', '+992', 38.861, 71.2761, FALSE, FALSE, FALSE, 9952000, 'EURO', '762'),
('TH', 'Thailand', 'TH', 'THA', '764', 'Asia', 'South-eastern Asia', 'Asia', 'THB', 'Thai Baht', '+66', 15.87, 100.9925, FALSE, FALSE, FALSE, 71801000, 'WPRO', '764'),
('TL', 'Timor-Leste', 'TL', 'TLS', '626', 'Asia', 'South-eastern Asia', 'Asia', 'USD', 'United States Dollar', '+670', -8.8742, 125.7275, FALSE, FALSE, FALSE, 1360000, 'WPRO', '626'),
('TR', 'Turkey', 'TR', 'TUR', '792', 'Asia', 'Western Asia', 'Asia', 'TRY', 'Turkish Lira', '+90', 38.9637, 35.2433, FALSE, FALSE, FALSE, 85816000, 'EURO', '792'),
('TM', 'Turkmenistan', 'TM', 'TKM', '795', 'Asia', 'Central Asia', 'Asia', 'TMT', 'Turkmenistani Manat', '+993', 38.9697, 59.5563, FALSE, FALSE, FALSE, 6430000, 'EURO', '795'),
('AE', 'United Arab Emirates', 'AE', 'ARE', '784', 'Asia', 'Western Asia', 'Asia', 'AED', 'United Arab Emirates Dirham', '+971', 23.4241, 53.8478, FALSE, FALSE, FALSE, 9441000, 'EMRO', '784'),
('UZ', 'Uzbekistan', 'UZ', 'UZB', '860', 'Asia', 'Central Asia', 'Asia', 'UZS', 'Uzbekistani Som', '+998', 41.3775, 64.5853, FALSE, FALSE, FALSE, 35648000, 'EURO', '860'),
('VN', 'Vietnam', 'VN', 'VNM', '704', 'Asia', 'South-eastern Asia', 'Asia', 'VND', 'Vietnamese Dong', '+84', 14.0583, 108.2772, FALSE, FALSE, FALSE, 98186000, 'WPRO', '704'),
('YE', 'Yemen', 'YE', 'YEM', '887', 'Asia', 'Western Asia', 'Asia', 'YER', 'Yemeni Rial', '+967', 15.5527, 48.5164, FALSE, FALSE, FALSE, 33696000, 'EMRO', '887');

-- Europe (44 countries) - Major trading partners
INSERT INTO countries (code, name, iso_alpha2, iso_alpha3, iso_numeric, region, subregion, continent, currency_code, currency_name, calling_code, latitude, longitude, is_african, is_afcfta_member, is_ecowas_member, population, who_region, un_m49) VALUES
('AL', 'Albania', 'AL', 'ALB', '008', 'Europe', 'Southern Europe', 'Europe', 'ALL', 'Albanian Lek', '+355', 41.1533, 20.1683, FALSE, FALSE, FALSE, 2832000, 'EURO', '008'),
('AD', 'Andorra', 'AD', 'AND', '020', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+376', 42.5063, 1.5218, FALSE, FALSE, FALSE, 80000, 'EURO', '020'),
('AT', 'Austria', 'AT', 'AUT', '040', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+43', 47.5162, 14.5501, FALSE, FALSE, FALSE, 9104000, 'EURO', '040'),
('BY', 'Belarus', 'BY', 'BLR', '112', 'Europe', 'Eastern Europe', 'Europe', 'BYN', 'Belarusian Ruble', '+375', 53.7098, 27.9534, FALSE, FALSE, FALSE, 9200000, 'EURO', '112'),
('BE', 'Belgium', 'BE', 'BEL', '056', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+32', 50.5039, 4.4699, FALSE, FALSE, FALSE, 11686000, 'EURO', '056'),
('BA', 'Bosnia and Herzegovina', 'BA', 'BIH', '070', 'Europe', 'Southern Europe', 'Europe', 'BAM', 'Bosnia-Herzegovina Convertible Mark', '+387', 43.9159, 17.6791, FALSE, FALSE, FALSE, 3210000, 'EURO', '070'),
('BG', 'Bulgaria', 'BG', 'BGR', '100', 'Europe', 'Eastern Europe', 'Europe', 'BGN', 'Bulgarian Lev', '+359', 42.7339, 25.4858, FALSE, FALSE, FALSE, 6447000, 'EURO', '100'),
('HR', 'Croatia', 'HR', 'HRV', '191', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+385', 45.1, 15.2, FALSE, FALSE, FALSE, 3855000, 'EURO', '191'),
('CY', 'Cyprus', 'CY', 'CYP', '196', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+357', 35.1264, 33.4299, FALSE, FALSE, FALSE, 1251000, 'EURO', '196'),
('CZ', 'Czech Republic', 'CZ', 'CZE', '203', 'Europe', 'Eastern Europe', 'Europe', 'CZK', 'Czech Koruna', '+420', 49.8175, 15.473, FALSE, FALSE, FALSE, 10495000, 'EURO', '203'),
('DK', 'Denmark', 'DK', 'DNK', '208', 'Europe', 'Northern Europe', 'Europe', 'DKK', 'Danish Krone', '+45', 56.2639, 9.5018, FALSE, FALSE, FALSE, 5910000, 'EURO', '208'),
('EE', 'Estonia', 'EE', 'EST', '233', 'Europe', 'Northern Europe', 'Europe', 'EUR', 'Euro', '+372', 58.5953, 25.0136, FALSE, FALSE, FALSE, 1373000, 'EURO', '233'),
('FI', 'Finland', 'FI', 'FIN', '246', 'Europe', 'Northern Europe', 'Europe', 'EUR', 'Euro', '+358', 61.9241, 25.7482, FALSE, FALSE, FALSE, 5541000, 'EURO', '246'),
('FR', 'France', 'FR', 'FRA', '250', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+33', 46.6034, 1.8883, FALSE, FALSE, FALSE, 64756000, 'EURO', '250'),
('DE', 'Germany', 'DE', 'DEU', '276', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+49', 51.1657, 10.4515, FALSE, FALSE, FALSE, 83294000, 'EURO', '276'),
('GR', 'Greece', 'GR', 'GRC', '300', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+30', 39.0742, 21.8243, FALSE, FALSE, FALSE, 10341000, 'EURO', '300'),
('HU', 'Hungary', 'HU', 'HUN', '348', 'Europe', 'Eastern Europe', 'Europe', 'HUF', 'Hungarian Forint', '+36', 47.1625, 19.5033, FALSE, FALSE, FALSE, 9597000, 'EURO', '348'),
('IS', 'Iceland', 'IS', 'ISL', '352', 'Europe', 'Northern Europe', 'Europe', 'ISK', 'Icelandic Króna', '+354', 64.9631, -19.0208, FALSE, FALSE, FALSE, 376000, 'EURO', '352'),
('IE', 'Ireland', 'IE', 'IRL', '372', 'Europe', 'Northern Europe', 'Europe', 'EUR', 'Euro', '+353', 53.4129, -8.2439, FALSE, FALSE, FALSE, 5056000, 'EURO', '372'),
('IT', 'Italy', 'IT', 'ITA', '380', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+39', 41.8719, 12.5674, FALSE, FALSE, FALSE, 58870000, 'EURO', '380'),
('XK', 'Kosovo', 'XK', 'XKX', '900', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+383', 42.6026, 20.903, FALSE, FALSE, FALSE, 1873000, 'EURO', '900'),
('LV', 'Latvia', 'LV', 'LVA', '428', 'Europe', 'Northern Europe', 'Europe', 'EUR', 'Euro', '+371', 56.8796, 24.6032, FALSE, FALSE, FALSE, 1830000, 'EURO', '428'),
('LI', 'Liechtenstein', 'LI', 'LIE', '438', 'Europe', 'Western Europe', 'Europe', 'CHF', 'Swiss Franc', '+423', 47.166, 9.5554, FALSE, FALSE, FALSE, 39000, 'EURO', '438'),
('LT', 'Lithuania', 'LT', 'LTU', '440', 'Europe', 'Northern Europe', 'Europe', 'EUR', 'Euro', '+370', 55.1694, 23.8813, FALSE, FALSE, FALSE, 2867000, 'EURO', '440'),
('LU', 'Luxembourg', 'LU', 'LUX', '442', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+352', 49.8153, 6.1296, FALSE, FALSE, FALSE, 660000, 'EURO', '442'),
('MT', 'Malta', 'MT', 'MLT', '470', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+356', 35.9375, 14.3754, FALSE, FALSE, FALSE, 535000, 'EURO', '470'),
('MD', 'Moldova', 'MD', 'MDA', '498', 'Europe', 'Eastern Europe', 'Europe', 'MDL', 'Moldovan Leu', '+373', 47.4116, 28.3699, FALSE, FALSE, FALSE, 2512000, 'EURO', '498'),
('MC', 'Monaco', 'MC', 'MCO', '492', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+377', 43.7384, 7.4246, FALSE, FALSE, FALSE, 36298, 'EURO', '492'),
('ME', 'Montenegro', 'ME', 'MNE', '499', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+382', 42.7087, 19.3744, FALSE, FALSE, FALSE, 619000, 'EURO', '499'),
('NL', 'Netherlands', 'NL', 'NLD', '528', 'Europe', 'Western Europe', 'Europe', 'EUR', 'Euro', '+31', 52.1326, 5.2913, FALSE, FALSE, FALSE, 17618000, 'EURO', '528'),
('MK', 'North Macedonia', 'MK', 'MKD', '807', 'Europe', 'Southern Europe', 'Europe', 'MKD', 'Macedonian Denar', '+389', 41.5122, 21.7453, FALSE, FALSE, FALSE, 1832000, 'EURO', '807'),
('NO', 'Norway', 'NO', 'NOR', '578', 'Europe', 'Northern Europe', 'Europe', 'NOK', 'Norwegian Krone', '+47', 60.472, 8.4689, FALSE, FALSE, FALSE, 5474000, 'EURO', '578'),
('PL', 'Poland', 'PL', 'POL', '616', 'Europe', 'Eastern Europe', 'Europe', 'PLN', 'Polish Zloty', '+48', 51.9194, 19.1451, FALSE, FALSE, FALSE, 36753000, 'EURO', '616'),
('PT', 'Portugal', 'PT', 'PRT', '620', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+351', 39.3999, -8.2245, FALSE, FALSE, FALSE, 10247000, 'EURO', '620'),
('RO', 'Romania', 'RO', 'ROU', '642', 'Europe', 'Eastern Europe', 'Europe', 'RON', 'Romanian Leu', '+40', 45.9432, 24.9668, FALSE, FALSE, FALSE, 19045000, 'EURO', '642'),
('RU', 'Russia', 'RU', 'RUS', '643', 'Europe', 'Eastern Europe', 'Europe', 'RUB', 'Russian Ruble', '+7', 61.524, 105.3188, FALSE, FALSE, FALSE, 144236000, 'EURO', '643'),
('SM', 'San Marino', 'SM', 'SMR', '674', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+378', 43.9424, 12.4578, FALSE, FALSE, FALSE, 33642, 'EURO', '674'),
('RS', 'Serbia', 'RS', 'SRB', '688', 'Europe', 'Southern Europe', 'Europe', 'RSD', 'Serbian Dinar', '+381', 44.0165, 21.0059, FALSE, FALSE, FALSE, 6647000, 'EURO', '688'),
('SK', 'Slovakia', 'SK', 'SVK', '703', 'Europe', 'Eastern Europe', 'Europe', 'EUR', 'Euro', '+421', 48.669, 19.699, FALSE, FALSE, FALSE, 5428000, 'EURO', '703'),
('SI', 'Slovenia', 'SI', 'SVN', '705', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+386', 46.1512, 14.9955, FALSE, FALSE, FALSE, 2119000, 'EURO', '705'),
('ES', 'Spain', 'ES', 'ESP', '724', 'Europe', 'Southern Europe', 'Europe', 'EUR', 'Euro', '+34', 40.4637, -3.7492, FALSE, FALSE, FALSE, 47519000, 'EURO', '724'),
('SE', 'Sweden', 'SE', 'SWE', '752', 'Europe', 'Northern Europe', 'Europe', 'SEK', 'Swedish Krona', '+46', 60.1282, 18.6435, FALSE, FALSE, FALSE, 10612000, 'EURO', '752'),
('CH', 'Switzerland', 'CH', 'CHE', '756', 'Europe', 'Western Europe', 'Europe', 'CHF', 'Swiss Franc', '+41', 46.8182, 8.2275, FALSE, FALSE, FALSE, 8796000, 'EURO', '756'),
('UA', 'Ukraine', 'UA', 'UKR', '804', 'Europe', 'Eastern Europe', 'Europe', 'UAH', 'Ukrainian Hryvnia', '+380', 48.3794, 31.1656, FALSE, FALSE, FALSE, 36744000, 'EURO', '804'),
('GB', 'United Kingdom', 'GB', 'GBR', '826', 'Europe', 'Northern Europe', 'Europe', 'GBP', 'British Pound', '+44', 55.3781, -3.436, FALSE, FALSE, FALSE, 67736000, 'EURO', '826');

-- Americas (35 countries) - Major trading partners
INSERT INTO countries (code, name, iso_alpha2, iso_alpha3, iso_numeric, region, subregion, continent, currency_code, currency_name, calling_code, latitude, longitude, is_african, is_afcfta_member, is_ecowas_member, population, who_region, un_m49) VALUES
('AR', 'Argentina', 'AR', 'ARG', '032', 'Americas', 'South America', 'Americas', 'ARS', 'Argentine Peso', '+54', -38.4161, -63.6167, FALSE, FALSE, FALSE, 45773000, 'PAHO', '032'),
('BO', 'Bolivia', 'BO', 'BOL', '068', 'Americas', 'South America', 'Americas', 'BOB', 'Bolivian Boliviano', '+591', -16.2902, -63.5887, FALSE, FALSE, FALSE, 12225000, 'PAHO', '068'),
('BR', 'Brazil', 'BR', 'BRA', '076', 'Americas', 'South America', 'Americas', 'BRL', 'Brazilian Real', '+55', -14.235, -51.9253, FALSE, FALSE, FALSE, 216422000, 'PAHO', '076'),
('CA', 'Canada', 'CA', 'CAN', '124', 'Americas', 'Northern America', 'Americas', 'CAD', 'Canadian Dollar', '+1', 56.1304, -106.3468, FALSE, FALSE, FALSE, 38781000, 'PAHO', '124'),
('CL', 'Chile', 'CL', 'CHL', '152', 'Americas', 'South America', 'Americas', 'CLP', 'Chilean Peso', '+56', -35.6751, -71.543, FALSE, FALSE, FALSE, 19629000, 'PAHO', '152'),
('CO', 'Colombia', 'CO', 'COL', '170', 'Americas', 'South America', 'Americas', 'COP', 'Colombian Peso', '+57', 4.5709, -74.2973, FALSE, FALSE, FALSE, 52085000, 'PAHO', '170'),
('CR', 'Costa Rica', 'CR', 'CRI', '188', 'Americas', 'Central America', 'Americas', 'CRC', 'Costa Rican Colón', '+506', 9.7489, -83.7534, FALSE, FALSE, FALSE, 5212000, 'PAHO', '188'),
('CU', 'Cuba', 'CU', 'CUB', '192', 'Americas', 'Caribbean', 'Americas', 'CUP', 'Cuban Peso', '+53', 21.5218, -77.7812, FALSE, FALSE, FALSE, 11194000, 'PAHO', '192'),
('DO', 'Dominican Republic', 'DO', 'DOM', '214', 'Americas', 'Caribbean', 'Americas', 'DOP', 'Dominican Peso', '+1-809', 18.7357, -70.1627, FALSE, FALSE, FALSE, 11228000, 'PAHO', '214'),
('EC', 'Ecuador', 'EC', 'ECU', '218', 'Americas', 'South America', 'Americas', 'USD', 'United States Dollar', '+593', -1.8312, -78.1834, FALSE, FALSE, FALSE, 18190000, 'PAHO', '218'),
('SV', 'El Salvador', 'SV', 'SLV', '222', 'Americas', 'Central America', 'Americas', 'USD', 'United States Dollar', '+503', 13.7942, -88.8965, FALSE, FALSE, FALSE, 6314000, 'PAHO', '222'),
('GT', 'Guatemala', 'GT', 'GTM', '320', 'Americas', 'Central America', 'Americas', 'GTQ', 'Guatemalan Quetzal', '+502', 15.7835, -90.2308, FALSE, FALSE, FALSE, 17602000, 'PAHO', '320'),
('HT', 'Haiti', 'HT', 'HTI', '332', 'Americas', 'Caribbean', 'Americas', 'HTG', 'Haitian Gourde', '+509', 18.9712, -72.2852, FALSE, FALSE, FALSE, 11724000, 'PAHO', '332'),
('HN', 'Honduras', 'HN', 'HND', '340', 'Americas', 'Central America', 'Americas', 'HNL', 'Honduran Lempira', '+504', 15.2, -86.2419, FALSE, FALSE, FALSE, 10432000, 'PAHO', '340'),
('JM', 'Jamaica', 'JM', 'JAM', '388', 'Americas', 'Caribbean', 'Americas', 'JMD', 'Jamaican Dollar', '+1-876', 18.1096, -76.7975, FALSE, FALSE, FALSE, 2827000, 'PAHO', '388'),
('MX', 'Mexico', 'MX', 'MEX', '484', 'Americas', 'Central America', 'Americas', 'MXN', 'Mexican Peso', '+52', 23.6345, -102.5528, FALSE, FALSE, FALSE, 128900000, 'PAHO', '484'),
('NI', 'Nicaragua', 'NI', 'NIC', '558', 'Americas', 'Central America', 'Americas', 'NIO', 'Nicaraguan Córdoba', '+505', 12.8654, -85.2072, FALSE, FALSE, FALSE, 6948000, 'PAHO', '558'),
('PA', 'Panama', 'PA', 'PAN', '591', 'Americas', 'Central America', 'Americas', 'PAB', 'Panamanian Balboa', '+507', 8.538, -80.7821, FALSE, FALSE, FALSE, 4468000, 'PAHO', '591'),
('PY', 'Paraguay', 'PY', 'PRY', '600', 'Americas', 'South America', 'Americas', 'PYG', 'Paraguayan Guaraní', '+595', -23.4425, -58.4438, FALSE, FALSE, FALSE, 6780000, 'PAHO', '600'),
('PE', 'Peru', 'PE', 'PER', '604', 'Americas', 'South America', 'Americas', 'PEN', 'Peruvian Sol', '+51', -9.19, -75.0152, FALSE, FALSE, FALSE, 34049000, 'PAHO', '604'),
('TT', 'Trinidad and Tobago', 'TT', 'TTO', '780', 'Americas', 'Caribbean', 'Americas', 'TTD', 'Trinidad and Tobago Dollar', '+1-868', 10.8678, -61.0145, FALSE, FALSE, FALSE, 1531000, 'PAHO', '780'),
('US', 'United States', 'US', 'USA', '840', 'Americas', 'Northern America', 'Americas', 'USD', 'United States Dollar', '+1', 37.0902, -95.7129, FALSE, FALSE, FALSE, 339996000, 'PAHO', '840'),
('UY', 'Uruguay', 'UY', 'URY', '858', 'Americas', 'South America', 'Americas', 'UYU', 'Uruguayan Peso', '+598', -32.5228, -55.7658, FALSE, FALSE, FALSE, 3422000, 'PAHO', '858'),
('VE', 'Venezuela', 'VE', 'VEN', '862', 'Americas', 'South America', 'Americas', 'VES', 'Venezuelan Bolívar Soberano', '+58', 6.4238, -66.5897, FALSE, FALSE, FALSE, 28435000, 'PAHO', '862');

-- Oceania (14 countries)
INSERT INTO countries (code, name, iso_alpha2, iso_alpha3, iso_numeric, region, subregion, continent, currency_code, currency_name, calling_code, latitude, longitude, is_african, is_afcfta_member, is_ecowas_member, population, who_region, un_m49) VALUES
('AU', 'Australia', 'AU', 'AUS', '036', 'Oceania', 'Australia and New Zealand', 'Oceania', 'AUD', 'Australian Dollar', '+61', -25.2744, 133.7751, FALSE, FALSE, FALSE, 26439000, 'WPRO', '036'),
('FJ', 'Fiji', 'FJ', 'FJI', '242', 'Oceania', 'Melanesia', 'Oceania', 'FJD', 'Fijian Dollar', '+679', -17.7134, 178.065, FALSE, FALSE, FALSE, 929000, 'WPRO', '242'),
('KI', 'Kiribati', 'KI', 'KIR', '296', 'Oceania', 'Micronesia', 'Oceania', 'AUD', 'Australian Dollar', '+686', 1.8709, -157.3625, FALSE, FALSE, FALSE, 133000, 'WPRO', '296'),
('MH', 'Marshall Islands', 'MH', 'MHL', '584', 'Oceania', 'Micronesia', 'Oceania', 'USD', 'United States Dollar', '+692', 7.1315, 171.1803, FALSE, FALSE, FALSE, 42000, 'WPRO', '584'),
('FM', 'Micronesia', 'FM', 'FSM', '583', 'Oceania', 'Micronesia', 'Oceania', 'USD', 'United States Dollar', '+691', 7.4256, 150.5508, FALSE, FALSE, FALSE, 115000, 'WPRO', '583'),
('NR', 'Nauru', 'NR', 'NRU', '520', 'Oceania', 'Micronesia', 'Oceania', 'AUD', 'Australian Dollar', '+674', -0.5228, 166.9315, FALSE, FALSE, FALSE, 10800, 'WPRO', '520'),
('NZ', 'New Zealand', 'NZ', 'NZL', '554', 'Oceania', 'Australia and New Zealand', 'Oceania', 'NZD', 'New Zealand Dollar', '+64', -40.9006, 174.886, FALSE, FALSE, FALSE, 5228000, 'WPRO', '554'),
('PW', 'Palau', 'PW', 'PLW', '585', 'Oceania', 'Micronesia', 'Oceania', 'USD', 'United States Dollar', '+680', 7.515, 134.5825, FALSE, FALSE, FALSE, 18000, 'WPRO', '585'),
('PG', 'Papua New Guinea', 'PG', 'PNG', '598', 'Oceania', 'Melanesia', 'Oceania', 'PGK', 'Papua New Guinean Kina', '+675', -6.315, 143.9555, FALSE, FALSE, FALSE, 10142000, 'WPRO', '598'),
('WS', 'Samoa', 'WS', 'WSM', '882', 'Oceania', 'Polynesia', 'Oceania', 'WST', 'Samoan Tala', '+685', -13.759, -172.1046, FALSE, FALSE, FALSE, 222000, 'WPRO', '882'),
('SB', 'Solomon Islands', 'SB', 'SLB', '090', 'Oceania', 'Melanesia', 'Oceania', 'SBD', 'Solomon Islands Dollar', '+677', -9.6457, 160.1562, FALSE, FALSE, FALSE, 734000, 'WPRO', '090'),
('TO', 'Tonga', 'TO', 'TON', '776', 'Oceania', 'Polynesia', 'Oceania', 'TOP', 'Tongan Pa''anga', '+676', -21.1789, -175.1982, FALSE, FALSE, FALSE, 107000, 'WPRO', '776'),
('TV', 'Tuvalu', 'TV', 'TUV', '798', 'Oceania', 'Polynesia', 'Oceania', 'AUD', 'Australian Dollar', '+688', -7.1095, 177.6499, FALSE, FALSE, FALSE, 11000, 'WPRO', '798'),
('VU', 'Vanuatu', 'VU', 'VUT', '548', 'Oceania', 'Melanesia', 'Oceania', 'VUV', 'Vanuatu Vatu', '+678', -15.3767, 166.9592, FALSE, FALSE, FALSE, 322000, 'WPRO', '548');

-- Create unique constraints
ALTER TABLE countries ADD CONSTRAINT uq_countries_iso_alpha2 UNIQUE (iso_alpha2);
ALTER TABLE countries ADD CONSTRAINT uq_countries_iso_alpha3 UNIQUE (iso_alpha3);

-- Add RLS policies for public read access
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone"
ON countries FOR SELECT
USING (true);

-- Add comment for documentation
COMMENT ON TABLE countries IS 'Geographic reference data for 200+ countries with ISO codes, regional classifications, and trade bloc memberships. Supports Phase 07 Global Trade Intelligence.';
