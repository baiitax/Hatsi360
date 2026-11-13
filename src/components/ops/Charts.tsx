'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLOURS } from '@/lib/chart-colours';

/**
 * Hatsi360 — the operational charts.
 *
 * The charts are thin wrappers over Recharts. They are given data that has
 * already been computed on the server from the database, and they show an
 * honest empty state when there is nothing to plot — never a flat line that
 * looks like real activity.
 */

export interface TrendPoint {
  label: string;
  submitted: number;
  approved: number;
  published: number;
  expected: number;
}

export function CollectionTrendChart({
  data,
  height = 260,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 text-center">
        <p className="text-sm font-semibold text-ink-700">No collection activity yet</p>
        <p className="mt-1 max-w-sm text-xs text-ink-500">
          The chart appears once prices have been collected and submitted in the selected period.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="submittedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLOURS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLOURS.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOURS.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLOURS.axis }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLOURS.axis }} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_COLOURS.grid}` }}
            labelStyle={{ color: CHART_COLOURS.tooltipText, fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="submitted"
            name="Submitted"
            stroke={CHART_COLOURS.primary}
            fill="url(#submittedFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="approved"
            name="Approved"
            stroke={CHART_COLOURS.primaryDeep}
            fill="none"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="published"
            name="Published"
            stroke={CHART_COLOURS.positive}
            fill="none"
            strokeDasharray="4 3"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface CoverageBarDatum {
  label: string;
  value: number;
  expected?: number;
}

export function CoverageBarChart({
  data,
  height = 260,
}: {
  data: CoverageBarDatum[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 text-center"
        style={{ height }}
      >
        <p className="text-sm font-semibold text-ink-700">No scheduled markets</p>
        <p className="mt-1 max-w-sm text-xs text-ink-500">
          Coverage is measured against the collection plan. Add a schedule to start measuring.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOURS.grid} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLOURS.axis }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLOURS.axis }} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_COLOURS.grid}` }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" name="Collected" fill={CHART_COLOURS.primary} radius={[4, 4, 0, 0]} />
          {data.some((d) => d.expected !== undefined) ? (
            <Bar dataKey="expected" name="Expected" fill={CHART_COLOURS.grid} radius={[4, 4, 0, 0]} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface OutcomeBarDatum {
  label: string;
  value: number;
}

const OUTCOME_COLOURS = [
  CHART_COLOURS.primary,
  CHART_COLOURS.primaryDeep,
  CHART_COLOURS.positive,
  CHART_COLOURS.warning,
  CHART_COLOURS.negative,
  CHART_COLOURS.axis,
];

export function OutcomeBarChart({
  data,
  height = 220,
}: {
  data: OutcomeBarDatum[];
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 text-center"
        style={{ height }}
      >
        <p className="text-sm font-semibold text-ink-700">Nothing to summarise</p>
        <p className="mt-1 max-w-sm text-xs text-ink-500">
          No submissions have been recorded in this period.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLOURS.grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLOURS.axis }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: CHART_COLOURS.axisStrong }}
            width={110}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_COLOURS.grid}` }}
          />
          <Bar dataKey="value" name="Records" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={OUTCOME_COLOURS[index % OUTCOME_COLOURS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
