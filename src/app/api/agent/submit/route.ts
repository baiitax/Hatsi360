import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSession } from '@/lib/auth';

/**
 * Submit a collected price.
 *
 * The route is the field app's transport: it accepts the payload, validates
 * it, and hands it to the database function `submit_observation`, which
 * enforces the agent's account state, their market assignment, their task
 * ownership and the idempotency key.
 *
 * A retried request with the same idempotency key returns the original
 * observation instead of creating a second one, so a flaky connection can
 * never duplicate a price.
 */

const payloadSchema = z.object({
  marketId: z.coerce.number().int().positive(),
  commodityId: z.coerce.number().int().positive(),
  varietyId: z.coerce.number().int().positive().nullable().optional(),
  gradeId: z.coerce.number().int().positive().nullable().optional(),
  priceType: z.enum([
    'farmgate',
    'wholesale_asking',
    'wholesale_transaction',
    'retail',
    'processor_procurement',
    'export_buy',
    'export_sell',
    'indicative',
    'unspecified',
  ]),
  amount: z.coerce.number().positive().max(1_000_000_000),
  unitId: z.coerce.number().int().positive(),
  packageWeightKg: z.coerce.number().positive().nullable().optional(),
  packageCount: z.coerce.number().int().positive().nullable().optional(),
  collectedAt: z.string().min(4),
  notes: z.string().trim().max(500).nullable().optional(),
  taskId: z.coerce.number().int().positive().nullable().optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Submissions are unavailable: no database is configured.' },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session?.profile) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }
  if (session.profile.accountStatus !== 'active') {
    return NextResponse.json(
      { ok: false, message: 'This account is not active.' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Check the values you entered.',
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: observationId, error } = await supabase.rpc('submit_observation', {
    p_payload: {
      market_id: data.marketId,
      commodity_id: data.commodityId,
      variety_id: data.varietyId ?? null,
      grade_id: data.gradeId ?? null,
      price_type: data.priceType,
      reported_amount: String(data.amount),
      reported_unit_id: data.unitId,
      package_weight_kg:
        data.packageWeightKg === null || data.packageWeightKg === undefined
          ? null
          : String(data.packageWeightKg),
      package_count: data.packageCount ?? null,
      currency_code: 'NGN',
      collected_at: new Date(data.collectedAt).toISOString(),
      collected_at_precision: 'minute',
      notes: data.notes ?? null,
      task_id: data.taskId ?? null,
      source_reference: 'agent_app',
    },
    p_idempotency_key: data.idempotencyKey,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, observationId });
}
