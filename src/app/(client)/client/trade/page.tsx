import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBriefcase, IconArrowRight, IconUser } from '@/components/ui/icons';
import Link from 'next/link';


export const dynamic = "force-dynamic";
export default async function TradePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's RFQ count
  const { count: rfqCount } = await supabase
    .from('rfqs')
    .select('*', { count: 'exact', head: true })
    .eq('buyer_id', session.user.id);

  // Get user's order count
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('buyer_id', session.user.id);

  // Get verified supplier count
  const { count: supplierCount } = await supabase
    .from('supplier_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('verification_status', 'verified');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trade & Sourcing</h1>
        <p className="text-gray-600">
          Connect with buyers, sellers, and trade opportunities across the agricultural value chain.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">My RFQs</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{rfqCount || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">My Orders</h3>
          <p className="text-3xl font-bold text-gray-900">{orderCount || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Verified Suppliers</h3>
          <p className="text-3xl font-bold text-[#C7A45A]">{supplierCount || 0}</p>
        </div>
      </div>

      {/* Trade Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* RFQ System */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-[#EAF4EE] rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-[#1D805A]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Request for Quote</h3>
              <p className="text-sm text-gray-600 mt-1">
                Submit RFQs to suppliers
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Create detailed requests for quotes, specify your requirements, and receive competitive offers from verified suppliers.
          </p>
          <Link
            href="/client/trade/rfqs"
            className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
          >
            Manage RFQs
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Order Management */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-[#FFF3E0] rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-[#C7A45A]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Management</h3>
              <p className="text-sm text-gray-600 mt-1">
                Track your orders
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            View and manage all your purchase and sales orders. Track delivery status, payments, and order history.
          </p>
          <Link
            href="/client/trade/orders"
            className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
          >
            View Orders
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Supplier Directory */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-[#EAF4EE] rounded-lg mr-3">
              <IconUser className="w-6 h-6 text-[#1D805A]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Supplier Directory</h3>
              <p className="text-sm text-gray-600 mt-1">
                Browse verified suppliers
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Connect with verified suppliers, view their ratings and certifications, and find trusted trade partners.
          </p>
          <Link
            href="/client/trade/suppliers"
            className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
          >
            View Suppliers
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Market Directory */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Market Directory</h3>
              <p className="text-sm text-gray-600 mt-1">
                Browse markets and trading hubs
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Access comprehensive directory of agricultural markets, their locations, and key contacts across Nigeria.
          </p>
          <Link
            href="/markets"
            className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
          >
            Explore Markets
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Commodity Explorer */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Commodity Explorer</h3>
              <p className="text-sm text-gray-600 mt-1">
                Discover agricultural commodities
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Browse all tracked commodities with detailed information on varieties, grades, and market availability.
          </p>
          <Link
            href="/commodities"
            className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
          >
            View Commodities
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Price Terminal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Price Terminal</h3>
              <p className="text-sm text-gray-600 mt-1">
                Real-time price monitoring
              </p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Monitor current prices, view historical trends, and set alerts for your key commodities and markets.
          </p>
          <Link
            href="/trade/terminal"
            className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
          >
            Open Terminal
            <IconArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#EAF4EE] border border-[#1D805A] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#103C2D] mb-2">
          Trade Platform Features
        </h3>
        <p className="text-[#1D805A] text-sm mb-4">
          Our comprehensive trade platform helps you source commodities, manage orders, and connect with verified suppliers. 
          All suppliers are verified and rated by the community.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <h4 className="font-medium text-[#103C2D] mb-1">✓ Verified Suppliers</h4>
            <p className="text-xs text-[#1D805A]">
              All suppliers undergo verification and maintain ratings
            </p>
          </div>
          <div>
            <h4 className="font-medium text-[#103C2D] mb-1">✓ Secure Transactions</h4>
            <p className="text-xs text-[#1D805A]">
              Track orders and payments through the platform
            </p>
          </div>
          <div>
            <h4 className="font-medium text-[#103C2D] mb-1">✓ Quality Assurance</h4>
            <p className="text-xs text-[#1D805A]">
              Specify quality requirements and certifications
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
