'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Star,
  Plus,
  X,
  Trash2,
  Search,
  Package,
  MapPin,
  ArrowRight,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  saveCommodity,
  removeSavedCommodity,
  saveMarket,
  removeSavedMarket,
} from '../actions/intelligence';

// ─── Types ─────────────────────────────────────────────────────────────────

interface SavedCommodity {
  id: number;
  note?: string;
  created_at: string;
  commodity?: {
    id: number;
    name: string;
    slug: string;
    category?: string;
    image_url?: string;
  } | null;
}

interface SavedMarket {
  id: number;
  note?: string;
  created_at: string;
  market?: {
    id: number;
    name: string;
    slug: string;
    state?: string;
    city?: string;
  } | null;
}

interface Commodity {
  id: number;
  name: string;
  slug: string;
  category?: string;
  image_url?: string;
}

interface Market {
  id: number;
  name: string;
  slug: string;
  state?: string;
  city?: string;
}

interface WatchlistsClientProps {
  savedCommodities: SavedCommodity[];
  savedMarkets: SavedMarket[];
  allCommodities: Commodity[];
  allMarkets: Market[];
  hasEntitlement: boolean;
}

type ActiveTab = 'commodities' | 'markets';
type AddModalType = 'commodity' | 'market' | null;

// ─── Component ─────────────────────────────────────────────────────────────

export function WatchlistsClient({
  savedCommodities,
  savedMarkets,
  allCommodities,
  allMarkets,
  hasEntitlement,
}: WatchlistsClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('commodities');
  const [addModal, setAddModal] = useState<AddModalType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveCommodity = (commodityId: number) => {
    startTransition(async () => {
      const result = await saveCommodity(commodityId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Commodity added to watchlist');
        setAddModal(null);
      }
    });
  };

  const handleRemoveCommodity = (commodityId: number) => {
    startTransition(async () => {
      const result = await removeSavedCommodity(commodityId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Commodity removed from watchlist');
      }
    });
  };

  const handleSaveMarket = (marketId: number) => {
    startTransition(async () => {
      const result = await saveMarket(marketId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Market added to watchlist');
        setAddModal(null);
      }
    });
  };

  const handleRemoveMarket = (marketId: number) => {
    startTransition(async () => {
      const result = await removeSavedMarket(marketId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Market removed from watchlist');
      }
    });
  };

  // Filter available items for add modal
  const savedCommodityIds = new Set(savedCommodities.map((sc) => sc.commodity?.id));
  const savedMarketIds = new Set(savedMarkets.map((sm) => sm.market?.id));

  const availableCommodities = allCommodities.filter(
    (c) => !savedCommodityIds.has(c.id) && c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableMarkets = allMarkets.filter(
    (m) => !savedMarketIds.has(m.id) && m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter saved items for display
  const filteredSavedCommodities = savedCommodities.filter(
    (sc) => sc.commodity?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSavedMarkets = savedMarkets.filter(
    (sm) => sm.market?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasEntitlement) {
    return (
      <div className="space-y-6 max-w-[1600px]">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">My Watchlists</h1>
          <p className="text-sm text-[#64736B] mt-1">Track your favourite commodities and markets</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
          <Star className="w-12 h-12 text-[#C7A45A] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#17241F] mb-2">Premium Feature</h2>
          <p className="text-sm text-[#64736B] mb-4 max-w-md mx-auto">
            Watchlists allow you to save and track your favourite commodities and markets.
            Upgrade to a Professional or Enterprise plan to access this feature.
          </p>
          <Link
            href="/client/subscription"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D805A] text-white text-sm font-medium rounded-lg hover:bg-[#103C2D] transition-colors"
          >
            View Plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[300] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-[#1D805A] text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">My Watchlists</h1>
          <p className="text-sm text-[#64736B] mt-1">
            Track your favourite commodities and markets
          </p>
        </div>
        <button
          onClick={() => setAddModal(activeTab === 'commodities' ? 'commodity' : 'market')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D805A] text-white text-sm font-medium rounded-lg hover:bg-[#103C2D] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'commodities' ? 'Commodity' : 'Market'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Saved Commodities</p>
          <p className="text-2xl font-bold text-[#17241F]">{savedCommodities.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Saved Markets</p>
          <p className="text-2xl font-bold text-[#17241F]">{savedMarkets.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#E3EAE5] p-1">
        <button
          onClick={() => { setActiveTab('commodities'); setSearchQuery(''); }}
          className={`flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'commodities' ? 'bg-[#1D805A] text-white' : 'text-[#64736B] hover:bg-[#F7F9F7]'
          }`}
        >
          <Package className="w-4 h-4" />
          Commodities ({savedCommodities.length})
        </button>
        <button
          onClick={() => { setActiveTab('markets'); setSearchQuery(''); }}
          className={`flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'markets' ? 'bg-[#1D805A] text-white' : 'text-[#64736B] hover:bg-[#F7F9F7]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Markets ({savedMarkets.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
        <input
          type="text"
          placeholder={`Search saved ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
        />
      </div>

      {/* Content */}
      {activeTab === 'commodities' ? (
        filteredSavedCommodities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSavedCommodities.map((sc) => (
              <div key={sc.id} className="bg-white rounded-xl border border-[#E3EAE5] p-4 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/commodities/${sc.commodity?.slug}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#EAF4EE] flex-shrink-0">
                      {sc.commodity?.image_url ? (
                        <img src={sc.commodity.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1D805A] font-semibold text-sm">
                          {sc.commodity?.name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#17241F] group-hover:text-[#1D805A] truncate transition-colors">
                        {sc.commodity?.name}
                      </p>
                      {sc.commodity?.category && (
                        <p className="text-[10px] text-[#64736B] capitalize">{sc.commodity.category}</p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => sc.commodity && handleRemoveCommodity(sc.commodity.id)}
                    disabled={isPending}
                    className="p-1.5 text-[#64736B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {sc.note && (
                  <p className="mt-2 text-xs text-[#64736B] italic truncate">{sc.note}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
            <Package className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
            <p className="text-[#64736B] font-medium">No saved commodities</p>
            <p className="text-xs text-[#64736B] mt-1 mb-4">Add commodities to track them in your watchlist</p>
            <button
              onClick={() => setAddModal('commodity')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D805A] text-white text-sm font-medium rounded-lg hover:bg-[#103C2D] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Commodity
            </button>
          </div>
        )
      ) : filteredSavedMarkets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSavedMarkets.map((sm) => (
            <div key={sm.id} className="bg-white rounded-xl border border-[#E3EAE5] p-4 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#EAF4EE] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#1D805A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#17241F] truncate">{sm.market?.name}</p>
                    {(sm.market?.city || sm.market?.state) && (
                      <p className="text-[10px] text-[#64736B] truncate">
                        {sm.market?.city && `${sm.market.city}, `}{sm.market?.state}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => sm.market && handleRemoveMarket(sm.market.id)}
                  disabled={isPending}
                  className="p-1.5 text-[#64736B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {sm.note && (
                <p className="mt-2 text-xs text-[#64736B] italic truncate">{sm.note}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
          <MapPin className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
          <p className="text-[#64736B] font-medium">No saved markets</p>
          <p className="text-xs text-[#64736B] mt-1 mb-4">Add markets to track them in your watchlist</p>
          <button
            onClick={() => setAddModal('market')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D805A] text-white text-sm font-medium rounded-lg hover:bg-[#103C2D] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Market
          </button>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <AddModal
          type={addModal}
          availableItems={addModal === 'commodity' ? availableCommodities : availableMarkets}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(id) => {
            if (addModal === 'commodity') handleSaveCommodity(id);
            else handleSaveMarket(id);
          }}
          onClose={() => { setAddModal(null); setSearchQuery(''); }}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ─── Add Modal ─────────────────────────────────────────────────────────────

function AddModal({
  type,
  availableItems,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
  isPending,
}: {
  type: 'commodity' | 'market';
  availableItems: any[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: number) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3EAE5]">
          <h3 className="text-sm font-semibold text-[#17241F]">
            Add {type === 'commodity' ? 'Commodity' : 'Market'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[#64736B] hover:text-[#17241F] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
            <input
              type="text"
              placeholder={`Search ${type === 'commodity' ? 'commodities' : 'markets'}...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
              className="w-full h-10 pl-10 pr-4 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {availableItems.length > 0 ? (
              availableItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F7F9F7] transition-colors text-left disabled:opacity-50"
                >
                  {type === 'commodity' && item.image_url ? (
                    <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#EAF4EE] flex items-center justify-center">
                      {type === 'commodity' ? (
                        <Package className="w-4 h-4 text-[#1D805A]" />
                      ) : (
                        <MapPin className="w-4 h-4 text-[#1D805A]" />
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#17241F]">{item.name}</p>
                    {type === 'commodity' && item.category && (
                      <p className="text-[10px] text-[#64736B] capitalize">{item.category}</p>
                    )}
                    {type === 'market' && (item.city || item.state) && (
                      <p className="text-[10px] text-[#64736B]">{item.city && `${item.city}, `}{item.state}</p>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-[#64736B] ml-auto" />
                </button>
              ))
            ) : (
              <div className="py-8 text-center text-[#64736B] text-sm">
                {searchQuery ? 'No items match your search' : 'All items already saved'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
