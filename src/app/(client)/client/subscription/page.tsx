import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconShieldCheck, IconCheck } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get current subscription
  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Define plan features
  const plans = [
    {
      name: 'Free',
      price: '₦0',
      period: 'forever',
      features: [
        'Browse commodities and markets',
        'View basic price information',
        'Up to 5 saved items',
        'Community access',
      ],
      limitations: [
        'No price alerts',
        'No market reports',
        'No data exports',
        'No API access',
      ],
    },
    {
      name: 'Professional',
      price: '₦25,000',
      period: 'per month',
      features: [
        'Everything in Free',
        'Unlimited saved items',
        'Up to 50 price alerts',
        'Basic market reports',
        'CSV data exports',
        'Email support',
      ],
      limitations: [
        'No API access',
        'Limited historical data',
      ],
    },
    {
      name: 'Enterprise',
      price: '₦75,000',
      period: 'per month',
      features: [
        'Everything in Professional',
        'Unlimited price alerts',
        'Premium market reports',
        'Full historical data access',
        'API access (10,000 requests/month)',
        'Bulk data exports',
        'Priority support',
        'Custom integrations',
      ],
      limitations: [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
        <p className="text-gray-600">
          Choose the plan that fits your business needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Current Plan Banner */}
      {subscription && (
        <div className="bg-gradient-to-r from-[#1D805A] to-[#103C2D] rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Current Plan</p>
              <h2 className="text-2xl font-bold capitalize mb-2">
                {subscription.plan || 'Free'}
              </h2>
              <div className="flex items-center space-x-4 text-sm">
                <span className="opacity-90">
                  Status: <span className="font-medium">{subscription.status}</span>
                </span>
                {subscription.ends_at && (
                  <span className="opacity-90">
                    Renews: <span className="font-medium">
                      {new Date(subscription.ends_at).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-lg">
              <IconShieldCheck className="w-12 h-12" />
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan === plan.name.toLowerCase();
          
          return (
            <div
              key={plan.name}
              className={`bg-white rounded-lg border-2 p-6 ${
                isCurrentPlan
                  ? 'border-[#1D805A] shadow-lg'
                  : plan.name === 'Enterprise'
                  ? 'border-[#C7A45A]'
                  : 'border-gray-200'
              }`}
            >
              {isCurrentPlan && (
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1D805A] text-white">
                    Current Plan
                  </span>
                </div>
              )}

              {plan.name === 'Enterprise' && !isCurrentPlan && (
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#C7A45A] text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600 ml-2">/{plan.period}</span>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  What's included:
                </h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <IconCheck className="w-5 h-5 text-[#1D805A] mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              {plan.limitations.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Limitations:
                  </h4>
                  <ul className="space-y-2">
                    {plan.limitations.map((limitation, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 text-center">
                          ×
                        </span>
                        <span className="text-sm text-gray-500">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Button */}
              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-100 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.name === 'Free' ? (
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-100 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                >
                  Downgrade
                </button>
              ) : (
                <button className="w-full py-3 px-4 bg-[#1D805A] text-white rounded-lg font-medium hover:bg-[#103C2D] transition-colors">
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Can I change my plan later?
            </h3>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and we'll prorate your billing accordingly.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              What payment methods do you accept?
            </h3>
            <p className="text-gray-600">
              We accept bank transfers, debit cards, and mobile money. All payments are processed securely 
              through our payment partners.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Is there a contract or commitment?
            </h3>
            <p className="text-gray-600">
              No long-term contracts. You can cancel your subscription at any time. Your access continues 
              until the end of your current billing period.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Do you offer custom enterprise plans?
            </h3>
            <p className="text-gray-600">
              Yes, for organizations with specific needs, we offer custom enterprise plans with dedicated 
              support, higher API limits, and custom integrations. Contact our sales team for details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
