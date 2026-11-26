-- ============================================================================
-- Hatsi360 — 0058 make report access unbreakable (PROPOSED, UNAPPLIED)
-- ============================================================================
-- Production's only entitlement-referencing policy is:
--   (not is_premium and published_at is not null) or is_staff() or has_entitlement('reports')
-- With the resolver raising 42P01, the third branch fails the whole query for
-- anon and for every non-staff authenticated user. market_reports has 0 rows
-- today, so nothing is visible yet; the first published report turns a public
-- read into an error.
--
-- This file restructures the policy so that:
--   * a resolver failure can never deny the PUBLIC branch (non-premium,
--     published rows stay readable no matter what the entitlement engine does);
--   * the premium branch uses has_entitlement_safe(), which returns false and
--     warns instead of raising;
--   * staff/admin keep unconditional read (is_staff()).
--
-- Anonymous behaviour is deliberate and unchanged in intent: anon can read
-- non-premium published reports, cannot read premium ones, and cannot obtain
-- an entitlement (the resolver is keyed to auth.uid()).
-- service_role bypasses RLS entirely; unchanged.
-- ============================================================================

alter table if exists public.market_reports enable row level security;

drop policy if exists reports_public_read on public.market_reports;

create policy reports_public_read on public.market_reports
  for select to anon, authenticated
  using (
    public.is_staff()
    or (
      published_at is not null
      and (
        is_premium is not true
        or public.has_entitlement_safe('reports')
      )
    )
  );

comment on policy reports_public_read on public.market_reports is
  'Public reports are readable by anyone, published. Premium reports require the reports entitlement, or staff. The entitlement test is fail-closed and cannot raise (0058), so a resolver defect cannot take public reports down.';

-- ---------------------------------------------------------------- self-check --
do $$
declare
  v_qual text;
begin
  select qual into v_qual
  from pg_policies
  where schemaname = 'public' and tablename = 'market_reports' and policyname = 'reports_public_read';

  if v_qual is null then
    raise exception '0058 self-check failed: reports_public_read was not created';
  end if;
  if position('has_entitlement_safe' in v_qual) = 0 then
    raise exception '0058 self-check failed: policy does not use the safe entitlement check';
  end if;
  if position('has_entitlement(' in v_qual) > 0 then
    raise exception '0058 self-check failed: policy still calls the raising resolver';
  end if;
end $$;
