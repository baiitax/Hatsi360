/**
 * Phase 5 — Workstream C: B2B transaction security acceptance.
 *
 * Executes the seven cases named in the phase brief, plus cross-party cases
 * that the Phase 4 suite did not cover. Real roles and JWT claims, one
 * rolled-back transaction on the replica.
 *
 * Where current behaviour is weaker than the brief asks for, the case is
 * recorded as a DOCUMENTED DEVIATION rather than quietly passing — so the
 * review sees it and the run still distinguishes "the suite agrees with the
 * design" from "the suite found something".
 */
import { connect, applyFiles, applyFileInsideTransaction, runAs, runAsPersist, seedUsers, IDs, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;
const deviations = [];
function deviation(label, detail) {
  deviations.push({ label, detail });
  console.log(`  !! DEVIATION  ${label} — ${detail}`);
}

const client = await connect();

try {
  await client.query('begin');
  await applyFileInsideTransaction(client, 'supabase/migrations/0047_stage4_rfq_orders.sql');
  await applyFiles(client, ['supabase/proposed/0059_b2b_security_hardening.sql']);
  await seedUsers(client);

  const commodity = (await client.query('select id from public.commodities order by id limit 1')).rows[0].id;
  const unit = (await client.query('select id from public.measurement_units order by id limit 1')).rows[0].id;

  // Two suppliers, two buyers.
  for (const [id, name] of [[IDs.supplier, 'Supplier A Ltd'], [IDs.stranger, 'Supplier B Ltd']]) {
    await client.query(
      `insert into public.supplier_profiles (id, business_name, business_type) values ($1, $2, 'trader')`,
      [id, name]);
  }
  const makeRfqQuote = async (buyerId, supplierId, label) => {
    const rfq = await client.query(
      `insert into public.rfqs (buyer_id, title, description, commodity_id, quantity, unit_id, valid_until)
       values ($1, $2, 'fixture', $3, 100, $4, now() + interval '7 days') returning id`,
      [buyerId, label, commodity, unit]);
    const quote = await client.query(
      `insert into public.quotes (rfq_id, supplier_id, offered_quantity, unit_price, valid_until, status)
       values ($1, $2, 100, 300000, now() + interval '3 days', 'accepted') returning id`,
      [rfq.rows[0].id, supplierId]);
    return { rfqId: rfq.rows[0].id, quoteId: quote.rows[0].id };
  };

  const mine = await makeRfqQuote(IDs.buyer, IDs.supplier, 'Buyer A RFQ');
  const theirs = await makeRfqQuote(IDs.admin, IDs.stranger, 'Buyer B RFQ');

  // ── 1. Supplier self-verification ───────────────────────────────────────
  const selfVerify = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set verification_status='verified', verification_level=3 where id=$1`,
    [IDs.supplier]);
  check('1. self-verification', 'denied (42501)', '42501', selfVerify.code ?? `${selfVerify.rowCount} rows`, !selfVerify.ok && selfVerify.code === '42501');

  // ── 2. Cross-supplier trust modification ────────────────────────────────
  const crossTrust = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set verification_status='verified' where id=$1`, [IDs.stranger]);
  check('2. cross-supplier trust write', 'denied', '0 rows or 42501', crossTrust.ok ? `${crossTrust.rowCount} rows` : crossTrust.code, !crossTrust.ok || crossTrust.rowCount === 0);

  const crossEdit = await runAs(client, 'authenticated', IDs.supplier,
    `update public.supplier_profiles set contact_phone='+234000' where id=$1`, [IDs.stranger]);
  check('2b. cross-supplier profile write', 'denied', '0 rows or 42501', crossEdit.ok ? `${crossEdit.rowCount} rows` : crossEdit.code, !crossEdit.ok || crossEdit.rowCount === 0);

  // ── 3. Cross-customer quote access ──────────────────────────────────────
  const crossQuote = await runAs(client, 'authenticated', IDs.buyer,
    `select count(*)::int n from public.quotes where id = $1`, [theirs.quoteId]);
  check('3. cross-customer quote read', '0 rows', 0, crossQuote.ok ? crossQuote.rows[0].n : crossQuote.code, crossQuote.ok && crossQuote.rows[0].n === 0);

  const crossOrder = await runAs(client, 'authenticated', IDs.buyer,
    `select public.create_order_from_quote($1, 'cross') as id`, [theirs.quoteId]);
  check('3b. order from another buyer\'s quote', 'denied (42501)', '42501', crossOrder.code ?? 'created', !crossOrder.ok && crossOrder.code === '42501');

  // ── 4. Unauthorized order creation ──────────────────────────────────────
  const stranger = await runAs(client, 'authenticated', IDs.staff,
    `select public.create_order_from_quote($1, 'staff') as id`, [mine.quoteId]);
  check('4. order created by non-buyer staff', 'accepted (staff override)', 'accepted', stranger.ok ? 'accepted' : stranger.code, stranger.ok);

  const buyerOrder = await runAsPersist(client, 'authenticated', IDs.buyer,
    `select public.create_order_from_quote($1, 'ok') as id`, [mine.quoteId]);
  check('4b. order created by the buyer', 'accepted', 'accepted', buyerOrder.ok ? 'accepted' : buyerOrder.code, buyerOrder.ok);

  const order = (await client.query('select id, total_amount, status from public.orders limit 1')).rows[0];
  check('4c. total comes from the quote', 'total = unit_price × quantity', '30000000',
    String(order.total_amount), Number(order.total_amount) === 30_000_000);

  // ── 5. Invalid order transitions ────────────────────────────────────────
  const illegal1 = await runAs(client, 'authenticated', IDs.buyer, `update public.orders set status='completed' where id=$1`, [order.id]);
  check('5. confirmed → completed', 'denied (22023)', '22023', illegal1.code ?? `${illegal1.rowCount} rows`, !illegal1.ok && illegal1.code === '22023');

  const noReason = await runAs(client, 'authenticated', IDs.buyer, `update public.orders set status='disputed' where id=$1`, [order.id]);
  check('5b. dispute without a reason', 'denied (22023)', '22023', noReason.code ?? 'accepted', !noReason.ok && noReason.code === '22023');

  const legacy = await runAs(client, 'authenticated', IDs.buyer, `update public.orders set status='shipped' where id=$1`, [order.id]);
  check('5c. confirmed → shipped (skips in_progress)', 'denied (22023)', '22023', legacy.code ?? 'accepted', !legacy.ok && legacy.code === '22023');

  const priceChange = await runAs(client, 'authenticated', IDs.buyer, `update public.orders set total_amount=1 where id=$1`, [order.id]);
  check('5d. price rewrite after creation', 'denied (42501)', '42501', priceChange.code ?? 'updated', !priceChange.ok && priceChange.code === '42501');

  // ── 6. Unauthorized RFQ expiry ──────────────────────────────────────────
  const expire = await runAs(client, 'authenticated', IDs.buyer, 'select public.expire_old_rfqs() as n');
  check('6. authenticated RFQ expiry', 'denied (42501)', '42501', expire.code ?? 'executed', !expire.ok && expire.code === '42501');

  // ── 7. Audit-event forgery ──────────────────────────────────────────────
  const forged = await runAs(client, 'authenticated', IDs.supplier,
    `insert into public.order_events (order_id, event_type, actor_type, description) values ($1,'delivered','supplier','forged')`,
    [order.id]);
  check('7. forged audit event', 'denied (42501)', '42501', forged.code ?? 'inserted', !forged.ok && forged.code === '42501');

  const forgedByStranger = await runAs(client, 'authenticated', IDs.stranger,
    `insert into public.order_events (order_id, event_type, actor_type) values ($1,'cancelled','system')`, [order.id]);
  check('7b. forged event by an unrelated supplier', 'denied (42501)', '42501', forgedByStranger.code ?? 'inserted', !forgedByStranger.ok && forgedByStranger.code === '42501');

  // ── 8. Direct insert: economics pinned to the quote (0059) ──────────────
  // `orders_insert` permits a buyer to insert against their own accepted
  // quote. Before 0059 nothing constrained the money columns, so a hand-rolled
  // PostgREST insert could name any price and then take a legal transition.
  const forgedDirect = await runAs(client, 'authenticated', IDs.buyer,
    `insert into public.orders (order_number, buyer_id, supplier_id, commodity_id, quantity, unit_id, unit_price, total_amount, status, quote_id)
     values ('ORD-P5-FORGE', $1, $2, $3, 1, $4, 1, 1, 'draft', $5) returning id`,
    [IDs.buyer, IDs.supplier, commodity, unit, mine.quoteId]);
  check('8. forged order economics on own quote', 'denied (42501)', '42501',
    forgedDirect.code ?? 'inserted', !forgedDirect.ok && forgedDirect.code === '42501');

  // The same insert with the quote's own numbers must still work, or the pin
  // would be a false positive that breaks a legitimate path.
  const honestDirect = await runAs(client, 'authenticated', IDs.buyer,
    `insert into public.orders (order_number, buyer_id, supplier_id, commodity_id, quantity, unit_id, unit_price, total_amount, status, quote_id)
     values ('ORD-P5-HONEST', $1, $2, $3, 100, $4, 300000, 30000000, 'draft', $5) returning id`,
    [IDs.buyer, IDs.supplier, commodity, unit, mine.quoteId]);
  check('8b. honest direct insert still allowed', 'accepted', 'accepted',
    honestDirect.ok ? 'accepted' : honestDirect.code, honestDirect.ok);

  // ── 9. Payment state at creation (0059) ────────────────────────────────
  const prepaid = await runAs(client, 'authenticated', IDs.buyer,
    `insert into public.orders (order_number, buyer_id, supplier_id, commodity_id, quantity, unit_id, unit_price, total_amount, status, quote_id, payment_status, paid_amount)
     values ('ORD-P5-PREPAID', $1, $2, $3, 100, $4, 300000, 30000000, 'draft', $5, 'paid', 30000000) returning id`,
    [IDs.buyer, IDs.supplier, commodity, unit, mine.quoteId]);
  check('9. order created already paid', 'denied (42501)', '42501',
    prepaid.code ?? 'inserted', !prepaid.ok && prepaid.code === '42501');

  const pay = await runAs(client, 'authenticated', IDs.buyer,
    `update public.orders set payment_status='paid', paid_amount=total_amount where id=$1`, [order.id]);
  check('9b. buyer marking an order paid', 'denied (42501)', '42501',
    pay.code ?? `${pay.rowCount} rows`, !pay.ok && pay.code === '42501');

  const healthyEdit = await runAs(client, 'authenticated', IDs.buyer,
    `update public.orders set buyer_notes='please call on arrival' where id=$1`, [order.id]);
  check('9c. non-payment edit by the buyer still allowed', 'updated', '1 row',
    healthyEdit.ok ? `${healthyEdit.rowCount} rows` : healthyEdit.code, healthyEdit.ok && healthyEdit.rowCount === 1);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 5 — B2B transaction security acceptance');
console.log(`\nDocumented deviations: ${deviations.length} (D-1 and D-2 are closed by 0059 and asserted above as 8/9)`);
for (const d of deviations) console.log(`  - ${d.label}: ${d.detail}`);
