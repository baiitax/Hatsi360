import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { getTradeDataStats } from '@/lib/trade/flows';
import { getTradeDataSources, getRecentSyncLogs } from '@/lib/trade/ingestion/pipeline';

export default async function TradeDataAdminPage() {
  const supabase = await createClient();

  // Get data sources and recent sync logs
  const sources = await getTradeDataSources();
  const syncLogs = await getRecentSyncLogs(undefined, 20);

  // Get overall trade data stats
  const stats = await getTradeDataStats({});

  return (
    <>
      <PageHeader
        title="Trade Data"
        lede="International trade records, data sources, and sync status"
      />

      {/* Quick Link to Trade Intelligence */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Link
          href="/admin/intelligence/trade-intelligence"
          className="text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          📊 View Global Trade Intelligence Dashboard →
        </Link>
        <p className="mt-1 text-xs text-blue-600">
          Interactive analytics, partner profiles, and commodity breakdowns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Total Records</p>
          <p className="text-2xl font-bold text-neutral-900">{stats.total_records.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Data Sources</p>
          <p className="text-2xl font-bold text-neutral-900">{sources.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Year Range</p>
          <p className="text-2xl font-bold text-neutral-900">
            {stats.year_range.min > 0 ? `${stats.year_range.min}–${stats.year_range.max}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Validated</p>
          <p className="text-2xl font-bold text-neutral-900">
            {stats.validation_status.validated?.toLocaleString() ?? '0'}
          </p>
        </div>
      </div>

      {/* Data Sources */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source) => (
            <div key={source.id} className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-neutral-900">{source.evidence_source?.name ?? source.source_type}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${source.is_active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-500'}`}>
                  {source.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-neutral-500 mb-2">{source.source_type}</p>
              {source.api_base_url && (
                <p className="text-xs text-neutral-400 truncate">{source.api_base_url}</p>
              )}
              {source.last_sync_at && (
                <div className="mt-3 text-xs text-neutral-500">
                  <span className="font-medium">Last sync:</span>{' '}
                  {new Date(source.last_sync_at).toLocaleString()} — {source.last_sync_records.toLocaleString()} records
                  {source.last_sync_status && (
                    <span className={`ml-2 ${source.last_sync_status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      ({source.last_sync_status})
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent Sync Logs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Sync Activity</h2>
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Started</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Fetched</th>
                <th className="px-4 py-3 text-right">Inserted</th>
                <th className="px-4 py-3 text-right">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">{log.trade_data_source_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">{log.sync_type}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' :
                      log.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      log.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{log.records_fetched.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">{log.records_inserted.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">{log.records_rejected_invalid.toLocaleString()}</td>
                </tr>
              ))}
              {syncLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    No sync activity yet. Trigger a sync to begin importing trade data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Commodities & Partners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Top Commodities</h2>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            {stats.top_commodities.length > 0 ? (
              <ul className="space-y-2">
                {stats.top_commodities.map((c, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-neutral-700">{c.name}</span>
                    <span className="font-mono text-neutral-500">{c.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-400">No trade data yet.</p>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-4">Top Partners</h2>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            {stats.top_partners.length > 0 ? (
              <ul className="space-y-2">
                {stats.top_partners.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-neutral-700">{p.name}</span>
                    <span className="font-mono text-neutral-500">{p.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-400">No trade data yet.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
