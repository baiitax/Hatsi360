'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  IconArrowRight, 
  IconCheck, 
  IconBell, 
  IconSave, 
  IconMarkets, 
  IconCommodities,
  IconUser
} from '@/components/ui/icons';

interface OnboardingWizardProps {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    onboarding_step: number;
    onboarding_completed_at: string | null;
    interests: Record<string, unknown>;
  };
  commodities: Array<{
    id: number;
    name: string;
    slug: string;
    category: string | null;
  }>;
  markets: Array<{
    id: number;
    name: string;
    slug: string;
    state: string | null;
    market_type: string | null;
  }>;
  states: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  currentStep: number;
  interests: Record<string, unknown>;
}

const STEPS = [
  { id: 0, title: 'Welcome', icon: IconUser },
  { id: 1, title: 'Your Interests', icon: IconCommodities },
  { id: 2, title: 'Markets', icon: IconMarkets },
  { id: 3, title: 'Notifications', icon: IconBell },
  { id: 4, title: 'Complete', icon: IconCheck },
];

export function OnboardingWizard({
  profile,
  commodities,
  markets,
  states,
  currentStep: initialStep,
  interests: initialInterests,
}: OnboardingWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [selectedCommodities, setSelectedCommodities] = useState<number[]>(
    (initialInterests.commodities as number[]) || []
  );
  const [selectedStates, setSelectedStates] = useState<number[]>(
    (initialInterests.states as number[]) || []
  );
  const [selectedMarkets, setSelectedMarkets] = useState<number[]>(
    (initialInterests.markets as number[]) || []
  );
  
  // Notification preferences
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(true);
  const [reportsEnabled, setReportsEnabled] = useState(true);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestFrequency, setDigestFrequency] = useState('weekly');

  useEffect(() => {
    // Save progress to database when step changes
    if (currentStep !== initialStep) {
      saveProgress();
    }
  }, [currentStep]);

  const saveProgress = async () => {
    setSaving(true);
    try {
      await supabase.rpc('update_onboarding_step', { step: currentStep });
      
      // Also update profile with current selections
      const interests = {
        commodities: selectedCommodities,
        states: selectedStates,
        markets: selectedMarkets,
      };
      
      await supabase
        .from('profiles')
        .update({ 
          full_name: fullName || null,
          interests,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save final interests
      const interests = {
        commodities: selectedCommodities,
        states: selectedStates,
        markets: selectedMarkets,
      };
      
      await supabase
        .from('profiles')
        .update({ 
          full_name: fullName || null,
          interests,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      // Create notification preferences
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: profile.id,
          price_alerts_enabled: priceAlertsEnabled,
          price_alerts_channels: priceAlertsEnabled ? ['email'] : [],
          reports_enabled: reportsEnabled,
          reports_channels: reportsEnabled ? ['email'] : [],
          system_enabled: systemEnabled,
          system_channels: systemEnabled ? ['email'] : [],
          marketing_enabled: marketingEnabled,
          marketing_channels: marketingEnabled ? ['email'] : [],
          digest_enabled: digestEnabled,
          digest_frequency: digestFrequency,
        });

      // Save selected commodities as saved items
      if (selectedCommodities.length > 0) {
        const savedCommodities = selectedCommodities.map(commodityId => ({
          user_id: profile.id,
          commodity_id: commodityId,
        }));
        await supabase.from('saved_commodities').insert(savedCommodities);
      }

      // Save selected markets as saved items
      if (selectedMarkets.length > 0) {
        const savedMarkets = selectedMarkets.map(marketId => ({
          user_id: profile.id,
          market_id: marketId,
        }));
        await supabase.from('saved_markets').insert(savedMarkets);
      }

      // Mark onboarding as complete
      await supabase.rpc('complete_onboarding');

      // Redirect to dashboard
      router.push('/client');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommodity = (id: number) => {
    setSelectedCommodities(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleMarket = (id: number) => {
    setSelectedMarkets(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleState = (id: number) => {
    setSelectedStates(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#103C2D] to-[#0B2A20] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                      isComplete
                        ? 'bg-[#1D805A] border-[#1D805A] text-white'
                        : isActive
                        ? 'bg-white border-[#C7A45A] text-[#C7A45A]'
                        : 'bg-white/10 border-white/20 text-white/40'
                    }`}
                  >
                    {isComplete ? <IconCheck className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`hidden md:block w-20 h-0.5 mx-2 ${
                        isComplete ? 'bg-[#1D805A]' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-[#EAF4EE] rounded-full flex items-center justify-center mx-auto mb-6">
                <IconUser className="w-10 h-10 text-[#1D805A]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Hatsi360
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Let's personalize your experience. Tell us a bit about yourself so we can tailor the platform to your needs.
              </p>
              
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 1: Interests - Commodities */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What commodities interest you?
              </h2>
              <p className="text-gray-600 mb-6">
                Select the agricultural commodities you want to track. We'll personalize your dashboard and alerts.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {commodities.map((commodity) => (
                  <button
                    key={commodity.id}
                    onClick={() => toggleCommodity(commodity.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedCommodities.includes(commodity.id)
                        ? 'border-[#1D805A] bg-[#EAF4EE]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {commodity.name}
                      </span>
                      {selectedCommodities.includes(commodity.id) && (
                        <IconCheck className="w-5 h-5 text-[#1D805A]" />
                      )}
                    </div>
                    {commodity.category && (
                      <span className="text-xs text-gray-500 capitalize">
                        {commodity.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <p className="text-sm text-gray-500">
                {selectedCommodities.length} commodit{selectedCommodities.length === 1 ? 'y' : 'ies'} selected
              </p>
            </div>
          )}

          {/* Step 2: Markets */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Which regions and markets matter to you?
              </h2>
              <p className="text-gray-600 mb-6">
                Select states and specific markets to focus your price monitoring.
              </p>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">States</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {states.slice(0, 12).map((state) => (
                    <button
                      key={state.id}
                      onClick={() => toggleState(state.id)}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        selectedStates.includes(state.id)
                          ? 'border-[#1D805A] bg-[#EAF4EE] font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {state.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Markets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {markets.slice(0, 20).map((market) => (
                    <button
                      key={market.id}
                      onClick={() => toggleMarket(market.id)}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        selectedMarkets.includes(market.id)
                          ? 'border-[#1D805A] bg-[#EAF4EE]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{market.name}</div>
                      {market.state && (
                        <div className="text-xs text-gray-500">{market.state}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                {selectedStates.length} states, {selectedMarkets.length} markets selected
              </p>
            </div>
          )}

          {/* Step 3: Notifications */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                How should we notify you?
              </h2>
              <p className="text-gray-600 mb-6">
                Configure which notifications you'd like to receive.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={priceAlertsEnabled}
                    onChange={(e) => setPriceAlertsEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Price Alerts</div>
                    <div className="text-sm text-gray-600">
                      Get notified when prices reach your target thresholds
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={reportsEnabled}
                    onChange={(e) => setReportsEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Market Reports</div>
                    <div className="text-sm text-gray-600">
                      Receive new market research and analysis
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={systemEnabled}
                    onChange={(e) => setSystemEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">System Updates</div>
                    <div className="text-sm text-gray-600">
                      Important platform updates and maintenance notifications
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={marketingEnabled}
                    onChange={(e) => setMarketingEnabled(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Product Updates & Offers</div>
                    <div className="text-sm text-gray-600">
                      New features, tips, and special offers (optional)
                    </div>
                  </div>
                </label>

                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={digestEnabled}
                      onChange={(e) => setDigestEnabled(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">Email Digest</div>
                      <div className="text-sm text-gray-600 mb-2">
                        Receive a summary of market activity
                      </div>
                      {digestEnabled && (
                        <select
                          value={digestFrequency}
                          onChange={(e) => setDigestFrequency(e.target.value)}
                          className="mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D805A] focus:border-transparent"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-[#1D805A] rounded-full flex items-center justify-center mx-auto mb-6">
                <IconCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                You're all set!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Your personalized dashboard is ready. We've saved your preferences and you can change them anytime in settings.
              </p>
              
              <div className="bg-[#EAF4EE] rounded-lg p-6 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">What's next?</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <IconCheck className="w-5 h-5 text-[#1D805A] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Your dashboard is personalized with your selected commodities and markets</span>
                  </li>
                  <li className="flex items-start">
                    <IconCheck className="w-5 h-5 text-[#1D805A] mr-2 mt-0.5 flex-shrink-0" />
                    <span>You can create price alerts for your tracked commodities</span>
                  </li>
                  <li className="flex items-start">
                    <IconCheck className="w-5 h-5 text-[#1D805A] mr-2 mt-0.5 flex-shrink-0" />
                    <span>You'll receive notifications based on your preferences</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                disabled={loading || saving}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={loading || saving}
                className="px-6 py-3 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors font-medium flex items-center"
              >
                {saving ? 'Saving...' : 'Continue'}
                <IconArrowRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-8 py-3 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors font-medium flex items-center"
              >
                {loading ? 'Setting up...' : 'Go to Dashboard'}
                <IconArrowRight className="w-5 h-5 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
