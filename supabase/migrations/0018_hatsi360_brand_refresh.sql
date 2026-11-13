-- Hatsi360 — 0018 brand refresh
--
-- The product identity changed from the previous working name to Hatsi360.
-- This migration updates the stored brand settings so every operational
-- surface (the Control Centre settings screen, exported reports, generated
-- documents and notification templates) resolves the same name, strapline and
-- descriptor the website does.
--
-- It is an upsert, so it is safe to run against an environment where 0016 has
-- already applied, and it changes no price, market, commodity or observation
-- record. No historical data is touched.
--
-- The ownership wording below is deliberately non-specific about legal
-- structure. Authorised personnel must approve the final legal language
-- before it is published in a contract or an invoice.

insert into public.system_settings (key, value, description)
values
  ('brand.name', '"Hatsi360"'::jsonb, 'The product name.'),
  ('brand.descriptor', '"Agricultural Market Intelligence"'::jsonb,
   'The category line shown under the wordmark.'),
  ('brand.category', '"Agricultural Market Intelligence"'::jsonb,
   'The product category.'),
  ('brand.commodity_descriptor', '"Agricultural Commodity Intelligence"'::jsonb,
   'The longer descriptor used on brand assets and in partner material.'),
  ('brand.tagline', '"Know the harvest. Understand the market. Trade with confidence."'::jsonb,
   'The product strapline.'),
  ('brand.endorsement', '"Powered by Pluck Agro"'::jsonb,
   'The subordinate corporate endorsement.'),
  ('brand.ownership_statement',
   '"Hatsi360 is an independent agricultural market intelligence platform powered by Pluck Agro."'::jsonb,
   'Ownership wording. Requires approval by authorised personnel before legal publication.'),
  ('brand.operating_market', '"Northern Nigeria"'::jsonb,
   'The market the collection network currently covers.'),
  ('brand.expansion', '"Nationwide Nigeria, followed by other African agricultural markets."'::jsonb,
   'The stated expansion ambition. A plan, never a coverage claim.'),
  ('brand.field_surface', '"Hatsi360 Field"'::jsonb,
   'The product name for the field collection application.'),
  ('brand.control_surface', '"Hatsi360 Intelligence Control Centre"'::jsonb,
   'The product name for the administrative workspace.'),
  ('brand.portal_surface', '"Hatsi360 Access Portal"'::jsonb,
   'The product name for the sign-in portal.')
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description;

-- The audit trail records the refresh itself: who changed the stored identity
-- and when. The application writes the actor through the existing audit
-- trigger on system_settings.
insert into public.audit_logs (entity_type, entity_id, action, reason)
values (
  'system_settings',
  'brand',
  'update',
  'Brand refresh: product identity moved to Hatsi360. No price, market, commodity or observation record was changed.'
)
on conflict do nothing;
