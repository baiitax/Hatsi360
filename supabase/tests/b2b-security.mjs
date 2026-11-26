/**
 * Phase 4 — Workstream E: negative tests for the B2B corrections.
 *
 * 0047 and 0059 are applied to the LOCAL replica inside one transaction that
 * is rolled back at the end. Nothing is deployed, and 0047 is never applied
 * outside this transaction.
 */
import { connect, applyFiles, applyFileInsideTransaction, runAs, runAsPersist, seedUsers, IDs, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

const client = await connect();

try {
  await client.query('begin');
  await applyFileInsideTransaction(client, 'supabase/migrations/0047_stage4_rfq_orders.sql');
  await applyFiles(client, ['supabase/proposed/0059_b2b_security_hardening.sql']);
  await seedUsers(client);

  const commodity = (await client.query('select id from public.commodities order by id limit 1')).rows[0].id;
  const unit = (await client.query('select id from public.measurement_units order by id limit 1')).rows[0].id;

  await client.query(
    `insert into public.supplier_profiles (id, business_name, business_type)
     values ($1, 'Phase4 Suppliers Ltd', 'trader')`,
    [IDs.supplier],
  );

  await client.query(
    `insert into public.rfqs (buyer_id, title, description, commodity_id, quantity, unit_id, valid_until)
     values ($1, 'Phase4 RFQ', '500 tonnes of maize', $2, 500, $3, now() + interval '7 days')`,
    [IDs.buyer, commodity, unit],
  );
  const rfqId = (await client.query('select id from public.rfqs limit 1')).rows[0].id;

  await client.query(
    `insert into public.quotes (rfq_id, supplier_id, offered_quantity, unit_price, valid_until, status)
     values ($1, $2, 500, 250000, now() + interval '3 days', 'accepted')`,
    [rfqId, IDs.supplier],
  );
  const quoteId = (await client.query('select id from public.quotes limit 1')).rows[0].id;

  // ── B-6: supplier cannot verify itself ──────────────────────────────────
  // The fixture supplier starts 'pending'. It must be able to edit its own
  // profile (that path was silently broken before 0059) but not its trust
  // fields.
  const selfVerifyPending = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set verification_status = 'verified', verification_level = 3 where id = $1`,
    [IDs.supplier]);
  check('supplier (pending): self-verification', 'denied (42501)', '42501', selfVerifyPending.code ?? `${selfVerifyPending.rowCount ?? 0} rows`, !selfVerifyPending.ok && selfVerifyPending.code === '42501');

  const ownEditPending = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set contact_phone = '+2348000000000' where id = $1`,
    [IDs.supplier]);
  check('supplier (pending): own contact edit', 'accepted (1 row)', '1 row', ownEditPending.ok ? `${ownEditPending.rowCount} row` : ownEditPending.code, ownEditPending.ok && ownEditPending.rowCount === 1);

  // Once verified, the same supplier still may not touch the trust fields.
  await client.query(`update public.supplier_profiles set verification_status = 'verified' where id = $1`, [IDs.supplier]);
  const selfUpgrade = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set verification_level = 3 where id = $1`, [IDs.supplier]);
  check('supplier (verified): level escalation', 'denied (42501)', '42501', selfUpgrade.code ?? `${selfUpgrade.rowCount ?? 0} rows`, !selfUpgrade.ok && selfUpgrade.code === '42501');

  const selfReputation = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set average_rating = 5, total_transactions = 99 where id = $1`,
    [IDs.supplier]);
  check('supplier: self-granted reputation', 'denied (42501)', '42501', selfReputation.code ?? 'updated', !selfReputation.ok && selfReputation.code === '42501');

  const ownEdit = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set business_name = 'Phase4 Suppliers (renamed)' where id = $1`,
    [IDs.supplier]);
  check('supplier: ordinary profile edit', 'accepted (1 row)', '1 row', ownEdit.ok ? `${ownEdit.rowCount} row` : ownEdit.code, ownEdit.ok && ownEdit.rowCount === 1);

  const staffVerify = await runAs(client, 'authenticated', IDs.staff,
    `update public.supplier_profiles set verification_status = 'verified', verification_level = 2 where id = $1`,
    [IDs.supplier]);
  check('staff: verification', 'accepted', 'accepted', staffVerify.ok ? 'accepted' : staffVerify.code, staffVerify.ok);

  // ── B-1/B-2: order creation is the buyer's act ──────────────────────────
  const strangerOrder = await runAs(client, 'authenticated', IDs.stranger,
    'select public.create_order_from_quote($1, $2) as id', [quoteId, 'stranger']);
  check('order: created by a stranger', 'denied (42501)', '42501', strangerOrder.code ?? 'created', !strangerOrder.ok && strangerOrder.code === '42501');

  const supplierOrder = await runAs(client, 'authenticated', IDs.supplier,
    'select public.create_order_from_quote($1, $2) as id', [quoteId, 'supplier']);
  check('order: created by the supplier', 'denied (42501)', '42501', supplierOrder.code ?? 'created', !supplierOrder.ok && supplierOrder.code === '42501');

  const buyerOrder = await runAsPersist(client, 'authenticated', IDs.buyer,
    'select public.create_order_from_quote($1, $2) as id', [quoteId, 'buyer']);
  check('order: created by the buyer', 'accepted', 'accepted', buyerOrder.ok ? 'accepted' : buyerOrder.code, buyerOrder.ok);

  const orderRow = (await client.query('select id, buyer_id, supplier_id, status from public.orders limit 1')).rows[0];
  check('order: parties come from the records', 'buyer and supplier frozen', 'buyer/supplier ok',
    orderRow ? `${orderRow.buyer_id === IDs.buyer ? 'buyer' : 'WRONG'}/${orderRow.supplier_id === IDs.supplier ? 'supplier' : 'WRONG'}` : 'no order',
    !!orderRow && orderRow.buyer_id === IDs.buyer && orderRow.supplier_id === IDs.supplier);

  const duplicate = await runAs(client, 'authenticated', IDs.buyer,
    'select public.create_order_from_quote($1, $2) as id', [quoteId, 'again']);
  check('order: second order from the same quote', 'denied (23505)', '23505', duplicate.code ?? 'created', !duplicate.ok && duplicate.code === '23505');

  // ── B-3: expiry is internal ─────────────────────────────────────────────
  const expireAsUser = await runAs(client, 'authenticated', IDs.stranger, 'select public.expire_old_rfqs() as n');
  check('rfq expiry: authenticated caller', 'denied (42501)', '42501', expireAsUser.code ?? 'executed', !expireAsUser.ok && expireAsUser.code === '42501');

  const expireAsService = await runAs(client, 'service_role', null, 'select public.expire_old_rfqs() as n');
  check('rfq expiry: service_role', 'executed', 'executed', expireAsService.ok ? 'executed' : expireAsService.code, expireAsService.ok);

  // ── B-4/B-5: transitions ────────────────────────────────────────────────
  const illegal = await runAs(client, 'authenticated', IDs.supplier,
    `update public.orders set status = 'completed' where id = $1`, [orderRow.id]);
  check('order: illegal transition confirmed → completed', 'denied (22023)', '22023', illegal.code ?? 'updated', !illegal.ok && illegal.code === '22023');

  const strangerUpdate = await runAs(client, 'authenticated', IDs.stranger,
    `update public.orders set status = 'in_progress' where id = $1`, [orderRow.id]);
  check('order: status change by a non-party', 'denied (RLS: 0 rows)', '0 rows', strangerUpdate.ok ? `${strangerUpdate.rowCount ?? 0} rows` : strangerUpdate.code, !strangerUpdate.ok || strangerUpdate.rowCount === 0);

  const legal = await runAsPersist(client, 'authenticated', IDs.supplier,
    `update public.orders set status = 'in_progress' where id = $1`, [orderRow.id]);
  check('order: legal transition confirmed → in_progress', 'accepted', 'accepted', legal.ok ? 'accepted' : legal.code, legal.ok && legal.rowCount === 1);

  const noReason = await runAs(client, 'authenticated', IDs.supplier,
    `update public.orders set status = 'cancelled' where id = $1`, [orderRow.id]);
  check('order: cancel without a reason', 'denied (22023)', '22023', noReason.code ?? 'cancelled', !noReason.ok && noReason.code === '22023');

  const withReason = await runAsPersist(client, 'authenticated', IDs.buyer,
    `update public.orders set status = 'disputed', cancellation_reason = 'short delivery' where id = $1`, [orderRow.id]);
  check('order: dispute with a reason', 'accepted', 'accepted', withReason.ok ? 'accepted' : withReason.code, withReason.ok && withReason.rowCount === 1);

  // ── B-7: audit evidence cannot be forged ────────────────────────────────
  const forged = await runAs(client, 'authenticated', IDs.buyer,
    `insert into public.order_events (order_id, event_type, actor_type, description)
     values ($1, 'completed', 'buyer', 'forged')`, [orderRow.id]);
  check('events: forged insert by a party', 'denied (42501)', '42501', forged.code ?? 'inserted', !forged.ok && forged.code === '42501');

  const events = await runAs(client, 'authenticated', IDs.buyer,
    `select event_type, from_status::text as f, to_status::text as t from public.order_events where order_id = $1 order by created_at`, [orderRow.id]);
  const trail = events.ok ? events.rows.map((r) => `${r.event_type}:${r.f ?? '-'}->${r.t ?? '-'}`).join(' | ') : events.code;
  check('events: trail written by the trigger', 'created + two status_changed', 'created:-->confirmed | status_changed:confirmed->in_progress | status_changed:in_progress->disputed', trail, events.ok && events.rows.length === 3);

  // ── B-8: orders cannot be inserted outside the quote flow ───────────────
  const directInsert = await runAs(client, 'authenticated', IDs.buyer,
    `insert into public.orders (order_number, buyer_id, supplier_id, commodity_id, quantity, unit_id, unit_price, total_amount, status, quote_id)
     values ('ORD-XX-9999', $1, $2, $3, 1, $4, 1, 1, 'completed', $5)`,
    [IDs.buyer, IDs.supplier, commodity, unit, quoteId]);
  check('orders: direct insert with a forged status', 'denied (42501)', '42501', directInsert.code ?? 'inserted', !directInsert.ok && directInsert.code === '42501');

  // ── definer hygiene ─────────────────────────────────────────────────────
  const proconfig = await client.query(`
    select proname, proconfig from pg_proc
    where proname in ('create_order_from_quote','expire_old_rfqs','generate_order_number')`);
  const pinned = proconfig.rows.every((r) => (r.proconfig ?? []).some((c) => c.startsWith('search_path=')));
  check('definer functions', 'search_path pinned on all three', 'all three',
    pinned ? 'all three' : proconfig.rows.map((r) => `${r.proname}=${(r.proconfig ?? []).join(',') || 'none'}`).join(' '),
    pinned);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 4 integration — B2B security negatives');
