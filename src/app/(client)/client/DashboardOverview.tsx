'use client';

import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Bell,
  Star,
  BarChart3,
  FileText,
  ArrowRight,
  Activity,
  Eye,
  Clock,
  Package,
  MapPin,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DashboardData {
  savedCommoditiesCount: number;
  activeAlertsCount: number;
  unreadNotificationsCount: number;
  activeMarketsCount: number;
  savedMarkets: any[];
  recentPrices: any[];
  priceObservations: any[];
  alertActivity: any[];
  watchlist: any[];
  reports: any[];
  userName: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatPrice(price: number | null, currency: string = 'NGN'): string {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

// ─── Main Component ────────────────────────────────────────────────────────

export function DashboardOverview({ data }: { data: DashboardData }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Calculate price change from observations
  const observations = data.priceObservations.filter((o: any) => o.median_price !== null);
  const firstPrice = observations[0]?.median_price || 0;
  const lastPrice = observations[observations.length - 1]?.median_price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">
            {greeting}, {data.userName.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#64736B] mt-1">
            Here&apos;s your market intelligence snapshot for today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF4EE] text-[#103C2D] text-xs font-medium rounded-full">
            <Activity className="w-3 h-3" />
            {data.activeMarketsCount} Active Markets
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          icon={Star}
          label="Saved Commodities"
          value={data.savedCommoditiesCount}
          href="/client/watchlists"
          color="emerald"
        />
        <StatCard
          icon={Bell}
          label="Active Alerts"
          value={data.activeAlertsCount}
          href="/client/alerts"
          color="amber"
        />
        <StatCard
          icon={Eye}
          label="Unread Notifications"
          value={data.unreadNotificationsCount}
          href="/client/notifications"
          color="blue"
        />
        <StatCard
          icon={BarChart3}
          label="Active Markets"
          value={data.activeMarketsCount}
          href="/client/markets"
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Price Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E3EAE5] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#17241F]">Market Price Trend</h2>
              <p className="text-xs text-[#64736B] mt-0.5">Last 30 days — median prices</p>
            </div>
            {observations.length > 0 && (
              <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? '+' : ''}{priceChangePercent.toFixed(1)}%
              </div>
            )}
          </div>
          
          {observations.length > 0 ? (
            <PriceChart observations={observations} />
          ) : (
            <div className="h-48 flex items-center justify-center text-[#64736B] text-sm">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-[#E3EAE5] mx-auto mb-2" />
                <p>No price data available for the last 30 days</p>
              </div>
            </div>
          )}
        </div>

        {/* Market Activity */}
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#17241F]">Recent Activity</h2>
            <Link href="/client/notifications" className="text-xs text-[#1D805A] font-medium hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {data.alertActivity.length > 0 ? (
            <div className="space-y-3">
              {data.alertActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-[#F7F9F7] transition-colors">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-[#EAF4EE] flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5 text-[#1D805A]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#17241F] font-medium truncate">
                      {activity.commodities?.name || 'Commodity'} — {activity.markets?.name || 'Market'}
                    </p>
                    <p className="text-[11px] text-[#64736B] mt-0.5">
                      {activity.trigger_type === 'threshold' ? 'Threshold triggered' : 'Price alert'} · {timeAgo(activity.triggered_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-[#64736B] text-xs text-center">
              <div>
                <Clock className="w-6 h-6 text-[#E3EAE5] mx-auto mb-2" />
                <p>No recent activity</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Latest Prices */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E3EAE5] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#17241F]">Latest Market Prices</h2>
            <Link href="/prices" className="text-xs text-[#1D805A] font-medium hover:underline flex items-center gap-0.5">
              All prices <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data.recentPrices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E3EAE5]">
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Commodity</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Market</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2 pr-4">Price</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAE5]/50">
                  {data.recentPrices.map((price: any, i: number) => (
                    <tr key={i} className="hover:bg-[#F7F9F7] transition-colors">
                      <td className="py-2.5 pr-4">
                        <Link href={`/commodities/${price.commodity_slug}`} className="text-sm font-medium text-[#17241F] hover:text-[#1D805A]">
                          {price.commodity_name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-sm text-[#64736B]">{price.market_name}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className="text-sm font-semibold text-[#17241F]">
                          {formatPrice(price.median_price, price.price_currency)}
                        </span>
                        <span className="text-[10px] text-[#64736B] ml-1">/{price.price_unit}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs text-[#64736B]">{formatDate(price.observed_on)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-[#64736B] text-xs text-center">
              <div>
                <Package className="w-6 h-6 text-[#E3EAE5] mx-auto mb-2" />
                <p>No recent prices available</p>
              </div>
            </div>
          )}
        </div>

        {/* Watchlist Preview */}
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#17241F]">My Watchlist</h2>
            <Link href="/client/watchlists" className="text-xs text-[#1D805A] font-medium hover:underline flex items-center gap-0.5">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data.watchlist.length > 0 ? (
            <div className="space-y-2">
              {data.watchlist.map((item: any) => (
                <Link
                  key={item.id}
                  href={`/commodities/${item.commodities?.slug}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-[#F7F9F7] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EAF4EE] overflow-hidden flex-shrink-0">
                    {item.commodities?.image_url ? (
                      <img src={item.commodities.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-[#1D805A]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#17241F] truncate group-hover:text-[#1D805A] transition-colors">
                      {item.commodities?.name}
                    </p>
                    {item.commodities?.category && (
                      <p className="text-[10px] text-[#64736B] capitalize">{item.commodities.category}</p>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#64736B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-[#64736B] text-xs text-center">
              <div>
                <Star className="w-6 h-6 text-[#E3EAE5] mx-auto mb-2" />
                <p>No items in your watchlist</p>
                <Link href="/commodities" className="text-[#1D805A] hover:underline mt-1 inline-block">
                  Browse commodities
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Third Row: Reports + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Latest Reports */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E3EAE5] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#17241F]">Latest Research</h2>
            <Link href="/client/research" className="text-xs text-[#1D805A] font-medium hover:underline flex items-center gap-0.5">
              All reports <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data.reports.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.reports.map((report: any) => (
                <Link
                  key={report.id}
                  href={`/client/research/${report.slug}`}
                  className="p-3 rounded-lg border border-[#E3EAE5] hover:border-[#1D805A]/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-[#17241F] line-clamp-2 group-hover:text-[#1D805A] transition-colors">
                      {report.title}
                    </h3>
                    {report.is_premium && (
                      <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#C7A45A]/10 text-[#C7A45A] text-[9px] font-semibold rounded">
                        <Sparkles className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    )}
                  </div>
                  {report.summary && (
                    <p className="text-xs text-[#64736B] line-clamp-2 mb-2">{report.summary}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-[#64736B]">
                    {report.commodities?.name && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#F7F9F7] rounded">
                        {report.commodities.name}
                      </span>
                    )}
                    {report.published_at && (
                      <span>{formatDate(report.published_at)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-[#64736B] text-xs text-center">
              <div>
                <FileText className="w-6 h-6 text-[#E3EAE5] mx-auto mb-2" />
                <p>No reports available yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-5">
          <h2 className="text-sm font-semibold text-[#17241F] mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction
              icon={Star}
              label="Manage Watchlists"
              description="Track your commodities"
              href="/client/watchlists"
            />
            <QuickAction
              icon={Bell}
              label="Price Alerts"
              description="Set up price notifications"
              href="/client/alerts"
            />
            <QuickAction
              icon={FileText}
              label="Research Reports"
              description="Access market analysis"
              href="/client/research"
            />
            <QuickAction
              icon={BarChart3}
              label="Analytics"
              description="Explore price history"
              href="/client/analytics"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, href, color }: {
  icon: any;
  label: string;
  value: number;
  href: string;
  color: 'emerald' | 'amber' | 'blue' | 'purple';
}) {
  const colorClasses = {
    emerald: 'bg-[#EAF4EE] text-[#1D805A]',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-[#E3EAE5] p-4 hover:shadow-sm hover:border-[#1D805A]/20 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <ArrowRight className="w-4 h-4 text-[#64736B] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-2xl font-bold text-[#17241F]">{value.toLocaleString()}</p>
      <p className="text-xs text-[#64736B] mt-0.5">{label}</p>
    </Link>
  );
}

function PriceChart({ observations }: { observations: any[] }) {
  if (observations.length === 0) return null;

  const prices = observations.map((o: any) => o.median_price as number);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;
  const width = 100;
  const height = 40;

  const points = observations.map((o: any, i: number) => {
    const x = (i / (observations.length - 1)) * width;
    const y = height - ((o.median_price - minPrice) / range) * height;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D805A" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1D805A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#priceGradient)" />
        <path d={pathD} fill="none" stroke="#1D805A" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-[#64736B]">
        <span>{formatDate(observations[0].observed_on)}</span>
        <span>{formatDate(observations[observations.length - 1].observed_on)}</span>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, href }: {
  icon: any;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-[#E3EAE5] hover:border-[#1D805A]/30 hover:bg-[#F7F9F7] transition-all group"
    >
      <div className="w-8 h-8 rounded-lg bg-[#EAF4EE] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#1D805A]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#17241F] group-hover:text-[#1D805A] transition-colors">{label}</p>
        <p className="text-[11px] text-[#64736B]">{description}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-[#64736B] opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
