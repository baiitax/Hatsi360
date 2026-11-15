'use client';

import { IconTrendingUp } from '@/components/ui/icons';

interface PriceObservation {
  observed_on: string;
  median_price: number | null;
}

interface DashboardPriceChartProps {
  observations: PriceObservation[];
}

export function DashboardPriceChart({ observations }: DashboardPriceChartProps) {
  if (observations.length === 0) {
    return (
      <div className="text-center py-12">
        <IconTrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No price data available for the last 30 days</p>
      </div>
    );
  }

  // Extract valid observations
  const validData = observations.filter(o => o.median_price !== null);
  
  if (validData.length === 0) {
    return (
      <div className="text-center py-12">
        <IconTrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No price data available for the last 30 days</p>
      </div>
    );
  }

  // Calculate chart dimensions
  const width = 100; // percentage
  const height = 200; // pixels
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  
  // Get price range
  const prices = validData.map(d => d.median_price as number);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 1;
  
  // Calculate points
  const chartWidth = 100 - (padding.left + padding.right) / 10; // approximate
  const chartHeight = height - padding.top - padding.bottom;
  
  const points = validData.map((d, i) => {
    const x = (i / (validData.length - 1)) * 100;
    const y = 100 - (((d.median_price as number) - minPrice) / priceRange) * 100;
    return { x, y, price: d.median_price as number, date: d.observed_on };
  });

  // Create SVG path
  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    return `L ${p.x} ${p.y}`;
  }).join(' ');

  // Create area path
  const areaD = `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

  // Format dates for x-axis labels
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  // Calculate price change
  const firstPrice = points[0]?.price || 0;
  const lastPrice = points[points.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div>
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Latest Median</p>
          <p className="text-2xl font-bold text-gray-900">
            ₦{lastPrice.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">30-Day Change</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-[#1D805A]' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{priceChangePercent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Range</p>
          <p className="text-2xl font-bold text-gray-900">
            ₦{minPrice.toLocaleString()} - ₦{maxPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 100 100`} preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.2"
              strokeDasharray="1,1"
            />
          ))}

          {/* Area fill */}
          <path
            d={areaD}
            fill="url(#areaGradient)"
            opacity="0.3"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#1D805A"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1D805A" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1D805A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="0.8"
              fill="#1D805A"
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
          {validData.filter((_, i) => i % Math.ceil(validData.length / 5) === 0 || i === validData.length - 1).map((d, i) => (
            <span key={i}>{formatDate(d.observed_on)}</span>
          ))}
        </div>
      </div>

      {/* Y-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>₦{minPrice.toLocaleString()}</span>
        <span>₦{((minPrice + maxPrice) / 2).toLocaleString()}</span>
        <span>₦{maxPrice.toLocaleString()}</span>
      </div>
    </div>
  );
}
