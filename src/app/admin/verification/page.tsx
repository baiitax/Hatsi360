import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PageHeader, Panel, Pill, VERIFICATION_LABELS, verificationTone } from '@/components/ops/Primitives';
import { VerificationActions } from '@/components/admin/VerificationActions';
import { InlineEmpty } from '@/components/ops/Primitives';
import { formatDateTime } from '@/lib/money';
import { formatMoney } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Verification queue — Control Centre',
  robots: { index: false, follow: false },
};

interface QueueRow {
  id: string;
  commodityName: string;
  marketName: string;
  agentName: string;
  amount: number | null;
  unitName: string | null;
  priceType: string;
  collectedAt: string;
  submittedAt: string | null;
  notes: string | null;
  status: string;
  publishedAt: string | null;
  qualityFlags: string[];
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  await requireStaff('/admin/verification');

  const filter = params.status ?? 'submitted';
  const rows: QueueRow[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    let query = supabase
      .from('price_observations')
      .select(
        'id, commodity_id, market_id, agent_user_id, reported_amount, reported_unit_id, price_type, collected_at, submitted_at, verified_at, published_at, verification_status, notes, quality_flags',
      )
      .order('submitted_at', { ascending: true })
      .limit(100);

    if (filter === 'submitted') {
      query = query.in('verification_status', ['submitted', 'pending_verification']);
    } else if (filter === 'verified') {
      query = query.eq('verification_status', 'verified');
    } else if (filter === 'rejected') {
      query = query.eq('verification_status', 'rejected');
    } else if (filter === 'correction_requested') {
      query = query.eq('verification_status', 'correction_requested');
    } else if (filter === 'published') {
      query = query.not('published_at', 'is', null);
    }

    const { data } = await query;
    const list = data ?? [];
    const commodityIds = [...new Set(list.map((r) => r.commodity_id as number))];
    const marketIds = [...new Set(list.map((r) => r.market_id as number))];
    const unitIds = [...new Set(list.map((r) => r.reported_unit_id).filter(Boolean))] as number[];
    const agentIds = [...new Set(list.map((r) => r.agent_user_id).filter(Boolean))] as string[];

    const [commodities, markets, units, agents] = await Promise.all([
      commodityIds.length
        ? supabase.from('commodities').select('id, name').in('id', commodityIds)
        : Promise.resolve({ data: [] }),
      marketIds.length
        ? supabase.from('markets').select('id, name').in('id', marketIds)
        : Promise.resolve({ data: [] }),
      unitIds.length
        ? supabase.from('measurement_units').select('id, name, code').in('id', unitIds)
        : Promise.resolve({ data: [] }),
      agentIds.length
        ? supabase.from('profiles').select('id, full_name').in('id', agentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const commodityNames = new Map(
      (commodities.data ?? []).map((c) => [c.id as number, c.name as string]),
    );
    const marketNames = new Map((markets.data ?? []).map((m) => [m.id as number, m.name as string]));
    const unitNames = new Map(
      (units.data ?? []).map((u) => [u.id as number, (u.name as string) ?? (u.code as string)]),
    );
    const agentNames = new Map(
      (agents.data ?? []).map((a) => [a.id as string, (a.full_name as string | null) ?? 'Unknown agent']),
    );

    for (const row of list) {
      rows.push({
        id: row.id as string,
        commodityName: commodityNames.get(row.commodity_id as number) ?? 'Commodity',
        marketName: marketNames.get(row.market_id as number) ?? 'Market',
        agentName: row.agent_user_id
          ? (agentNames.get(row.agent_user_id as string) ?? 'Unknown agent')
          : 'Unknown agent',
        amount: row.reported_amount == null ? null : Number(row.reported_amount),
        unitName: row.reported_unit_id ? (unitNames.get(row.reported_unit_id as number) ?? null) : null,
        priceType: row.price_type as string,
        collectedAt: row.collected_at as string,
        submittedAt: (row.submitted_at as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        status: row.verification_status as string,
        publishedAt: (row.published_at as string | null) ?? null,
        qualityFlags: (row.quality_flags as string[] | null) ?? [],
      });
    }
  }

  const FILTERS = [
    { key: 'submitted', label: 'Awaiting review' },
    { key: 'verified', label: 'Approved' },
    { key: 'published', label: 'Published' },
    { key: 'correction_requested', label: 'Correction required' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <>
      <PageHeader
        title="Verification queue"
        description={
          <>
            Approving a price records that it is sound. Publishing it is a separate, second act
            that puts it on the public price pages. A reviewer can never approve their own
            submission.
          </>
        }
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Verification' },
        ]}
      />

      <nav aria-label="Verification filters" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/verification?status=${item.key}`}
            aria-current={filter === item.key ? 'page' : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === item.key
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <InlineEmpty
          title="Nothing in this view"
          description="When an agent submits a price it appears here for review. No sample or placeholder records are shown."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-ink-900">
                        {row.commodityName} · {row.marketName}
                      </h2>
                      <Pill tone={verificationTone(row.status)}>
                        {VERIFICATION_LABELS[row.status] ?? row.status}
                      </Pill>
                      {row.publishedAt ? <Pill tone="success">Published</Pill> : null}
                      {row.qualityFlags.map((flag) => (
                        <Pill key={flag} tone="warning">
                          {flag.replace(/_/g, ' ')}
                        </Pill>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      Collected {formatDateTime(row.collectedAt)} by {row.agentName}
                      {row.submittedAt ? ` · submitted ${formatDateTime(row.submittedAt)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-ink-950">
                      {row.amount === null ? '—' : formatMoney(row.amount)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {row.unitName ?? 'unit not recorded'} · {row.priceType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {row.notes ? (
                  <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    <span className="font-semibold text-ink-700">Agent note:</span> {row.notes}
                  </p>
                ) : null}

                <div className="mt-3">
                  <VerificationActions
                    observationId={row.id}
                    status={row.status}
                    canPublish={Boolean(row.publishedAt)}
                  />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
