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
} from 'recharts';

interface SupplyDemandData {
  year: number;
  domestic_production_mt: number | null;
  imports_mt: number | null;
  beginning_stocks_mt: number | null;
  total_supply_mt: number | null;
  food_consumption_mt: number | null;
  industrial_use_mt: number | null;
  exports_mt: number | null;
  ending_stocks_mt: number | null;
  total_domestic_mt: number | null;
  total_demand_mt: number | null;
  supply_demand_balance_percent: number | null;
  stock_to_use_percent: number | null;
  self_sufficiency_percent: number | null;
}

interface SupplyDemandChartProps {
  data: SupplyDemandData[];
}

export function SupplyDemandChart({ data }: SupplyDemandChartProps) {
  // Format data for chart
  const chartData = data.map(d => ({
    year: d.year,
    supply: d.total_supply_mt || 0,
    demand: d.total_demand_mt || 0,
    production: d.domestic_production_mt || 0,
    imports: d.imports_mt || 0,
    exports: d.exports_mt || 0,
    stocks: d.ending_stocks_mt || 0,
  }));

  const formatMT = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  // Calculate latest metrics
  const latest = data[data.length - 1];
  const selfSufficiency = latest?.self_sufficiency_percent;
  const stockToUse = latest?.stock_to_use_percent;
  const balance = latest?.supply_demand_balance_percent;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900">Supply vs Demand</h3>
        <p className="text-sm text-neutral-600">Annual balance showing total supply and demand</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
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
            formatter={(value: any) => [formatMT(Number(value)), undefined]}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="supply"
            fill="#3b82f6"
            name="Total Supply"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="demand"
            fill="#ef4444"
            name="Total Demand"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Supply Components */}
      <div className="mt-8">
        <h4 className="text-md font-semibold text-neutral-900 mb-3">Supply Components</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
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
              formatter={(value: any) => [formatMT(Number(value)), undefined]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Bar dataKey="production" stackId="supply" fill="#3b82f6" name="Domestic Production" />
            <Bar dataKey="imports" stackId="supply" fill="#60a5fa" name="Imports" />
            <Bar dataKey="stocks" stackId="supply" fill="#93c5fd" name="Beginning Stocks" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Demand Components */}
      <div className="mt-8">
        <h4 className="text-md font-semibold text-neutral-900 mb-3">Demand Components</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
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
              formatter={(value: any) => [formatMT(Number(value)), undefined]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Legend />
            <Bar dataKey="demand" stackId="demand" fill="#ef4444" name="Total Demand" />
            <Bar dataKey="exports" stackId="demand" fill="#f87171" name="Exports" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics */}
      {latest && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {selfSufficiency !== null && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="text-sm text-neutral-600 mb-1">Self-Sufficiency</div>
              <div className="text-2xl font-bold text-neutral-900">
                {selfSufficiency.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {selfSufficiency >= 100 ? 'Net exporter' : 'Import dependent'}
              </div>
            </div>
          )}
          {stockToUse !== null && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="text-sm text-neutral-600 mb-1">Stock-to-Use Ratio</div>
              <div className="text-2xl font-bold text-neutral-900">
                {stockToUse.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {stockToUse >= 20 ? 'Comfortable' : stockToUse >= 10 ? 'Adequate' : 'Tight'}
              </div>
            </div>
          )}
          {balance !== null && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="text-sm text-neutral-600 mb-1">Supply-Demand Balance</div>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {balance >= 0 ? '+' : ''}{balance.toFixed(1)}%
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {balance >= 0 ? 'Surplus' : 'Deficit'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
