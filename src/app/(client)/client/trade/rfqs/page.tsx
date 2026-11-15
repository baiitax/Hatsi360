import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBriefcase, IconArrowRight, IconCalendar, IconUser } from '@/components/ui/icons';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RFQsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's RFQs (as buyer)
  const { data: myRfqs } = await supabase
    .from('rfqs')
    .select(`
      *,
      commodities:commodity_id (id, name, slug),
      units:unit_id (id, name, abbreviation),
      grades:grade_id (id, name)
    `)
    .eq('buyer_id', session.user.id)
    .order('created_at', { ascending: false });

  // Get RFQs where user has submitted quotes (as supplier)
  const { data: quotedRfqs } = await supabase
    .from('quotes')
    .select(`
      *,
      rfqs:rfq_id (
        *,
        commodities:commodity_id (id, name, slug),
        units:unit_id (id, name, abbreviation)
      )
    `)
    .eq('supplier_id', session.user.id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const draftCount = myRfqs?.filter(r => r.status === 'draft').length || 0;
  const activeCount = myRfqs?.filter(r => r.status === 'published').length || 0;
  const awardedCount = myRfqs?.filter(r => r.status === 'awarded').length || 0;
  const quotedCount = quotedRfqs?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My RFQs</h1>
          <p className="text-gray-600">
            Manage your requests for quotes and track supplier responses.
          </p>
        </div>
        <Link
          href="/client/trade/rfqs/new"
          className="inline-flex items-center px-4 py-2 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors"
        >
          Create New RFQ
          <IconArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Draft RFQs</h3>
          <p className="text-3xl font-bold text-gray-400">{draftCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active RFQs</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Awarded</h3>
          <p className="text-3xl font-bold text-[#C7A45A]">{awardedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Quotes Submitted</h3>
          <p className="text-3xl font-bold text-gray-900">{quotedCount}</p>
        </div>
      </div>

      {/* My RFQs as Buyer */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
              <IconBriefcase className="w-5 h-5 text-[#1D805A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">My Requests</h2>
              <p className="text-sm text-gray-600 mt-1">
                RFQs you have created
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {myRfqs && myRfqs.length > 0 ? (
            myRfqs.map((rfq) => (
              <Link
                key={rfq.id}
                href={`/client/trade/rfqs/${rfq.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        rfq.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        rfq.status === 'published' ? 'bg-green-100 text-green-800' :
                        rfq.status === 'awarded' ? 'bg-[#C7A45A] text-white' :
                        rfq.status === 'closed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(rfq.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {rfq.title}
                    </h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center">
                        <IconBriefcase className="w-4 h-4 mr-1" />
                        {rfq.commodities?.name}
                      </div>
                      {rfq.grades && (
                        <div>Grade: {rfq.grades.name}</div>
                      )}
                      <div>
                        Qty: {rfq.quantity} {rfq.units?.abbreviation}
                      </div>
                      <div className="flex items-center">
                        <IconCalendar className="w-4 h-4 mr-1" />
                        Expires: {new Date(rfq.valid_until).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-3 text-sm">
                      <span className="text-[#1D805A] font-medium">
                        {rfq.quote_count} quote{rfq.quote_count !== 1 ? 's' : ''} received
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">
                        {rfq.view_count} view{rfq.view_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <IconArrowRight className="w-5 h-5 text-gray-400 ml-4" />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconBriefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No RFQs yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first request for quote to start receiving offers from suppliers.
              </p>
              <Link
                href="/client/trade/rfqs/new"
                className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
              >
                Create RFQ
                <IconArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* RFQs I've Quoted On */}
      {quotedRfqs && quotedRfqs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-[#FFF3E0] rounded-lg mr-3">
                <IconUser className="w-5 h-5 text-[#C7A45A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Quotes Submitted</h2>
                <p className="text-sm text-gray-600 mt-1">
                  RFQs where you've submitted quotes
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {quotedRfqs.map((quote) => (
              <Link
                key={quote.rfqs.id}
                href={`/client/trade/rfqs/${quote.rfqs.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        quote.status === 'submitted' ? 'bg-green-100 text-green-800' :
                        quote.status === 'accepted' ? 'bg-[#C7A45A] text-white' :
                        quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Quoted: {new Date(quote.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {quote.rfqs.title}
                    </h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center">
                        <IconBriefcase className="w-4 h-4 mr-1" />
                        {quote.rfqs.commodities?.name}
                      </div>
                      <div>
                        Qty: {quote.rfqs.quantity} {quote.rfqs.units?.abbreviation}
                      </div>
                      <div>
                        Your Price: ₦{quote.unit_price.toLocaleString()} per {quote.rfqs.units?.abbreviation}
                      </div>
                    </div>
                  </div>

                  <IconArrowRight className="w-5 h-5 text-gray-400 ml-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
