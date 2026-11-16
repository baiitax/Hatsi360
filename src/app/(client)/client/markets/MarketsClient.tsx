'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, TrendingUp, Filter } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Market {
  id: number;
  name: string;
  slug: string;
  state?: string;
  city?: string;
  market_type?: string;
  is_active: boolean;
  is_saved: boolean;
  commodity_count: number;
  latest_observation?: {
    median_price: number;
    commodity_name: string;
    observed_on: string;
  } | null;
}

interface MarketsClientProps {
  markets: Market[];
  userId: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function MarketsClient({ markets, userId }: MarketsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Get unique states
  const states = useMemo(() => {
    const stateSet = new Set(markets.map((m) => m.state).filter(Boolean));
    return Array.from(stateSet).sort() as string[];
  }, [markets]);

  // Filter markets
  const filtered = useMemo(() => {
    let result = markets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(query) ||
        m.state?.toLowerCase().includes(query) ||
        m.city?.toLowerCase().includes(query)
      );
    }

    if (selectedState) {
      result = result.filter((m) => m.state === selectedState);
    }

    if (showSavedOnly) {
      result = result.filter((m) => m.is_saved);
    }

    return result;
  }, [markets, searchQuery, selectedState, showSavedOnly]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">Markets</h1>
        <p className="text-sm text-[#64736B] mt-1">
          Browse agricultural markets tracked across Nigeria
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Active Markets</p>
          <p className="text-2xl font-bold text-[#17241F]">{markets.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">States Covered</p>
          <p className="text-2xl font-bold text-[#17241F]">{states.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">With Price Data</p>
          <p className="text-2xl font-bold text-[#17241F]">
            {markets.filter((m) => m.commodity_count > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">In My Watchlist</p>
          <p className="text-2xl font-bold text-[#1D805A]">{markets.filter((m) => m.is_saved).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            />
          </div>

          {/* State filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
          >
            <option value="">All States</option>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          {/* Saved only toggle */}
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`h-10 px-4 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors ${
              showSavedOnly
                ? 'bg-[#1D805A] text-white'
                : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE] hover:text-[#103C2D]'
            }`}
          >
            <Star className="w-4 h-4" />
            Saved Only
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-[#64736B]">
        Showing {filtered.length} of {markets.length} markets
      </p>

      {/* Markets Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
          <MapPin className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
          <p className="text-[#64736B] font-medium">No markets found</p>
          <p className="text-xs text-[#64736B] mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

// ─── Market Card ───────────────────────────────────────────────────────────

function MarketCard({ market }: { market: Market }) {
  return (
    <Link
      href={`/prices?market=${market.slug}`}
      className="bg-white rounded-xl border border-[#E3EAE5] p-5 hover:shadow-md hover:border-[#1D805A]/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#17241F] group-hover:text-[#1D805A] transition-colors truncate">
            {market.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-[#64736B]" />
            <p className="text-xs text-[#64736B] truncate">
              {market.city && `${market.city}, `}{market.state || 'Nigeria'}
            </p>
          </div>
        </div>
        {market.is_saved && (
          <Star className="w-4 h-4 text-[#C7A45A] fill-[#C7A45A] flex-shrink-0" />
        )}
      </div>

      {market.market_type && (
        <span className="inline-flex items-center px-2 py-0.5 bg-[#F7F9F7] text-[#64736B] text-[10px] font-medium rounded mb-3">
          {market.market_type.replace('_', ' ')}
        </span>
      )}

      <div className="flex items-end justify-between mt-3 pt-3 border-t border-[#E3EAE5]">
        <div>
          <p className="text-[10px] text-[#64736B]">Commodities tracked</p>
          <p className="text-sm font-semibold text-[#17241F]">{market.commodity_count}</p>
        </div>
        {market.latest_observation && (
          <div className="text-right">
            <p className="text-[10px] text-[#64736B]">Latest price</p>
            <p className="text-sm font-semibold text-[#17241F]">
              ₦{market.latest_observation.median_price.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
