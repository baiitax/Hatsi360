import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconUser, IconStar, IconBriefcase, IconMap, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get verified suppliers
  const { data: suppliers } = await supabase
    .from('supplier_profiles')
    .select(`
      *,
      states:state_id (id, name),
      commodities:commodities_traded (id, name)
    `)
    .eq('is_active', true)
    .eq('verification_status', 'verified')
    .order('average_rating', { ascending: false, nullsFirst: false })
    .limit(50);

  // Get all commodities for reference
  const { data: commodities } = await supabase
    .from('commodities')
    .select('id, name, slug')
    .order('name');

  // Get all states
  const { data: states } = await supabase
    .from('states')
    .select('id, name')
    .order('name');

  // Calculate stats
  const totalSuppliers = suppliers?.length || 0;
  const verifiedCount = suppliers?.filter(s => s.verification_level >= 2).length || 0;
  const avgRating = suppliers?.reduce((sum, s) => sum + (s.average_rating || 0), 0) || 0;
  const avgRatingCount = suppliers?.filter(s => s.average_rating).length || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Directory</h1>
        <p className="text-gray-600">
          Browse verified suppliers and connect with trusted trade partners.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Suppliers</h3>
          <p className="text-3xl font-bold text-gray-900">{totalSuppliers}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Highly Verified</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{verifiedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Average Rating</h3>
          <p className="text-3xl font-bold text-[#C7A45A]">
            {(avgRating / avgRatingCount).toFixed(1)} ★
          </p>
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
              <IconUser className="w-5 h-5 text-[#1D805A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Verified Suppliers</h2>
              <p className="text-sm text-gray-600 mt-1">
                All suppliers are verified and ready to trade
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {suppliers && suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {supplier.business_name}
                      </h3>
                      {supplier.is_featured && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C7A45A] text-white">
                          Featured
                        </span>
                      )}
                      {supplier.verification_level >= 2 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1D805A] text-white">
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <IconBriefcase className="w-4 h-4 mr-1" />
                        <span className="capitalize">{supplier.business_type}</span>
                      </div>
                      {supplier.states && (
                        <div className="flex items-center">
                          <IconMap className="w-4 h-4 mr-1" />
                          <span>{supplier.states.name}{supplier.city ? `, ${supplier.city}` : ''}</span>
                        </div>
                      )}
                      {supplier.year_established && (
                        <div>Est. {supplier.year_established}</div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm mb-3">
                      {supplier.average_rating && (
                        <div className="flex items-center">
                          <IconStar className="w-4 h-4 text-[#C7A45A] mr-1" />
                          <span className="font-medium text-gray-900">
                            {supplier.average_rating.toFixed(1)}
                          </span>
                          <span className="text-gray-500 ml-1">
                            ({supplier.total_transactions} transactions)
                          </span>
                        </div>
                      )}
                      {supplier.response_rate > 0 && (
                        <div className="text-gray-600">
                          {supplier.response_rate.toFixed(0)}% response rate
                        </div>
                      )}
                    </div>

                    {supplier.commodities_traded && supplier.commodities_traded.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Commodities:</p>
                        <div className="flex flex-wrap gap-2">
                          {supplier.commodities_traded.slice(0, 5).map((commodity: any) => (
                            <span
                              key={commodity.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {commodity.name}
                            </span>
                          ))}
                          {supplier.commodities_traded.length > 5 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              +{supplier.commodities_traded.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {supplier.min_order_quantity && supplier.max_order_quantity && (
                        <div>
                          Order: {supplier.min_order_quantity} - {supplier.max_order_quantity} MT
                        </div>
                      )}
                      {supplier.lead_time_days && (
                        <div>Lead time: {supplier.lead_time_days} days</div>
                      )}
                      {supplier.quality_certifications && supplier.quality_certifications.length > 0 && (
                        <div>
                          {supplier.quality_certifications.slice(0, 3).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <Link
                      href={`/client/trade/rfqs/new?supplier=${supplier.id}`}
                      className="inline-flex items-center px-4 py-2 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors text-sm"
                    >
                      Request Quote
                      <IconArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                    {supplier.total_transactions > 0 && (
                      <span className="text-xs text-gray-500">
                        {supplier.total_transactions} orders
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconUser className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No verified suppliers yet
              </h3>
              <p className="text-gray-600">
                Verified suppliers will appear here as they complete their profiles.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
