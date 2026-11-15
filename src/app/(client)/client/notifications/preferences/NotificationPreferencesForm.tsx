'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconBell, IconCheck } from '@/components/ui/icons';

interface NotificationPreferences {
  id?: string;
  user_id: string;
  price_alerts_enabled: boolean;
  price_alerts_channels: string[];
  reports_enabled: boolean;
  reports_channels: string[];
  system_enabled: boolean;
  system_channels: string[];
  marketing_enabled: boolean;
  marketing_channels: string[];
  digest_enabled: boolean;
  digest_frequency: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
}

interface NotificationPreferencesFormProps {
  userId: string;
  existingPreferences: NotificationPreferences | null;
}

export function NotificationPreferencesForm({ 
  userId, 
  existingPreferences 
}: NotificationPreferencesFormProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: userId,
    price_alerts_enabled: existingPreferences?.price_alerts_enabled ?? true,
    price_alerts_channels: existingPreferences?.price_alerts_channels ?? ['email'],
    reports_enabled: existingPreferences?.reports_enabled ?? true,
    reports_channels: existingPreferences?.reports_channels ?? ['email'],
    system_enabled: existingPreferences?.system_enabled ?? true,
    system_channels: existingPreferences?.system_channels ?? ['email'],
    marketing_enabled: existingPreferences?.marketing_enabled ?? false,
    marketing_channels: existingPreferences?.marketing_channels ?? ['email'],
    digest_enabled: existingPreferences?.digest_enabled ?? false,
    digest_frequency: existingPreferences?.digest_frequency ?? 'weekly',
    quiet_hours_enabled: existingPreferences?.quiet_hours_enabled ?? false,
    quiet_hours_start: existingPreferences?.quiet_hours_start ?? '22:00',
    quiet_hours_end: existingPreferences?.quiet_hours_end ?? '07:00',
    quiet_hours_timezone: existingPreferences?.quiet_hours_timezone ?? 'Africa/Lagos',
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (category: keyof NotificationPreferences, channel: string) => {
    const channels = preferences[category] as string[];
    const updatedChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    
    setPreferences({
      ...preferences,
      [category]: updatedChannels,
    });
  };

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            {saved ? '✓ Preferences saved successfully' : 'Manage your notification preferences'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-[#1D805A] text-white rounded-lg hover:bg-[#103C2D] transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Price Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start mb-6">
          <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
            <IconBell className="w-5 h-5 text-[#1D805A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Price Alerts</h3>
            <p className="text-sm text-gray-600 mt-1">
              Get notified when commodities or markets reach your target prices
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={preferences.price_alerts_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                price_alerts_enabled: e.target.checked,
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1D805A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D805A]"></div>
          </label>
        </div>

        {preferences.price_alerts_enabled && (
          <div className="ml-11">
            <p className="text-sm font-medium text-gray-700 mb-2">Delivery Channels</p>
            <div className="flex gap-4">
              {['email', 'sms', 'webhook'].map((channel) => (
                <label key={channel} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.price_alerts_channels.includes(channel)}
                    onChange={() => toggleChannel('price_alerts_channels', channel)}
                    className="w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Market Reports */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start mb-6">
          <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
            <IconBell className="w-5 h-5 text-[#1D805A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Market Reports</h3>
            <p className="text-sm text-gray-600 mt-1">
              Receive new market research and analysis publications
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={preferences.reports_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                reports_enabled: e.target.checked,
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1D805A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D805A]"></div>
          </label>
        </div>

        {preferences.reports_enabled && (
          <div className="ml-11">
            <p className="text-sm font-medium text-gray-700 mb-2">Delivery Channels</p>
            <div className="flex gap-4">
              {['email', 'sms'].map((channel) => (
                <label key={channel} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.reports_channels.includes(channel)}
                    onChange={() => toggleChannel('reports_channels', channel)}
                    className="w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Notifications */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start mb-6">
          <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
            <IconBell className="w-5 h-5 text-[#1D805A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">System Updates</h3>
            <p className="text-sm text-gray-600 mt-1">
              Important platform updates, maintenance, and security notifications
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={preferences.system_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                system_enabled: e.target.checked,
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1D805A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D805A]"></div>
          </label>
        </div>

        {preferences.system_enabled && (
          <div className="ml-11">
            <p className="text-sm font-medium text-gray-700 mb-2">Delivery Channels</p>
            <div className="flex gap-4">
              {['email', 'sms'].map((channel) => (
                <label key={channel} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.system_channels.includes(channel)}
                    onChange={() => toggleChannel('system_channels', channel)}
                    className="w-4 h-4 text-[#1D805A] focus:ring-[#1D805A] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Marketing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start mb-6">
          <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
            <IconBell className="w-5 h-5 text-[#1D805A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Product Updates & Offers</h3>
            <p className="text-sm text-gray-600 mt-1">
              New features, tips, tutorials, and special offers
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={preferences.marketing_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                marketing_enabled: e.target.checked,
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#1D805A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1D805A]"></div>
          </label>
        </div>
      </div>

      {/* Email Digest */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start mb-6">
          <div className="p-2 bg-[#FFF3E0] rounded-lg mr-3">
            <IconBell className="w-5 h-5 text-[#C7A45A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Email Digest</h3>
            <p className="text-sm text-gray-600 mt-1">
              Receive a summary of market activity and price movements
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={preferences.digest_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                digest_enabled: e.target.checked,
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C7A45A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C7A45A]"></div>
          </label>
        </div>

        {preferences.digest_enabled && (
          <div className="ml-11">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-2 block">Frequency</span>
              <select
                value={preferences.digest_frequency}
                onChange={(e) => setPreferences({
                  ...preferences,
                  digest_frequency: e.target.value,
                })}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C7A45A] focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="never">Never</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start mb-6">
          <div className="p-2 bg-gray-100 rounded-lg mr-3">
            <IconBell className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Quiet Hours</h3>
            <p className="text-sm text-gray-600 mt-1">
              Pause non-critical notifications during specific hours
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={preferences.quiet_hours_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                quiet_hours_enabled: e.target.checked,
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600"></div>
          </label>
        </div>

        {preferences.quiet_hours_enabled && (
          <div className="ml-11 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">Start Time</span>
                <input
                  type="time"
                  value={preferences.quiet_hours_start || '22:00'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quiet_hours_start: e.target.value,
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">End Time</span>
                <input
                  type="time"
                  value={preferences.quiet_hours_end || '07:00'}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quiet_hours_end: e.target.value,
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">Timezone</span>
                <select
                  value={preferences.quiet_hours_timezone}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quiet_hours_timezone: e.target.value,
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                >
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
