'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TradeData {
  year: number;
  flow_type: 'import' | 'export';
  total_quantity_mt: number | null;
  total_value_usd: number | null;
  partner_count: number;
  partner_details: Array<{
    partner: string;
    quantity_mt: number;
    value_usd: number;
  }> | null;
}

interface TradeFlowChartProps {
  data: TradeData[];
  commodityName: string;
}

export function TradeFlowChart({ data, commodityName }: TradeFlowChartProps) {
  // Separate imports and exports
  const imports = data.filter(d => d.flow_type === 'import');
  const exports = data.filter(d => d.flow_type === 'export');

  // Format data for net trade chart
  const netTradeData = Array.from(new Set(data.map(d => d.year))).sort().map(year => {
    const importData = imports.find(d => d.year === year);
    const exportData = exports.find(d => d.year === year);
    return {
      year,
      imports: importData?.total_quantity_mt || 0,
      exports: exportData?.total_quantity_mt || 0,
      net: (exportData?.total_quantity_mt || 0) - (importData?.total_quantity_mt || 0),
    };
  });

  const formatMT = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const formatUSD = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Get latest data
  const latestYear = Math.max(...data.map(d => d.year));
  const latestImports = imports.find(d => d.year === latestYear);
  const latestExports = exports.find(d => d.year === latestYear);

  // Get top partners
  const topImportPartners = latestImports?.partner_details?.slice(0, 5) || [];
  const topExportPartners = latestExports?.partner_details?.slice(0, 5) || [];

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900">Trade Flows</h3>
        <p className="text-sm text-neutral-600">
          Import and export volumes for {commodityName} in Nigeria
        </p>
      </div>

      {/* Net Trade Chart */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-neutral-900 mb-3">Imports vs Exports</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={netTradeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatMT}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              formatter={(value: any, name?: any) => [formatMT(Number(value)), name || '']}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Bar dataKey="exports" fill="#10b981" name="Exports" radius={[4, 4, 0, 0]} />
            <Bar dataKey="imports" fill="#f59e0b" name="Imports" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Trade Balance */}
      <div className="mb-8">
        <h4 className="text-md font-semibold text-neutral-900 mb-3">Net Trade Balance</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={netTradeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              tickFormatter={formatMT}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              formatter={(value: any) => [formatMT(Number(value)), 'Net Trade']}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Bar dataKey="net" name="Net Trade" radius={[4, 4, 0, 0]}>
              {netTradeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-neutral-500 mt-2">
          Positive values indicate net exports, negative values indicate net imports
        </p>
      </div>

      {/* Top Trading Partners */}
      {(topImportPartners.length > 0 || topExportPartners.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Import Partners */}
          {topImportPartners.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-neutral-900 mb-3">
                Top Import Partners ({latestYear})
              </h4>
              <div className="space-y-2">
                {topImportPartners.map((partner, index) => {
                  const maxQuantity = Math.max(...topImportPartners.map(p => p.quantity_mt));
                  const percentage = (partner.quantity_mt / maxQuantity) * 100;
                  return (
                    <div key={index} className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-neutral-700">
                          {partner.partner}
                        </span>
                        <span className="text-sm text-neutral-600">
                          {formatMT(partner.quantity_mt)} MT
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {partner.value_usd && (
                        <div className="text-xs text-neutral-500 mt-1">
                          {formatUSD(partner.value_usd)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Export Partners */}
          {topExportPartners.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-neutral-900 mb-3">
                Top Export Partners ({latestYear})
              </h4>
              <div className="space-y-2">
                {topExportPartners.map((partner, index) => {
                  const maxQuantity = Math.max(...topExportPartners.map(p => p.quantity_mt));
                  const percentage = (partner.quantity_mt / maxQuantity) * 100;
                  return (
                    <div key={index} className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-neutral-700">
                          {partner.partner}
                        </span>
                        <span className="text-sm text-neutral-600">
                          {formatMT(partner.quantity_mt)} MT
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {partner.value_usd && (
                        <div className="text-xs text-neutral-500 mt-1">
                          {formatUSD(partner.value_usd)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {(latestImports || latestExports) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {latestExports && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-700 mb-1">Total Exports ({latestYear})</div>
              <div className="text-2xl font-bold text-green-900">
                {formatMT(latestExports.total_quantity_mt || 0)} MT
              </div>
              {latestExports.total_value_usd && (
                <div className="text-sm text-green-700 mt-1">
                  {formatUSD(latestExports.total_value_usd)}
                </div>
              )}
              <div className="text-xs text-green-600 mt-1">
                {latestExports.partner_count} partner countries
              </div>
            </div>
          )}
          {latestImports && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-sm text-amber-700 mb-1">Total Imports ({latestYear})</div>
              <div className="text-2xl font-bold text-amber-900">
                {formatMT(latestImports.total_quantity_mt || 0)} MT
              </div>
              {latestImports.total_value_usd && (
                <div className="text-sm text-amber-700 mt-1">
                  {formatUSD(latestImports.total_value_usd)}
                </div>
              )}
              <div className="text-xs text-amber-600 mt-1">
                {latestImports.partner_count} partner countries
              </div>
            </div>
          )}
          {latestImports && latestExports && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700 mb-1">Trade Balance ({latestYear})</div>
              <div className={`text-2xl font-bold ${
                (latestExports.total_quantity_mt || 0) >= (latestImports.total_quantity_mt || 0)
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}>
                {formatMT(
                  (latestExports.total_quantity_mt || 0) - (latestImports.total_quantity_mt || 0)
                )} MT
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {(latestExports.total_quantity_mt || 0) >= (latestImports.total_quantity_mt || 0)
                  ? 'Net exporter'
                  : 'Net importer'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
          <p className="text-neutral-500">No trade data available for this commodity.</p>
        </div>
      )}
    </div>
  );
}
