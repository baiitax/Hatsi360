'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProductionTrend {
  year: number;
  production_quantity_mt: number;
  yield_mt_per_ha: number;
  harvested_area_ha: number;
  yoy_change_percent: number | null;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
}

interface ProductionChartProps {
  data: ProductionTrend[];
}

export function ProductionChart({ data }: ProductionChartProps) {
  // Format data for display
  const chartData = data.map(d => ({
    year: d.year,
    production: d.production_quantity_mt,
    yield: d.yield_mt_per_ha,
    area: d.harvested_area_ha,
    trend: d.trend_direction,
  }));

  const formatMT = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Production Volume</h3>
        <p className="text-sm text-neutral-600">Annual production in metric tonnes</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
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
            formatter={(value: any) => [formatMT(Number(value)), 'Production']}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="production"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Production (MT)"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Yield and Area Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-semibold text-neutral-900 mb-3">Yield Trend</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
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
                tickFormatter={(v) => `${v.toFixed(1)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: any) => [`${Number(value).toFixed(2)} MT/ha`, 'Yield']}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="yield"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                name="Yield (MT/ha)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-md font-semibold text-neutral-900 mb-3">Harvested Area</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
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
                formatter={(value: any) => [formatMT(Number(value)), 'Area']}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="area"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
                name="Area (ha)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Indicator */}
      {chartData.length > 0 && (
        <div className="mt-6 flex items-center gap-2 text-sm">
          <span className="text-neutral-600">Recent trend:</span>
          {chartData[chartData.length - 1].trend === 'increasing' && (
            <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Increasing
            </span>
          )}
          {chartData[chartData.length - 1].trend === 'decreasing' && (
            <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Decreasing
            </span>
          )}
          {chartData[chartData.length - 1].trend === 'stable' && (
            <span className="inline-flex items-center gap-1 text-neutral-700 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Stable
            </span>
          )}
        </div>
      )}
    </div>
  );
}
