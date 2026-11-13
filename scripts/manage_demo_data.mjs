#!/usr/bin/env node
/**
 * Hatsi360 — sample (test-fixture) data for demonstration and testing.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every operational table was empty, so no authenticated journey could show a
 * real workflow: the agent had nothing to submit, the verification officer had
 * an empty queue, and the control centre had no activity. This seeds a small,
 * realistic dataset so those screens can be demonstrated and tested.
 *
 * WHY IT CANNOT POLLUTE PRODUCTION INTELLIGENCE
 * ---------------------------------------------
 * The schema was already built for this. `observation_source` has a
 * `test_fixture` value, and the public read view filters it out twice over:
 *
 *   published_price_observations:
 *     WHERE o.is_current
 *       AND o.published_at IS NOT NULL
 *       AND o.verification_status IN ('verified','legacy_unverified')
 *       AND COALESCE(o.source_system,'agent_app') <> 'test_fixture'   <-- 1
 *       AND COALESCE(o.source_reference,'')       <> 'test_fixture';  <-- 2
 *
 * So this script sets BOTH markers, and additionally leaves `published_at`
 * NULL on every row it creates. Three independent barriers stand between a
 * fixture and the public site, and none of them depends on application code:
 *
 *   1. the view's `source_system <> 'test_fixture'` filter
 *   2. the view's `source_reference <> 'test_fixture'` filter
 *   3. `published_at IS NULL`, which also fails the RLS predicate
 *      `is_public_observation()` used by the anon and authenticated SELECT
 *      policies on the base table
 *
 * What the demo accounts CAN see is deliberate: the agent sees its own
 * submissions through `agent_user_id = auth.uid()`, and staff see everything
 * through `is_staff()`. That is the point — the verification queue has to have
 * something in it to be demonstrated.
 *
 * NOTHING HERE IS A REAL PRICE. The amounts are synthetic, round, and labelled.
 * They are never surfaced publicly, and they must never be published.
 *
 * USAGE
 * -----
 *   node scripts/manage_demo_data.mjs              # create (idempotent)
 *   node scripts/manage_demo_data.mjs --status     # report what exists
 *   node scripts/manage_demo_data.mjs --remove     # delete every fixture
 *   node scripts/manage_demo_data.mjs --dry-run    # show the plan, write nothing
 *
 * Requires .env.local (SUPABASE_DB_* or SUPABASE_SERVICE_ROLE_KEY).
 */

import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { Client as Pg } from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Node 20 has no global WebSocket, and @supabase/realtime-js insists on one
 * when a client is constructed. The transport has to be supplied explicitly or
 * every createClient() call throws "native WebSocket not found". */
const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const REALTIME = { realtime: { transport: WebSocket } };

const ROOT = process.cwd();

/* ------------------------------------------------------------------ env -- */

function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1];
      const value = m[2].replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* fall through to the ambient environment */
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      '(in .env.local or the environment) before running this script.',
  );
  process.exit(1);
}

/* The service-role key is used because seeding has to write rows that RLS
 * would otherwise refuse. It is read here, server-side, in a script that is
 * never bundled — it never reaches a browser. */
const admin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false },
  ...REALTIME,
});

const FIXTURE_SOURCE = 'test_fixture';

/** Every row carries this in `source_reference`, so a fixture is identifiable
 *  from the record alone, without joining anything. */
const FIXTURE_REFERENCE = 'test_fixture';

/* ------------------------------------------------------- deterministic RNG */

/** A tiny seeded PRNG so the dataset is identical on every run. Reproducible
 *  fixtures are reviewable; random ones are not. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------------- reference data */

const MARKETS = [
  { id: 1, name: 'Dawanau International Grains Market', focus: ['maize', 'rice', 'millet', 'sorghum', 'wheat'] },
  { id: 2, name: 'Mile 12 Market', focus: ['rice', 'beans', 'pepper', 'ginger', 'yam', 'oilseeds'] },
  { id: 5, name: 'Funtua Grains Market', focus: ['maize', 'millet', 'sorghum', 'groundnut'] },
  { id: 8, name: 'Sokoto Central Market', focus: ['maize', 'millet', 'groundnut', 'sesame', 'gum'] },
  { id: 10, name: 'Zaki Biam International Yam Market', focus: ['yam', 'rice', 'soya', 'cassava'] },
];

/** Synthetic wholesale reference ranges, NGN, per the stated unit. These are
 *  test values only — round, obviously not a market report. */
const COMMODITIES = [
  { slug: 'maize-yellow', name: 'Maize (Yellow)', unit: 'bag', low: 26000, high: 38000, grade: 1 },
  { slug: 'maize-white', name: 'Maize (White)', unit: 'bag', low: 25000, high: 36000, grade: 1 },
  { slug: 'millet', name: 'Millet', unit: 'bag', low: 28000, high: 44000, grade: 1 },
  { slug: 'sorghum-white', name: 'Sorghum (White)', unit: 'bag', low: 26000, high: 39000, grade: 1 },
  { slug: 'sorghum-red', name: 'Sorghum (Red)', unit: 'bag', low: 25000, high: 37000, grade: 1 },
  { slug: 'wheat', name: 'Wheat', unit: 'bag', low: 42000, high: 58000, grade: 1 },
  { slug: 'local-rice', name: 'Local Rice', unit: 'bag', low: 58000, high: 84000, grade: 1 },
  { slug: 'imported-rice', name: 'Imported Rice', unit: 'bag', low: 52000, high: 76000, grade: 5 },
  { slug: 'paddy-rice', name: 'Paddy Rice', unit: 'bag', low: 34000, high: 48000, grade: 1 },
  { slug: 'white-beans', name: 'White Beans', unit: 'bag', low: 68000, high: 94000, grade: 1 },
  { slug: 'brown-beans-oloyin', name: 'Brown Beans (Oloyin)', unit: 'bag', low: 72000, high: 98000, grade: 1 },
  { slug: 'soya-beans', name: 'Soya Beans', unit: 'bag', low: 43000, high: 59000, grade: 1 },
  { slug: 'groundnut', name: 'Groundnut', unit: 'bag', low: 58000, high: 79000, grade: 1 },
  { slug: 'sesame-seed', name: 'Sesame Seed', unit: 'bag', low: 68000, high: 93000, grade: 1 },
  { slug: 'bambara-nuts', name: 'Bambara Nuts', unit: 'bag', low: 46000, high: 64000, grade: 1 },
  { slug: 'dried-ginger', name: 'Dried Ginger', unit: 'kg', low: 1100, high: 1800, grade: 1 },
  { slug: 'dried-chilli-pepper', name: 'Dried Chilli Pepper', unit: 'kg', low: 900, high: 1600, grade: 1 },
  { slug: 'gum-arabic-gr-i', name: 'Gum Arabic GR I', unit: 'kg', low: 2400, high: 3900, grade: 1 },
  { slug: 'sweet-potato', name: 'Sweet Potato', unit: 'bag', low: 17000, high: 28000, grade: 1 },
];

const PRICE_TYPES = [
  'wholesale_asking',
  'wholesale_transaction',
  'farmgate',
  'retail',
  'indicative',
];

/** The verification states a demonstration needs, and how many of each. Every
 *  one of these keeps `published_at` NULL, so none can reach the public view. */
const STATE_MIX = [
  { status: 'submitted', weight: 0.24 },
  { status: 'pending_verification', weight: 0.16 },
  { status: 'verified', weight: 0.24 },
  { status: 'draft', weight: 0.16 },
  { status: 'rejected', weight: 0.1 },
  { status: 'correction_requested', weight: 0.1 },
];

const OBSERVATIONS_PER_MARKET = 11;
const DAYS_OF_HISTORY = 21;

/* ----------------------------------------------------------------- lookup */

async function lookup() {
  const { data: commodities, error: cErr } = await admin
    .from('commodities')
    .select('id, slug')
    .in('slug', COMMODITIES.map((c) => c.slug));
  if (cErr) throw new Error(`commodities: ${cErr.message}`);

  const { data: grades, error: gErr } = await admin
    .from('commodity_grades')
    .select('id, commodity_id, name');
  if (gErr) throw new Error(`grades: ${gErr.message}`);

  const { data: units, error: uErr } = await admin.from('measurement_units').select('id, code');
  if (uErr) throw new Error(`units: ${uErr.message}`);

  // `profiles` has no email column — addresses live in auth.users and are
  // read through the Auth Admin API (see src/lib/auth/emails.ts). Only the id
  // and role are needed here.
  const { data: users, error: pErr } = await admin.from('profiles').select('id, role, full_name');
  if (pErr) throw new Error(`profiles: ${pErr.message}`);

  return {
    commodityId: new Map((commodities ?? []).map((c) => [c.slug, c.id])),
    grades: grades ?? [],
    unitId: new Map((units ?? []).map((u) => [u.code, u.id])),
    users: users ?? [],
  };
}

/* ----------------------------------------------------------------- build -- */

function pickState(rng) {
  let r = rng();
  for (const s of STATE_MIX) {
    if (r < s.weight) return s.status;
    r -= s.weight;
  }
  return STATE_MIX[0].status;
}

function round(value) {
  // Round to the nearest 50 NGN for bag commodities, nearest 10 for per-kg.
  const step = value > 5000 ? 50 : 10;
  return Math.round(value / step) * step;
}

function buildPlan(ref) {
  const rng = mulberry32(20261113);
  const agent = ref.users.find((u) => u.role === 'agent');
  const verifier = ref.users.find((u) => u.role === 'verification_officer');

  if (!agent) throw new Error('No agent account found. Run scripts/manage_demo_users.mjs first.');

  const now = Date.now();
  const day = 86400000;

  const assignments = MARKETS.map((m) => ({
    user_id: agent.id,
    market_id: m.id,
    status: 'active',
    starts_on: new Date(now - 40 * day).toISOString().slice(0, 10),
    ends_on: null,
    assigned_by: null,
  }));

  const batches = [];
  const observations = [];

  for (const market of MARKETS) {
    // Two batches per market: a recent open one and a completed earlier one.
    // A market trades what it trades. Each focus keyword maps to a predicate,
    // and a commodity belongs to the market if ANY focus keyword matches it —
    // so Dawanau gets maize, millet, sorghum and wheat, not just the first.
    const FOCUS_MATCHERS = {
      maize: (k) => k.startsWith('maize'),
      rice: (k) => k.includes('rice'),
      beans: (k) => k.includes('beans'),
      pepper: (k) => k === 'dried-chilli-pepper',
      ginger: (k) => k === 'dried-ginger',
      yam: (k) => k === 'sweet-potato',
      oilseeds: (k) => ['soya-beans', 'sesame-seed', 'groundnut', 'bambara-nuts'].includes(k),
      groundnut: (k) => k === 'groundnut',
      sesame: (k) => k === 'sesame-seed',
      gum: (k) => k.startsWith('gum-arabic'),
      soya: (k) => k === 'soya-beans',
      cassava: (k) => k === 'sweet-potato',
      millet: (k) => k === 'millet',
      sorghum: (k) => k.startsWith('sorghum'),
      wheat: (k) => k === 'wheat',
    };
    const matchers = market.focus.map((f) => FOCUS_MATCHERS[f]).filter(Boolean);
    const marketCommodities = COMMODITIES.filter((c) => matchers.some((m) => m(c.slug))).slice(0, 6);

    const pairs = [];
    for (let b = 0; b < 2; b += 1) {
      const startedAt = new Date(now - (b === 0 ? 3 + b : 12 + b * 4) * day);
      const completedAt = b === 0 ? null : new Date(startedAt.getTime() + 5 * 3600 * 1000);
      pairs.push({
        batchIndex: b,
        startedAt,
        completedAt,
        reference: `TF-${market.id}-${b === 0 ? 'OPEN' : 'DONE'}-${startedAt.toISOString().slice(0, 10)}`,
        commodities: marketCommodities.slice(b * 3, b * 3 + 3),
      });
    }

    for (const pair of pairs) {
      const batchId = batches.length + 1;
      batches.push({
        reference: pair.reference,
        market_id: market.id,
        agent_user_id: agent.id,
        started_at: pair.startedAt.toISOString(),
        completed_at: pair.completedAt ? pair.completedAt.toISOString() : null,
        notes:
          'TEST FIXTURE — demonstration batch created by scripts/manage_demo_data.mjs. ' +
          'Not a real collection. GPS deliberately omitted: no coordinates are ' +
          'invented for fixtures.',
        gps_latitude: null,
        gps_longitude: null,
      });

      const count = Math.min(OBSERVATIONS_PER_MARKET, Math.max(3, pair.commodities.length * 2));
      for (let i = 0; i < count; i += 1) {
        const commodity = pair.commodities[i % pair.commodities.length];
        const commodityId = ref.commodityId.get(commodity.slug);
        if (!commodityId) continue;

        const grade = ref.grades.find(
          (g) => g.commodity_id === commodityId && g.id === commodity.grade,
        ) ?? ref.grades.find((g) => g.commodity_id === commodityId);
        const unitId = ref.unitId.get(commodity.unit);

        const status = pickState(rng);
        const collectedAt = new Date(pair.startedAt.getTime() + i * 47 * 60 * 1000);
        const submittedAt = status === 'draft' ? null : new Date(collectedAt.getTime() + 30 * 60 * 1000);
        const isVerified = status === 'verified';
        const verifiedAt = isVerified && verifier ? new Date(collectedAt.getTime() + 26 * 3600 * 1000) : null;

        const amount = round(commodity.low + rng() * (commodity.high - commodity.low));
        const priceType = PRICE_TYPES[Math.floor(rng() * PRICE_TYPES.length)];

        observations.push({
          commodity_id: commodityId,
          market_id: market.id,
          grade_id: grade ? grade.id : null,
          price_type: priceType,
          reported_amount: amount,
          reported_unit_id: unitId ?? null,
          currency_code: 'NGN',
          collected_at: collectedAt.toISOString(),
          collected_at_precision: 'minute',
          submitted_at: submittedAt ? submittedAt.toISOString() : null,
          verified_at: verifiedAt ? verifiedAt.toISOString() : null,
          // The single most important field in this script: NULL on every row.
          published_at: null,
          rejected_at: status === 'rejected' ? new Date(collectedAt.getTime() + 20 * 3600 * 1000).toISOString() : null,
          agent_user_id: agent.id,
          verified_by: verifiedAt && verifier ? verifier.id : null,
          verification_status: status,
          source_system: FIXTURE_SOURCE,
          source_reference: FIXTURE_REFERENCE,
          notes:
            `TEST FIXTURE — synthetic ${commodity.name} price for demonstration only. ` +
            'Not a market report, never published, excluded from every public read path.',
          is_current: true,
          quality_flags: status === 'rejected' ? ['price_outlier'] : [],
          // Resolved to a real collection_batches.id after the batches insert.
          batch_reference: pair.reference,
        });
      }
    }
  }

  return { assignments, batches, observations, agent, verifier };
}

/* ------------------------------------------------------------------ main -- */

async function main() {
  const args = new Set(process.argv.slice(2));
  const remove = args.has('--remove');
  const statusOnly = args.has('--status');
  const dryRun = args.has('--dry-run');

  const pg = new Pg({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  const canUsePg = process.env.SUPABASE_DB_HOST && process.env.SUPABASE_DB_USER;
  if (canUsePg) await pg.connect();

  const countFixtures = async () => {
    if (!canUsePg) return null;
    const r = await pg.query(
      `select (select count(*)::int from price_observations where source_system = 'test_fixture') as observations,
              (select count(*)::int from collection_batches where notes like 'TEST FIXTURE%') as batches`,
    );
    return r.rows[0];
  };

  try {
    if (statusOnly || remove || dryRun) {
      const counts = await countFixtures();
      if (counts) {
        console.log(`fixtures present: ${counts.observations} observations, ${counts.batches} batches`);
      }
      if (statusOnly) return;
    }

    if (remove) {
      if (!canUsePg) {
        console.error('--remove needs SUPABASE_DB_* credentials.');
        process.exit(1);
      }
      const batches = await pg.query(
        `delete from collection_batches where notes like 'TEST FIXTURE%' returning id`,
      );
      const obs = await pg.query(
        `delete from price_observations where source_system = 'test_fixture' returning id`,
      );
      // Market 1 is the assignment the demo-user script created; every other
      // market assignment for the demo agent was added by this script. The
      // table has no notes column, so the market id is the only honest marker.
      const asg = await pg.query(
        `delete from market_agent_assignments a
          using profiles p
          where a.user_id = p.id
            and p.role = 'agent'
            and a.market_id <> 1
          returning a.id`,
      ).catch((e) => {
        console.error(`  (assignment cleanup skipped: ${e.message})`);
        return { rowCount: 0 };
      });
      console.log(
        `removed ${obs.rowCount} observations, ${batches.rowCount} batches, ${asg.rowCount ?? 0} extra assignments`,
      );
      return;
    }

    // Refuse rather than half-write. `collection_batches.reference` is unique, so
    // a second create would fail part-way through and leave a mixed state. Say
    // what is there and what to do instead.
    const existingFixtures = await countFixtures();
    if (existingFixtures && existingFixtures.observations > 0) {
      console.log(
        `fixtures already exist (${existingFixtures.observations} observations, ` +
          `${existingFixtures.batches} batches).`,
      );
      console.log('Nothing written. Run with --remove first if you want a fresh set.');
      return;
    }

    const ref = await lookup();
    const plan = buildPlan(ref);

    console.log(
      `plan: ${plan.observations.length} observations across ${plan.batches.length} batches ` +
        `for agent ${plan.agent.role}` +
        (plan.verifier ? ` (verifier ${plan.verifier.role})` : ' (no verifier account)'),
    );

    if (dryRun) {
      const byStatus = {};
      for (const o of plan.observations) byStatus[o.verification_status] = (byStatus[o.verification_status] ?? 0) + 1;
      console.log('  state mix: ' + Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', '));
      console.log('  markets: ' + MARKETS.map((m) => m.id).join(', '));
      console.log('  published_at on every row: NULL');
      return;
    }

    // Assignments first, so the agent is entitled to each market it collects at.
    // `market_agent_assignments` has no unique constraint on (user_id, market_id)
    // — only the primary key — so an ON CONFLICT upsert has nothing to match and
    // silently inserts nothing. Read what exists and insert only the gaps.
    const { data: existing, error: eErr } = await admin
      .from('market_agent_assignments')
      .select('market_id')
      .eq('user_id', plan.agent.id);
    if (eErr) throw new Error(`market_agent_assignments read: ${eErr.message}`);
    const alreadyAssigned = new Set((existing ?? []).map((r) => r.market_id));
    const missing = plan.assignments.filter((a) => !alreadyAssigned.has(a.market_id));
    if (missing.length > 0) {
      const { error: aErr } = await admin.from('market_agent_assignments').insert(missing);
      if (aErr) throw new Error(`market_agent_assignments: ${aErr.message}`);
      console.log(`assigned ${missing.length} additional market(s) to the demo agent`);
    }

    // `collection_batches.id` is sequence-assigned, so the ids are not known
    // until after the insert. Insert the batches, read the ids back by
    // reference, then resolve each observation's batch before its own insert.
    const { error: bErr } = await admin.from('collection_batches').insert(plan.batches);
    if (bErr) throw new Error(`collection_batches: ${bErr.message}`);

    const { data: createdBatches, error: rErr } = await admin
      .from('collection_batches')
      .select('id, reference')
      .like('notes', 'TEST FIXTURE%');
    if (rErr) throw new Error(`collection_batches read-back: ${rErr.message}`);
    const batchIdByRef = new Map((createdBatches ?? []).map((b) => [b.reference, b.id]));

    const observations = plan.observations.map((o) => {
      const { batch_reference: ref, ...rest } = o;
      const id = batchIdByRef.get(ref);
      if (!id) throw new Error(`no batch id for reference ${ref}`);
      return { ...rest, collection_batch_id: id };
    });

    // Insert in chunks; one round trip per chunk rather than per row.
    const CHUNK = 50;
    for (let i = 0; i < observations.length; i += CHUNK) {
      const slice = observations.slice(i, i + CHUNK);
      const { error } = await admin.from('price_observations').insert(slice);
      if (error) throw new Error(`price_observations: ${error.message}`);
    }

    const counts = await countFixtures();
    if (counts) {
      console.log(`created: ${counts.observations} observations, ${counts.batches} batches`);
    }

    /* The guarantee, tested rather than asserted. If a fixture is ever publicly
     * readable this fails loudly instead of quietly leaking fake prices. */
    const anon = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
      ...REALTIME,
    });
    const { count: leaked, error: leakErr } = await anon
      .from('published_price_observations')
      .select('id', { count: 'exact', head: true })
      .eq('source_reference', FIXTURE_REFERENCE);
    if (leakErr) throw new Error(`public view probe: ${leakErr.message}`);
    if (leaked && leaked > 0) {
      throw new Error(`LEAK: ${leaked} fixture rows are publicly readable. Remove them now.`);
    }
    console.log('verified: 0 fixture rows are publicly readable through the published view');
  } finally {
    if (canUsePg) await pg.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
