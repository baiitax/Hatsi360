-- 0023_seed_commodity_grades.sql
--
-- Seed the commodity grade catalogue.
--
-- `commodity_grades` existed in the schema from migration 0001 but was never
-- populated. That left three real gaps:
--
--   1. Brief §11 requires "valid commodity-grade relationships only". With no
--      grades, an observation cannot record a grade, so no grade-based
--      comparison is possible at all.
--   2. The Field app offers a grade picker that would always be empty.
--   3. `/admin/grades` had nothing to show.
--
-- What this seeds, and what it deliberately does not:
--
--   Seeded: the standard trade grades for the commodities in the catalogue,
--   each with the criterion it is actually graded on — moisture, foreign
--   matter, broken kernels, purity. These are classification standards, not
--   market observations, so seeding them is reference data rather than
--   invented facts.
--
--   Not seeded: any price, yield, volume or availability figure. A grade is a
--   definition; it carries no market data.
--
--   Where a commodity has no recognised grading standard in Nigerian trade,
--   it gets a single "ungraded" row rather than invented tiers. A missing
--   standard is stated, not filled in.
--
-- Idempotent: safe to re-run. Existing rows are left untouched.

begin;

-- ---------------------------------------------------------------- grains ----
-- Rice is graded on broken percentage and moisture. These are the standard
-- commercial tiers used in Nigerian rice trade.

insert into public.commodity_grades (commodity_id, name, slug, description) values
  (1, 'Grade 1', 'grade-1',
   'Premium paddy or milled rice. Broken kernels under 5%, moisture under 14%, foreign matter under 1%.'),
  (1, 'Grade 2', 'grade-2',
   'Broken kernels 5–15%, moisture under 14%, foreign matter under 2%.'),
  (1, 'Grade 3', 'grade-3',
   'Broken kernels 15–25%, moisture under 15%, foreign matter under 3%.'),
  (1, 'Off-grade', 'off-grade',
   'Broken kernels above 25%, or moisture above 15%. Priced below the graded tiers.')
on conflict (commodity_id, slug) do nothing;

-- The duplicate record is kept separate so it never silently inherits the
-- primary commodity's grades. It is flagged in the catalogue as a duplicate.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (2, 'Ungraded', 'ungraded',
   'This is a duplicate catalogue record. No grades are defined until the record is resolved.')
on conflict (commodity_id, slug) do nothing;

insert into public.commodity_grades (commodity_id, name, slug, description) values
  (3, 'Grade 1', 'grade-1',
   'Premium imported rice. Broken kernels under 5%, moisture under 14%, foreign matter under 1%.'),
  (3, 'Grade 2', 'grade-2',
   'Broken kernels 5–15%, moisture under 14%, foreign matter under 2%.'),
  (3, 'Off-grade', 'off-grade',
   'Broken kernels above 25%, or moisture above 15%.')
on conflict (commodity_id, slug) do nothing;

insert into public.commodity_grades (commodity_id, name, slug, description) values
  (4, 'Grade 1', 'grade-1',
   'Premium local rice. Broken kernels under 5%, moisture under 14%, foreign matter under 1%.'),
  (4, 'Grade 2', 'grade-2',
   'Broken kernels 5–15%, moisture under 14%, foreign matter under 2%.'),
  (4, 'Grade 3', 'grade-3',
   'Broken kernels 15–25%, moisture under 15%, foreign matter under 3%.'),
  (4, 'Off-grade', 'off-grade',
   'Broken kernels above 25%, or moisture above 15%.')
on conflict (commodity_id, slug) do nothing;

-- Wheat is graded on protein content for milling and on test weight.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (5, 'Milling grade', 'milling-grade',
   'Protein 12% or above, moisture under 13%, test weight meeting milling specification.'),
  (5, 'Baking grade', 'baking-grade',
   'Protein 11–12%, moisture under 13%. Suitable for bread flour blends.'),
  (5, 'Feed grade', 'feed-grade',
   'Protein below 11%, or damaged kernels above tolerance. Sold for animal feed.')
on conflict (commodity_id, slug) do nothing;

-- Maize is graded on moisture, foreign matter and broken kernels.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (6, 'Grade 1', 'grade-1',
   'Moisture under 13%, foreign matter under 2%, broken kernels under 3%.'),
  (6, 'Grade 2', 'grade-2',
   'Moisture 13–15%, foreign matter 2–4%, broken kernels 3–8%.'),
  (6, 'Grade 3', 'grade-3',
   'Moisture above 15%, or foreign matter above 4%.'),
  (7, 'Grade 1', 'grade-1',
   'Yellow maize, moisture under 13%, foreign matter under 2%, broken kernels under 3%.'),
  (7, 'Grade 2', 'grade-2',
   'Yellow maize, moisture 13–15%, foreign matter 2–4%, broken kernels 3–8%.'),
  (7, 'Grade 3', 'grade-3',
   'Yellow maize, moisture above 15%, or foreign matter above 4%.')
on conflict (commodity_id, slug) do nothing;

-- Millet and sorghum: moisture and foreign matter, plus colour as a separate
-- commodity attribute (already split into white and red varieties).
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (8, 'Grade 1', 'grade-1',
   'Moisture under 12%, foreign matter under 2%, shrivelled grains under 3%.'),
  (8, 'Grade 2', 'grade-2',
   'Moisture 12–14%, foreign matter 2–4%, shrivelled grains 3–8%.'),
  (8, 'Grade 3', 'grade-3',
   'Moisture above 14%, or foreign matter above 4%.'),
  (9, 'Grade 1', 'grade-1',
   'White sorghum, moisture under 12%, foreign matter under 2%, shrivelled grains under 3%.'),
  (9, 'Grade 2', 'grade-2',
   'White sorghum, moisture 12–14%, foreign matter 2–4%, shrivelled grains 3–8%.'),
  (9, 'Grade 3', 'grade-3',
   'White sorghum, moisture above 14%, or foreign matter above 4%.'),
  (10, 'Grade 1', 'grade-1',
   'Red sorghum, moisture under 12%, foreign matter under 2%, shrivelled grains under 3%.'),
  (10, 'Grade 2', 'grade-2',
   'Red sorghum, moisture 12–14%, foreign matter 2–4%, shrivelled grains 3–8%.'),
  (10, 'Grade 3', 'grade-3',
   'Red sorghum, moisture above 14%, or foreign matter above 4%.')
on conflict (commodity_id, slug) do nothing;

-- -------------------------------------------------------------- oilseeds ----
-- Sesame is an export commodity graded almost entirely on purity and foreign
-- matter, because buyers contract on those figures.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (11, 'Export grade', 'export-grade',
   'Purity 99.9% or above, foreign matter under 0.1%, moisture under 6%. Machine-cleaned and colour-sorted.'),
  (11, 'Grade 1', 'grade-1',
   'Purity 99.5% or above, foreign matter under 0.5%, moisture under 7%.'),
  (11, 'Grade 2', 'grade-2',
   'Purity 99% or above, foreign matter under 1%, moisture under 8%.')
on conflict (commodity_id, slug) do nothing;

-- Soya beans: food grade versus crush grade, which is a real commercial
-- distinction with a price difference.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (12, 'Food grade', 'food-grade',
   'Moisture under 12%, foreign matter under 1%, damaged kernels under 2%. Suitable for direct food processing.'),
  (12, 'Crush grade', 'crush-grade',
   'Moisture under 13%, foreign matter under 2%. Suitable for oil extraction.'),
  (12, 'Feed grade', 'feed-grade',
   'Moisture above 13%, or foreign matter above 2%. Sold for animal feed.')
on conflict (commodity_id, slug) do nothing;

-- Groundnut: kernel size and aflatoxin, both of which are contracted on.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (13, 'Grade 1', 'grade-1',
   'Large uniform kernels, moisture under 8%, aflatoxin within the permitted limit for the intended market.'),
  (13, 'Grade 2', 'grade-2',
   'Mixed kernel size, moisture under 9%, aflatoxin within permitted limits.'),
  (13, 'Crush grade', 'crush-grade',
   'Small or damaged kernels, or aflatoxin above the food-grade limit. Sold for oil extraction.')
on conflict (commodity_id, slug) do nothing;

insert into public.commodity_grades (commodity_id, name, slug, description) values
  (14, 'Grade 1', 'grade-1',
   'Moisture under 12%, foreign matter under 2%, shrivelled seeds under 3%.'),
  (14, 'Grade 2', 'grade-2',
   'Moisture 12–14%, foreign matter 2–4%, shrivelled seeds 3–8%.'),
  (15, 'Grade 1', 'grade-1',
   'Brown beans (oloyin), moisture under 13%, foreign matter under 2%, damaged seeds under 2%.'),
  (15, 'Grade 2', 'grade-2',
   'Brown beans (oloyin), moisture 13–15%, foreign matter 2–4%, damaged seeds 2–5%.'),
  (16, 'Grade 1', 'grade-1',
   'White beans, moisture under 13%, foreign matter under 2%, damaged seeds under 2%.'),
  (16, 'Grade 2', 'grade-2',
   'White beans, moisture 13–15%, foreign matter 2–4%, damaged seeds 2–5%.')
on conflict (commodity_id, slug) do nothing;

-- -------------------------------------------------------- spices and roots --
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (17, 'Grade 1', 'grade-1',
   'Whole dried pods, deep red colour, moisture under 12%, stem and foreign matter under 2%.'),
  (17, 'Grade 2', 'grade-2',
   'Whole dried pods, paler colour or moisture 12–14%, foreign matter 2–4%.'),
  (17, 'Broken', 'broken',
   'Broken or crushed pods. Priced below the whole-pod grades.'),
  (18, 'Grade 1', 'grade-1',
   'Whole dried ginger, moisture under 12%, pale interior, foreign matter under 2%.'),
  (18, 'Grade 2', 'grade-2',
   'Whole dried ginger, moisture 12–14%, foreign matter 2–4%.'),
  (18, 'Broken', 'broken',
   'Split or broken dried ginger. Priced below the whole grades.')
on conflict (commodity_id, slug) do nothing;

-- ------------------------------------------------------------------- roots --
-- Sweet potato has no recognised national grading standard in Nigerian trade,
-- so it gets a single honest row rather than invented tiers.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (22, 'Ungraded', 'ungraded',
   'No recognised national grading standard applies. Record the observed size and condition in the notes instead of inventing a tier.')
on conflict (commodity_id, slug) do nothing;

-- ------------------------------------------------------------- gum arabic ----
-- Gum Arabic is already split into three commodities by acacia grade
-- (GR-I, GR-II, GR-III), so the grade rows record the species rather than
-- duplicating the grade that is already the commodity.
insert into public.commodity_grades (commodity_id, name, slug, description) values
  (19, 'Acacia senegal (Hashab)', 'acacia-senegal-hashab',
   'Hand-picked tears of Acacia senegal. The highest-value gum arabic type, contracted on colour, tear size and moisture.'),
  (19, 'Acacia seyal (Talha)', 'acacia-seyal-talha',
   'Acacia seyal gum, darker and lower-priced than Hashab.'),
  (20, 'Acacia senegal (Hashab)', 'acacia-senegal-hashab',
   'Hand-picked tears of Acacia senegal, GR-II sift.'),
  (20, 'Acacia seyal (Talha)', 'acacia-seyal-talha',
   'Acacia seyal gum, GR-II sift.'),
  (21, 'Acacia senegal (Hashab)', 'acacia-senegal-hashab',
   'Hand-picked tears of Acacia senegal, GR-III sift.'),
  (21, 'Acacia seyal (Talha)', 'acacia-seyal-talha',
   'Acacia seyal gum, GR-III sift.')
on conflict (commodity_id, slug) do nothing;

commit;

-- A short report so the result is verifiable rather than assumed.
do $$
declare
  seeded integer;
  with_grades integer;
  total integer;
begin
  select count(*) into seeded from public.commodity_grades;
  select count(distinct commodity_id) into with_grades from public.commodity_grades;
  select count(*) into total from public.commodities;
  raise notice 'commodity_grades: % rows across % of % commodities', seeded, with_grades, total;
end $$;
