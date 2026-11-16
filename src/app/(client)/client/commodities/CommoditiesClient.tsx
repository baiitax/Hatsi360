'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Star, ArrowRight, Grid3x3, List } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Commodity {
  id: number;
  name: string;
  slug: string;
  category?: string;
  image_url?: string;
  description?: string;
  latest_price: number | null;
  price_unit?: string;
  price_currency?: string;
  market_name?: string;
  price_date?: string;
  is_saved: boolean;
}

interface CommoditiesClientProps {
  commodities: Commodity[];
  userId: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CommoditiesClient({ commodities, userId }: CommoditiesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(commodities.map((c) => c.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [commodities]);

  // Filter commodities
  const filtered = useMemo(() => {
    let result = commodities;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.category?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (showSavedOnly) {
      result = result.filter((c) => c.is_saved);
    }

    return result;
  }, [commodities, searchQuery, selectedCategory, showSavedOnly]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">Commodities</h1>
        <p className="text-sm text-[#64736B] mt-1">
          Explore agricultural commodities tracked across Nigerian markets
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Total Commodities</p>
          <p className="text-2xl font-bold text-[#17241F]">{commodities.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Categories</p>
          <p className="text-2xl font-bold text-[#17241F]">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">With Price Data</p>
          <p className="text-2xl font-bold text-[#17241F]">
            {commodities.filter((c) => c.latest_price !== null).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">In My Watchlist</p>
          <p className="text-2xl font-bold text-[#1D805A]">{commodities.filter((c) => c.is_saved).length}</p>
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
              placeholder="Search commodities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            />
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
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

          {/* View mode toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64736B]">
          Showing {filtered.length} of {commodities.length} commodities
        </p>
      </div>

      {/* Commodities Grid/List */}
      {filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((commodity) => (
              <CommodityCard key={commodity.id} commodity={commodity} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E3EAE5] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F7F9F7]">
                <tr>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#64736B] p-4">Commodity</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#64736B] p-4">Category</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] p-4">Latest Price</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#64736B] p-4">Market</th>
                  <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#64736B] p-4">Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE5]">
                {filtered.map((commodity) => (
                  <tr key={commodity.id} className="hover:bg-[#F7F9F7] transition-colors">
                    <td className="p-4">
                      <Link href={`/commodities/${commodity.slug}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#EAF4EE] flex-shrink-0">
                          {commodity.image_url ? (
                            <img src={commodity.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#1D805A] font-semibold text-sm">
                              {commodity.name[0]}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[#17241F] hover:text-[#1D805A]">{commodity.name}</span>
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-[#64736B] capitalize">{commodity.category || '—'}</td>
                    <td className="p-4 text-sm font-semibold text-[#17241F] text-right">
                      {commodity.latest_price ? `₦${commodity.latest_price.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-4 text-sm text-[#64736B] text-right">{commodity.market_name || '—'}</td>
                    <td className="p-4 text-center">
                      {commodity.is_saved && <Star className="w-4 h-4 text-[#C7A45A] fill-[#C7A45A] inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
          <Search className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
          <p className="text-[#64736B] font-medium">No commodities found</p>
          <p className="text-xs text-[#64736B] mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

// ─── Commodity Card ────────────────────────────────────────────────────────

function CommodityCard({ commodity }: { commodity: Commodity }) {
  return (
    <Link
      href={`/commodities/${commodity.slug}`}
      className="bg-white rounded-xl border border-[#E3EAE5] overflow-hidden hover:shadow-md hover:border-[#1D805A]/30 transition-all group"
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-[#F7F9F7]">
        {commodity.image_url ? (
          <img
            src={commodity.image_url}
            alt={commodity.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#E3EAE5]">
            {commodity.name[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#17241F] group-hover:text-[#1D805A] transition-colors">
            {commodity.name}
          </h3>
          {commodity.is_saved && (
            <Star className="w-4 h-4 text-[#C7A45A] fill-[#C7A45A] flex-shrink-0" />
          )}
        </div>

        {commodity.category && (
          <p className="text-xs text-[#64736B] capitalize mb-3">{commodity.category}</p>
        )}

        {commodity.latest_price ? (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-[#17241F]">
                ₦{commodity.latest_price.toLocaleString()}
              </p>
              {commodity.price_unit && (
                <p className="text-[10px] text-[#64736B]">per {commodity.price_unit}</p>
              )}
            </div>
            {commodity.market_name && (
              <p className="text-[10px] text-[#64736B] text-right max-w-[100px] truncate">
                {commodity.market_name}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#64736B]">No price data available</p>
        )}
      </div>
    </Link>
  );
}
