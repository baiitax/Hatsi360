import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBriefcase, IconArrowRight, IconCalendar, IconCheck } from '@/components/ui/icons';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's orders as buyer
  const { data: buyerOrders } = await supabase
    .from('orders')
    .select(`
      *,
      commodities:commodity_id (id, name, slug),
      units:unit_id (id, name, abbreviation),
      grades:grade_id (id, name),
      suppliers:supplier_id (id, full_name, organisation)
    `)
    .eq('buyer_id', session.user.id)
    .order('created_at', { ascending: false });

  // Get user's orders as supplier
  const { data: supplierOrders } = await supabase
    .from('orders')
    .select(`
      *,
      commodities:commodity_id (id, name, slug),
      units:unit_id (id, name, abbreviation),
      grades:grade_id (id, name),
      buyers:buyer_id (id, full_name, organisation)
    `)
    .eq('supplier_id', session.user.id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const totalBuyerOrders = buyerOrders?.length || 0;
  const activeBuyerOrders = buyerOrders?.filter(o => 
    ['confirmed', 'in_progress', 'shipped'].includes(o.status)
  ).length || 0;
  const completedBuyerOrders = buyerOrders?.filter(o => 
    ['completed', 'delivered'].includes(o.status)
  ).length || 0;
  const totalSupplierOrders = supplierOrders?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">
          Track and manage your purchase and sales orders.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders (Buyer)</h3>
          <p className="text-3xl font-bold text-gray-900">{totalBuyerOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Orders</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{activeBuyerOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Completed</h3>
          <p className="text-3xl font-bold text-[#C7A45A]">{completedBuyerOrders}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Sales Orders</h3>
          <p className="text-3xl font-bold text-gray-900">{totalSupplierOrders}</p>
        </div>
      </div>

      {/* Orders as Buyer */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
              <IconBriefcase className="w-5 h-5 text-[#1D805A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Purchase Orders</h2>
              <p className="text-sm text-gray-600 mt-1">
                Orders you have placed with suppliers
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {buyerOrders && buyerOrders.length > 0 ? (
            buyerOrders.map((order) => (
              <Link
                key={order.id}
                href={`/client/trade/orders/${order.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivered' || order.status === 'completed' ? 'bg-[#1D805A] text-white' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.order_number}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {order.commodities?.name}
                    </h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div>
                        Qty: {order.quantity} {order.units?.abbreviation}
                      </div>
                      <div>
                        Total: ₦{order.total_amount.toLocaleString()}
                      </div>
                      {order.grades && (
                        <div>Grade: {order.grades.name}</div>
                      )}
                      {order.suppliers && (
                        <div>
                          Supplier: {order.suppliers.organisation || order.suppliers.full_name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 mt-3 text-sm">
                      {order.delivery_date && (
                        <div className="flex items-center text-gray-600">
                          <IconCalendar className="w-4 h-4 mr-1" />
                          Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                        </div>
                      )}
                      <div className="text-gray-500">
                        Created: {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      {order.payment_status === 'paid' && (
                        <div className="flex items-center text-[#1D805A]">
                          <IconCheck className="w-4 h-4 mr-1" />
                          Paid
                        </div>
                      )}
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
                No orders yet
              </h3>
              <p className="text-gray-600 mb-4">
                Orders will appear here when you accept supplier quotes.
              </p>
              <Link
                href="/client/trade/rfqs"
                className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
              >
                View RFQs
                <IconArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Orders as Supplier */}
      {supplierOrders && supplierOrders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-[#FFF3E0] rounded-lg mr-3">
                <IconBriefcase className="w-5 h-5 text-[#C7A45A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Sales Orders</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Orders from buyers that you are fulfilling
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {supplierOrders.map((order) => (
              <Link
                key={order.id}
                href={`/client/trade/orders/${order.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivered' || order.status === 'completed' ? 'bg-[#1D805A] text-white' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.order_number}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {order.commodities?.name}
                    </h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div>
                        Qty: {order.quantity} {order.units?.abbreviation}
                      </div>
                      <div>
                        Total: ₦{order.total_amount.toLocaleString()}
                      </div>
                      {order.buyers && (
                        <div>
                          Buyer: {order.buyers.organisation || order.buyers.full_name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 mt-3 text-sm">
                      {order.delivery_date && (
                        <div className="flex items-center text-gray-600">
                          <IconCalendar className="w-4 h-4 mr-1" />
                          Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                        </div>
                      )}
                      <div className="text-gray-500">
                        Created: {new Date(order.created_at).toLocaleDateString()}
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
