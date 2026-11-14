/**
 * Hatsi360 — Interactive Candlestick Chart.
 *
 * SVG-based OHLC candlestick chart with:
 *  - Green/red candles (close > open = green, close < open = red)
 *  - Volume bars at bottom
 *  - Grid lines and axis labels
 *  - Crosshair + tooltip on hover
 *  - Responsive sizing
 *  - Degenerate candle indication
 */

'use client';

import { useState, useRef, useCallback, useMemo } from 'react';

export interface CandleData {
  periodStart: string;
  periodEnd: string;
  open: number;
  high: number;
  low: number;
  close: number;
  observationCount: number;
  marketCount: number;
  sourceCount: number;
  isDegenerate: boolean;
  isCalculated: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  candle: CandleData;
  index: number;
}

export function CandlestickChart({
  candles,
  currency = 'NGN',
  unit = 'unit',
  height = 320,
}: {
  candles: CandleData[];
  currency?: string;
  unit?: string;
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartWidth = 800;
  const padding = { top: 16, right: 60, bottom: 80, left: 70 };
  const volumeHeight = 50;
  const chartH = height - padding.top - padding.bottom - volumeHeight - 16;
  const chartW = chartWidth - padding.left - padding.right;

  const { candles: displayCandles, minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (candles.length === 0) {
      return { candles: [], minPrice: 0, maxPrice: 100, maxVolume: 1 };
    }

    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.observationCount > maxVol) maxVol = c.observationCount;
    }

    const range = max - min || 1;
    min = Math.floor(min - range * 0.05);
    max = Math.ceil(max + range * 0.05);

    return { candles, minPrice: min, maxPrice: max, maxVolume: Math.max(maxVol, 1) };
  }, [candles]);

  const candleWidth = Math.max(
    4,
    Math.min(20, (chartW / Math.max(displayCandles.length, 1)) * 0.7),
  );
  const candleSpacing = chartW / Math.max(displayCandles.length, 1);

  const formatPrice = useCallback(
    (amount: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount),
    [currency],
  );

  const formatDate = useCallback((iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
    });
  }, []);

  const formatFullDate = useCallback((iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const priceToY = useCallback(
    (price: number) => {
      const range = maxPrice - minPrice || 1;
      return padding.top + chartH - ((price - minPrice) / range) * chartH;
    },
    [maxPrice, minPrice, chartH],
  );

  const volumeToHeight = useCallback(
    (count: number) => {
      return (count / maxVolume) * volumeHeight;
    },
    [maxVolume],
  );

  if (displayCandles.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-16">
        <div className="text-center">
          <p className="text-[0.875rem] font-medium text-gray-600">No chart data available</p>
          <p className="mt-1 text-[0.75rem] text-gray-400">
            Candle data will appear once enough observations are collected.
          </p>
        </div>
      </div>
    );
  }

  // Generate Y-axis ticks
  const yTicks = Array.from({ length: 6 }, (_, i) => {
    const range = maxPrice - minPrice;
    return minPrice + (range * i) / 5;
  });

  // Generate X-axis labels (show ~6 dates)
  const xLabelStep = Math.max(1, Math.floor(displayCandles.length / 6));
  const xLabels = displayCandles
    .map((c, i) => ({ date: formatDate(c.periodStart), index: i }))
    .filter((_, i) => i % xLabelStep === 0 || i === displayCandles.length - 1);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = chartWidth / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;

      const candleIndex = Math.floor((mouseX - padding.left) / candleSpacing);
      if (candleIndex >= 0 && candleIndex < displayCandles.length) {
        const candleX = padding.left + candleIndex * candleSpacing + candleSpacing / 2;
        setCrosshairX(candleX);
        setTooltip({
          x: candleX,
          y: priceToY(displayCandles[candleIndex].close),
          candle: displayCandles[candleIndex],
          index: candleIndex,
        });
      } else {
        setCrosshairX(null);
        setTooltip(null);
      }
    },
    [displayCandles, candleSpacing, priceToY],
  );

  const handleMouseLeave = useCallback(() => {
    setCrosshairX(null);
    setTooltip(null);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full select-none"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = priceToY(tick);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fill="#6B7280"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatPrice(tick)}
              </text>
            </g>
          );
        })}

        {/* Volume bars */}
        {displayCandles.map((candle, i) => {
          const x = padding.left + i * candleSpacing + candleSpacing / 2 - candleWidth / 2;
          const barH = volumeToHeight(candle.observationCount);
          const y = padding.top + chartH + 16 + volumeHeight - barH;
          const isUp = candle.close >= candle.open;
          return (
            <rect
              key={`vol-${i}`}
              x={x}
              y={y}
              width={candleWidth}
              height={barH}
              fill={isUp ? '#4CAF50' : '#DC2626'}
              opacity={0.2}
            />
          );
        })}

        {/* Candles */}
        {displayCandles.map((candle, i) => {
          const x = padding.left + i * candleSpacing + candleSpacing / 2;
          const isUp = candle.close >= candle.open;
          const color = isUp ? '#1A6B40' : '#DC2626';
          const bodyTop = priceToY(Math.max(candle.open, candle.close));
          const bodyBottom = priceToY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
          const wickTop = priceToY(candle.high);
          const wickBottom = priceToY(candle.low);

          return (
            <g key={`candle-${i}`}>
              {/* Wick */}
              <line
                x1={x}
                y1={wickTop}
                x2={x}
                y2={wickBottom}
                stroke={color}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isUp ? 'white' : color}
                stroke={color}
                strokeWidth={1}
                rx={0.5}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ date, index }) => {
          const x = padding.left + index * candleSpacing + candleSpacing / 2;
          return (
            <text
              key={`xlabel-${index}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fill="#6B7280"
              fontSize="9"
            >
              {date}
            </text>
          );
        })}

        {/* Volume axis label */}
        <text
          x={padding.left}
          y={padding.top + chartH + 10}
          fill="#9CA3AF"
          fontSize="8"
          fontWeight="600"
        >
          OBS COUNT
        </text>

        {/* Crosshair */}
        {crosshairX !== null && (
          <>
            <line
              x1={crosshairX}
              y1={padding.top}
              x2={crosshairX}
              y2={padding.top + chartH + volumeHeight + 16}
              stroke="#0B3D2C"
              strokeWidth={0.5}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          </>
        )}

        {/* Tooltip dot */}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r={3} fill="#E5A020" stroke="white" strokeWidth={1.5} />
        )}
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${(tooltip.x / chartWidth) * 100}%`,
            top: `${((tooltip.y - 40) / height) * 100}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-[0.625rem] font-semibold text-gray-500">
            {formatFullDate(tooltip.candle.periodStart)}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.625rem]">
            <span className="text-gray-400">Open</span>
            <span className="figure-num font-medium text-[#0B3D2C]">{formatPrice(tooltip.candle.open)}</span>
            <span className="text-gray-400">High</span>
            <span className="figure-num font-medium text-[#1A6B40]">{formatPrice(tooltip.candle.high)}</span>
            <span className="text-gray-400">Low</span>
            <span className="figure-num font-medium text-red-600">{formatPrice(tooltip.candle.low)}</span>
            <span className="text-gray-400">Close</span>
            <span className="figure-num font-medium text-[#0B3D2C]">{formatPrice(tooltip.candle.close)}</span>
            <span className="text-gray-400">Obs</span>
            <span className="figure-num font-medium text-gray-700">{tooltip.candle.observationCount}</span>
          </div>
          {tooltip.candle.isDegenerate && (
            <div className="mt-1 rounded bg-gray-100 px-1.5 py-0.5 text-[0.5rem] text-gray-500">
              Single observation
            </div>
          )}
        </div>
      )}
    </div>
  );
}
