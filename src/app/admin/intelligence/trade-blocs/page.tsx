/**
 * Admin Intelligence — Trade Blocs Management
 *
 * Browse trade agreements and economic communities, view memberships,
 * and track preferential trade arrangements. Supports Phase 07
 * Global Trade Intelligence by surfacing the trade bloc context
 * for market access decisions.
 */

import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { getTradeBlocs } from '@/lib/trade/geographic';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Trade Blocs — Agreements',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const BLOC_TYPE_LABELS: Record<string, string> = {
  free_trade_area: 'Free Trade Area',
  customs_union: 'Customs Union',
  common_market: 'Common Market',
  economic_union: 'Economic Union',
};

const BLOC_TYPE_TONES: Record<string, 'success' | 'info' | 'brand' | 'neutral'> = {
  free_trade_area: 'success',
  customs_union: 'info',
  common_market: 'brand',
  economic_union: 'neutral',
};

export default async function TradeBlocsManagementPage() {
  await requireStaff('/admin/intelligence/trade-blocs');

  const blocs = await getTradeBlocs();

  return (
    <>
      <PageHeader
        title="Trade Blocs"
        description={`${blocs.length} active trade agreements and economic communities. These define preferential market access rules for Phase 07 trade intelligence.`}
        breadcrumbs={[
          { label: 'Intelligence', href: '/admin/intelligence' },
          { label: 'Trade Blocs' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {blocs.map((bloc) => (
          <Panel
            key={bloc.id}
            title={bloc.name}
            actions={
              <Pill
                tone={BLOC_TYPE_TONES[bloc.bloc_type ?? ''] ?? 'neutral'}
              >
                {BLOC_TYPE_LABELS[bloc.bloc_type ?? ''] ?? bloc.bloc_type ?? 'Unknown'}
              </Pill>
            }
          >
            {bloc.description && (
              <p className="text-sm text-neutral-600 line-clamp-2">
                {bloc.description}
              </p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-neutral-500">Code</dt>
                <dd className="font-mono font-medium">{bloc.code}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Members</dt>
                <dd className="font-medium">{bloc.member_count} countries</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Established</dt>
                <dd className="font-medium">
                  {bloc.established_date
                    ? new Date(bloc.established_date).getFullYear()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-neutral-500">Website</dt>
                <dd className="font-medium">
                  {bloc.website ? (
                    <a
                      href={bloc.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      External link →
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
              <span>Status:</span>
              <Pill tone={bloc.is_active ? 'success' : 'neutral'}>
                {bloc.is_active ? 'Active' : 'Inactive'}
              </Pill>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
