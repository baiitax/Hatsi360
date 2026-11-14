import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { queryTariffs, getTariffStats } from '@/lib/trade/tariffs';

export default async function TariffsAdminPage() {
  const supabase = await createClient();

  // Get tariff stats for Nigeria (default focus)
  const nigeriaStats = await getTariffStats({ countryCode: 'NG' }).catch(() => null);

  // Get sample tariffs
  const sampleTariffs = await queryTariffs({
    country_code: 'NG',
    is_current: true,
    limit: 50,
  }).catch(() => []);

  return (
    <>
      <PageHeader
        title="Tariffs"
        lede="Tariff schedules — MFN, bound, preferential, and applied rates"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Total Lines</p>
          <p className="text-2xl font-bold text-neutral-900">
            {nigeriaStats?.total_tariff_lines.toLocaleString() ?? '0'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Avg MFN Rate</p>
          <p className="text-2xl font-bold text-neutral-900">
            {nigeriaStats ? `${nigeriaStats.avg_mfn_rate.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Zero-Tariff Lines</p>
          <p className="text-2xl font-bold text-neutral-900">
            {nigeriaStats?.zero_tariff_lines.toLocaleString() ?? '0'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Preferential Agreements</p>
          <p className="text-2xl font-bold text-neutral-900">
            {nigeriaStats?.preferential_agreements.toLocaleString() ?? '0'}
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">About Tariff Data</h3>
        <p className="text-sm text-blue-800">
          This module displays tariff schedules from WTO I-TIP, MAcMAP, and national customs authorities.
          Tariff types include: <strong>MFN</strong> (Most-Favored-Nation, the WTO baseline rate),{' '}
          <strong>Bound</strong> (maximum committed rate), <strong>Applied</strong> (actually charged at customs),
          and <strong>Preferential</strong> (reduced rates under trade agreements).
        </p>
        <p className="text-sm text-blue-800 mt-2">
          Tariff data ingestion is configured but requires initial data import from authorized sources.
        </p>
      </div>

      {/* Sample Tariff Table */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Nigeria Tariff Schedule (Sample)</h2>
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left">HS Code</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Rate Type</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-left">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sampleTariffs.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono">{t.hs_code}</td>
                  <td className="px-4 py-3 text-neutral-700 max-w-xs truncate">{t.hs_description}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.tariff_type === 'mfn' ? 'bg-blue-100 text-blue-800' :
                      t.tariff_type === 'bound' ? 'bg-purple-100 text-purple-800' :
                      t.tariff_type === 'preferential' ? 'bg-green-100 text-green-800' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {t.tariff_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{t.rate_type}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {t.rate_value !== null ? t.rate_value.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{t.rate_unit}</td>
                </tr>
              ))}
              {sampleTariffs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No tariff data imported yet. Tariff schedules will appear here once data is ingested from WTO I-TIP or MAcMAP.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
