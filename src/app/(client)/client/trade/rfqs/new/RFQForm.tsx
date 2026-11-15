'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IconArrowRight, IconCalendar, IconBriefcase } from '@/components/ui/icons';

interface RFQFormProps {
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  commodities: Array<{ id: number; name: string; slug: string }>;
  grades: Array<{ id: number; name: string }>;
  varieties: Array<{ id: number; name: string; commodity_id: number }>;
  units: Array<{ id: number; name: string; abbreviation: string }>;
  markets: Array<{ id: number; name: string; state: string | null }>;
  states: Array<{ id: number; name: string }>;
}

export function RFQForm({ profile, commodities, grades, varieties, units, markets, states }: RFQFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [commodityId, setCommodityId] = useState<number | ''>('');
  const [gradeId, setGradeId] = useState<number | ''>('');
  const [varietyId, setVarietyId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [marketId, setMarketId] = useState<number | ''>('');
  const [stateId, setStateId] = useState<number | ''>('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [qualityRequirements, setQualityRequirements] = useState('');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [validUntil, setValidUntil] = useState('');
  const [contactName, setContactName] = useState(profile.full_name || '');
  const [contactEmail, setContactEmail] = useState(profile.email || '');
  const [contactPhone, setContactPhone] = useState(profile.phone || '');
  const [isPublic, setIsPublic] = useState(true);

  // Filter varieties by selected commodity
  const filteredVarieties = commodityId
    ? varieties.filter(v => v.commodity_id === commodityId)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Calculate valid_from and valid_until
      const validFrom = new Date().toISOString();
      const validUntilDate = new Date(validUntil);
      validUntilDate.setHours(23, 59, 59, 999);

      const { data, error: insertError } = await supabase
        .from('rfqs')
        .insert({
          buyer_id: session.user.id,
          title,
          description,
          commodity_id: Number(commodityId),
          grade_id: gradeId ? Number(gradeId) : null,
          variety_id: varietyId ? Number(varietyId) : null,
          quantity: Number(quantity),
          unit_id: Number(unitId),
          delivery_location: deliveryLocation || null,
          market_id: marketId ? Number(marketId) : null,
          state_id: stateId ? Number(stateId) : null,
          delivery_date: deliveryDate || null,
          delivery_terms: deliveryTerms || null,
          quality_requirements: qualityRequirements || null,
          budget_min: budgetMin ? Number(budgetMin) : null,
          budget_max: budgetMax ? Number(budgetMax) : null,
          currency_code: 'NGN',
          valid_from: validFrom,
          valid_until: validUntilDate.toISOString(),
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          status: 'published',
          is_public: isPublic,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push('/client/trade/rfqs');
    } catch (err) {
      console.error('Error creating RFQ:', err);
      setError(err instanceof Error ? err.message : 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  };

  // Calculate minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  // Calculate default valid_until (30 days from now)
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const defaultValidUntilStr = defaultValidUntil.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New RFQ</h1>
        <p className="text-gray-600">
          Submit a request for quote to receive offers from verified suppliers.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Premium Paddy Rice for Export"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Provide detailed specifications, requirements, and any special conditions..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Commodity Details */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Commodity Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commodity *
              </label>
              <select
                value={commodityId}
                onChange={(e) => {
                  setCommodityId(e.target.value ? Number(e.target.value) : '');
                  setGradeId('');
                  setVarietyId('');
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              >
                <option value="">Select commodity</option>
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade
              </label>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              >
                <option value="">Select grade (optional)</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {filteredVarieties.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variety
                </label>
                <select
                  value={varietyId}
                  onChange={(e) => setVarietyId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
                >
                  <option value="">Select variety (optional)</option>
                  {filteredVarieties.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="0.01"
                step="0.01"
                placeholder="e.g., 1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              >
                <option value="">Select unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g., Lagos Warehouse"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market
              </label>
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              >
                <option value="">Select market (optional)</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.state ? ` (${m.state})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                value={stateId}
                onChange={(e) => setStateId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              >
                <option value="">Select state (optional)</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={minDateStr}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Terms
              </label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                placeholder="e.g., FOB Lagos, CIF destination"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Quality & Budget */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quality & Budget</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Requirements
              </label>
              <textarea
                value={qualityRequirements}
                onChange={(e) => setQualityRequirements(e.target.value)}
                rows={3}
                placeholder="Specify quality standards, certifications required, moisture content, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Min (₦)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                min="0"
                step="0.01"
                placeholder="e.g., 450000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Max (₦)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                min="0"
                step="0.01"
                placeholder="e.g., 500000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Timeline & Contact */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline & Contact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid Until *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                  min={minDateStr}
                  defaultValue={defaultValidUntilStr}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
                />
                <IconCalendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Suppliers can submit quotes until this date
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Make this RFQ public (visible to all suppliers)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Uncheck to invite specific suppliers only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.push('/client/trade/rfqs')}
            className="px-6 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create RFQ'}
            <IconArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </form>
    </div>
  );
}
