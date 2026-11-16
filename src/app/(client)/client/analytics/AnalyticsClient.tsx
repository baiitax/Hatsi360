'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  BarChart3,
  LineChartIcon,
  AreaChart as AreaChartIcon,
  Download,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Commodity {
  id: number;
  name: string;
  slug: string;
  category?: string;
}

interface Market {
  id: number;
  name: string;
  slug: string;
  state?: string;
}

interface Observation {
  observed_on: string;
  median_price: number | null;
  min_price: number | null;
  max_price: number | null;
  observation_count: number | null;
  commodity_id: number;
  market_id: number;
  commodities?: { name: string; slug: string };
  markets?: { name: string; slug: string };
}

interface AnalyticsClientProps {
  commodities: Commodity[];
  markets: Market[];
  observations: Observation[];
}

type DateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';
type ChartType = 'line' | 'bar' | 'area';

// ─── Component ─────────────────────────────────────────────────────────────

export function AnalyticsClient({ commodities, markets, observations }: AnalyticsClientProps) {
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('90d');
  const [chartType, setChartType] = useState<ChartType>('line');

  // Filter observations
  const filteredObservations = useMemo(() => {
    let filtered = observations;

    if (selectedCommodity) {
      filtered = filtered.filter((o) => o.commodity_id === selectedCommodity);
    }
    if (selectedMarket) {
      filtered = filtered.filter((o) => o.market_id === selectedMarket);
    }

    // Date range filter
    const now = new Date();
    let cutoff: Date | null = null;
    switch (dateRange) {
      case '7d':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        cutoff = null;
        break;
    }

    if (cutoff) {
      filtered = filtered.filter((o) => new Date(o.observed_on) >= cutoff);
    }

    return filtered;
  }, [observations, selectedCommodity, selectedMarket, dateRange]);

  // Prepare chart data (aggregate by date)
  const chartData = useMemo(() => {
    const byDate = new Map<string, { prices: number[]; date: string }>();
    
    filteredObservations.forEach((o) => {
      if (o.median_price === null) return;
      const date = o.observed_on;
      if (!byDate.has(date)) {
        byDate.set(date, { prices: [], date });
      }
      byDate.get(date)!.prices.push(o.median_price);
    });

    return Array.from(byDate.values())
      .map(({ prices, date }) => ({
        date,
        price: prices.reduce((a, b) => a + b, 0) / prices.length,
        min: Math.min(...prices),
        max: Math.max(...prices),
        count: prices.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredObservations]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { current: 0, change: 0, changePercent: 0, min: 0, max: 0, avg: 0, isPositive: true };
    }

    const prices = chartData.map((d) => d.price);
    const current = prices[prices.length - 1];
    const first = prices[0];
    const change = current - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    return { current, change, changePercent, min, max, avg, isPositive: change >= 0 };
  }, [chartData]);

  // Get unique commodities in filtered data
  const availableCommodities = useMemo(() => {
    const ids = new Set(observations.map((o) => o.commodity_id));
    return commodities.filter((c) => ids.has(c.id));
  }, [observations, commodities]);

  // Get unique markets in filtered data
  const availableMarkets = useMemo(() => {
    const ids = new Set(observations.map((o) => o.market_id));
    return markets.filter((m) => ids.has(m.id));
  }, [observations, markets]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">Price Analytics</h1>
        <p className="text-sm text-[#64736B] mt-1">
          Explore historical price data and market trends
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Current Price</p>
          <p className="text-xl font-bold text-[#17241F]">
            {stats.current > 0 ? `₦${stats.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
          {stats.change !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${stats.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stats.isPositive ? '+' : ''}{stats.changePercent.toFixed(1)}%
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Period Low</p>
          <p className="text-xl font-bold text-[#17241F]">
            {stats.min > 0 ? `₦${stats.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Period High</p>
          <p className="text-xl font-bold text-[#17241F]">
            {stats.max > 0 ? `₦${stats.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Average</p>
          <p className="text-xl font-bold text-[#17241F]">
            {stats.avg > 0 ? `₦${stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Commodity selector */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Commodity</label>
            <select
              value={selectedCommodity || ''}
              onChange={(e) => setSelectedCommodity(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            >
              <option value="">All Commodities</option>
              {availableCommodities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Market selector */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Market</label>
            <select
              value={selectedMarket || ''}
              onChange={(e) => setSelectedMarket(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            >
              <option value="">All Markets</option>
              {availableMarkets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Date Range</label>
            <div className="flex gap-1">
              {(['7d', '30d', '90d', '6m', '1y', 'all'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`flex-1 h-9 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-[#1D805A] text-white'
                      : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE] hover:text-[#103C2D]'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Chart type */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Chart Type</label>
            <div className="flex gap-1">
              <button
                onClick={() => setChartType('line')}
                className={`flex-1 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  chartType === 'line' ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
                }`}
                title="Line chart"
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`flex-1 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  chartType === 'bar' ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
                }`}
                title="Bar chart"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`flex-1 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  chartType === 'area' ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
                }`}
                title="Area chart"
              >
                <AreaChartIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-[#E3EAE5] p-5">
        <h2 className="text-sm font-semibold text-[#17241F] mb-4">Price History</h2>
        
        {chartData.length > 0 ? (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64736B' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64736B' }}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E3EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, 'Median Price']}
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#1D805A"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#1D805A' }}
                  />
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64736B' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64736B' }}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E3EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, 'Median Price']}
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <Bar dataKey="price" fill="#1D805A" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64736B' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64736B' }}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E3EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, 'Median Price']}
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D805A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1D805A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#1D805A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-[#64736B] text-sm">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
              <p className="font-medium">No data available</p>
              <p className="text-xs mt-1">Try adjusting your filters or date range</p>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-[#E3EAE5] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#17241F]">Price Data</h2>
          <span className="text-xs text-[#64736B]">{chartData.length} data points</span>
        </div>

        {chartData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E3EAE5]">
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Date</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Median Price</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Min</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Max</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2">Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE5]/50">
                {chartData.slice().reverse().slice(0, 20).map((row, i) => (
                  <tr key={i} className="hover:bg-[#F7F9F7] transition-colors">
                    <td className="py-2.5 pr-4 text-sm text-[#17241F]">
                      {new Date(row.date).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5 pr-4 text-sm font-semibold text-[#17241F] text-right">
                      ₦{row.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-[#64736B] text-right">
                      ₦{row.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-[#64736B] text-right">
                      ₦{row.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 text-sm text-[#64736B] text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-[#64736B] text-xs text-center">
            No data available for the selected filters
          </div>
        )}
      </div>
    </div>
  );
}
