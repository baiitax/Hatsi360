'use client';

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PriceSeriesPoint } from '@/types/domain';
import { CHART_COLOURS } from '@/lib/chart-colours';

export interface ChartSeries {
  key: string;
  label: string;
  points: PriceSeriesPoint[];
  color: string;
}

/**
 * Historical price chart.
 *
 * The shaded band is the observed range (min–max) for each day and the line is
 * the median. The band is deliberately visible so a single day with one report
 * does not look like a settled market price.
 */
export function HistoricalPriceChart({
  series,
  currencySymbol = '₦',
  height = 320,
}: {
  series: ChartSeries[];
  currencySymbol?: string;
  height?: number;
}) {
  if (series.length === 0) return null;

  const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();

  const data = dates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    for (const s of series) {
      const point = s.points.find((p) => p.date === date);
      row[`${s.key}_median`] = point?.median ?? null;
      row[`${s.key}_min`] = point?.min ?? null;
      row[`${s.key}_max`] = point?.max ?? null;
      row[`${s.key}_n`] = point?.observations ?? 0;
    }
    return row;
  });

  const tooltipLabel = (label: unknown): string => {
    const text = String(label ?? '');
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime())
      ? text
      : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            {series.map((s) => (
              <linearGradient id={`fill-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOURS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => {
              const parsed = new Date(v);
              return Number.isNaN(parsed.getTime())
                ? v
                : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            }}
            tick={{ fontSize: 11, fill: CHART_COLOURS.axis }}
            axisLine={{ stroke: CHART_COLOURS.grid }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: CHART_COLOURS.axis }}
            axisLine={false}
            tickLine={false}
            width={72}
            tickFormatter={(v: number) =>
              `${currencySymbol}${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`
            }
          />
          <Tooltip
            labelFormatter={(label) => tooltipLabel(label)}
            formatter={(value, name) => {
              const key = String(name).split('_')[0];
              const seriesEntry = series.find((s) => s.key === key);
              const suffix = String(name).endsWith('_median')
                ? 'median'
                : String(name).endsWith('_min')
                  ? 'min'
                  : String(name).endsWith('_max')
                    ? 'max'
                    : '';
              const numeric = typeof value === 'number' ? value : Number(value);
              const unit = seriesEntry?.label ? ` · ${seriesEntry.label}` : '';
              return [
                `${currencySymbol}${numeric.toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} (${suffix}${unit})`,
                String(name),
              ];
            }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${CHART_COLOURS.grid}`,
              fontSize: 12,
              boxShadow: '0 8px 24px -12px rgb(18 59 42 / 0.25)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {series.length === 1 ? (
            <>
              <Area
                type="monotone"
                dataKey={`${series[0]!.key}_max`}
                stroke="none"
                fill={`url(#fill-${series[0]!.key})`}
                name="Observed range"
                legendType="none"
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey={`${series[0]!.key}_min`}
                stroke="none"
                fill={CHART_COLOURS.surface}
                fillOpacity={0.72}
                name="Range floor"
                legendType="none"
                activeDot={false}
              />
              <Line
                type="monotone"
                dataKey={`${series[0]!.key}_median`}
                stroke={series[0]!.color}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: series[0]!.color }}
                activeDot={{ r: 5 }}
                name={series[0]!.label}
              />
            </>
          ) : (
            series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={`${s.key}_median`}
                stroke={s.color}
                strokeWidth={2.25}
                dot={{ r: 2.5, strokeWidth: 0, fill: s.color }}
                activeDot={{ r: 5 }}
                name={s.label}
              />
            ))
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * The historical price chart.
 *
 * Named for the catalogue in the design system; `PriceChart` remains as an
 * alias so existing imports keep working.
 */
export const PriceChart = HistoricalPriceChart;

/** A compact bar chart of observation counts per day — shows data density. */
export function ObservationCountChart({
  series,
  height = 120,
}: {
  series: ChartSeries[];
  height?: number;
}) {
  if (series.length === 0) return null;
  const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const data = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      row[s.key] = s.points.find((p) => p.date === date)?.observations ?? 0;
    }
    return row;
  });

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOURS.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: CHART_COLOURS.axis }}
            axisLine={{ stroke: CHART_COLOURS.grid }}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 10, fill: CHART_COLOURS.axis }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(label) => String(label ?? '')}
            formatter={(value) => [`${value} observation${Number(value) === 1 ? '' : 's'}`]}
            contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_COLOURS.grid}`, fontSize: 12 }}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[3, 3, 0, 0]} name={s.label} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
