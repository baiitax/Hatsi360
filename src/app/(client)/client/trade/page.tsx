import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBriefcase, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';


export const dynamic = "force-dynamic";
export default async function TradePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trade & Sourcing</h1>
        <p className="text-gray-600">
          Connect with buyers, sellers, and trade opportunities across the agricultural value chain.
        </p>
      </div>

      {/* Trade Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Market Directory */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-[#EAF4EE] rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-[#1D805A]" />
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
            <div className="p-3 bg-[#FFF3E0] rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-[#C7A45A]" />
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
            <div className="p-3 bg-[#EAF4EE] rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-[#1D805A]" />
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

        {/* RFQ System - Coming Soon */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 opacity-75">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Request for Quote</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-2">
                Coming Soon
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Submit RFQs for specific commodities, quantities, and delivery locations. Receive quotes from verified suppliers.
          </p>
          <button
            disabled
            className="inline-flex items-center text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            Learn More
            <IconArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Trade Terminal - Coming Soon */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 opacity-75">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Management</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-2">
                Coming Soon
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Create, track, and manage your purchase orders and sales contracts in one place.
          </p>
          <button
            disabled
            className="inline-flex items-center text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            Learn More
            <IconArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Supplier Network - Coming Soon */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 opacity-75">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg mr-3">
              <IconBriefcase className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Supplier Network</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ml-2">
                Coming Soon
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Connect with verified suppliers, view their ratings, and build your trusted supplier network.
          </p>
          <button
            disabled
            className="inline-flex items-center text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            Learn More
            <IconArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#EAF4EE] border border-[#1D805A] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#103C2D] mb-2">
          Trade Features Coming Soon
        </h3>
        <p className="text-[#1D805A] text-sm mb-4">
          We are building a comprehensive trade platform to help you source commodities, manage orders, and connect with verified suppliers. 
          These features will be available in the next platform update.
        </p>
        <p className="text-[#1D805A] text-sm">
          In the meantime, you can explore markets, monitor prices, and set up alerts to stay informed about market conditions.
        </p>
      </div>
    </div>
  );
}
