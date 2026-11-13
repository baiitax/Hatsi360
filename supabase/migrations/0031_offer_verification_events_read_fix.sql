-- 0031_offer_verification_events_read_fix.sql
--
-- Corrective migration.
--
-- Migration 0027 created this policy with a comment describing the intent:
--
--     -- The verification trail is append-only. Anyone may read the events for
--     -- an offer they can see; nobody may update or delete them.
--     create policy offer_verification_events_read on public.offer_verification_events
--       for select
--       to anon, authenticated
--       using (true);
--
-- `using (true)` does not implement that sentence. It makes every row of the
-- verification trail readable by the anonymous public, including the trail for
-- offers that are drafts, withdrawn, rejected or merely submitted. Each event
-- carries `actor_id`, the transition it recorded and the free-text `reason` —
-- which for a rejection is private commercial feedback addressed to the
-- counterparty. So the policy as written publishes:
--
--   * the existence of private offers that were never disclosed,
--   * who acted on them, by user id,
--   * the reasons a counterparty was refused.
--
-- That breaks the standing rule that public users may read only explicitly
-- published eligible records, and the trade brief's "do not expose private
-- commercial information". The offers themselves are correctly gated by
-- `buyer_offers_public_read` / `seller_offers_public_read`; the trail that
-- describes them was not.
--
-- The fix makes the policy say what the comment always said: an event is
-- readable when the offer it belongs to is readable by the same principal.
-- Staff keep their unconditional read, which is what
-- `offer_verification_events_staff_read` already grants, so the two policies
-- together cover exactly the intended audience.
--
-- The inner lookups are deliberately not `security definer`. They run as the
-- calling role, so the offer's own RLS policies apply to them and a caller
-- cannot use this policy to discover a row they otherwise could not read. The
-- explicit predicates are defence in depth: they state the same condition the
-- offer policy states, so the intent survives a future change to that policy.
--
-- Verified before/after with `set local role anon` and `set local role
-- authenticated`: anon and authenticated saw 69 fixture events before, and see
-- only the events belonging to published offers after.
--
-- Idempotent: the policy is dropped and recreated.

begin;

drop policy if exists offer_verification_events_read on public.offer_verification_events;

create policy offer_verification_events_read on public.offer_verification_events
  for select
  to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1
        from public.buyer_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'buyer_offers'
         and o.status = 'verified'
         and o.disclosure_consent
         and (o.valid_until is null or o.valid_until > now())
    )
    or exists (
      select 1
        from public.seller_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'seller_offers'
         and o.status = 'verified'
         and o.disclosure_consent
         and (o.valid_until is null or o.valid_until > now())
    )
    or exists (
      select 1
        from public.buyer_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'buyer_offers'
         and o.user_id = auth.uid()
    )
    or exists (
      select 1
        from public.seller_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'seller_offers'
         and o.user_id = auth.uid()
    )
  );

comment on policy offer_verification_events_read on public.offer_verification_events is
  'Read only the verification trail of an offer the caller may read: staff read all, an owner reads their own, the public reads only published offers.';

commit;
