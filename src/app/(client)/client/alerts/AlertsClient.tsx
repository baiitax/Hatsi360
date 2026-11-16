'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Bell,
  Plus,
  X,
  Trash2,
  Pause,
  Play,
  Edit2,
  ArrowRight,
  AlertCircle,
  Check,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import {
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
} from '../actions/intelligence';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Alert {
  id: number;
  direction: 'above' | 'below' | 'any';
  threshold_amount?: number;
  threshold_percent?: number;
  channel: string;
  is_active: boolean;
  last_triggered_at?: string;
  created_at: string;
  commodity?: { id: number; name: string; slug: string } | null;
  market?: { id: number; name: string; slug: string } | null;
}

interface Commodity {
  id: number;
  name: string;
  slug: string;
}

interface Market {
  id: number;
  name: string;
  slug: string;
}

interface TriggerLog {
  id: number;
  triggered_at: string;
  trigger_type: string;
  observation_value?: number;
  commodity?: { name: string } | null;
  market?: { name: string } | null;
}

interface AlertsClientProps {
  alerts: Alert[];
  commodities: Commodity[];
  markets: Market[];
  triggerLogs: TriggerLog[];
  hasEntitlement: boolean;
  alertCount: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AlertsClient({
  alerts,
  commodities,
  markets,
  triggerLogs,
  hasEntitlement,
  alertCount,
}: AlertsClientProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeAlerts = alerts.filter((a) => a.is_active);
  const inactiveAlerts = alerts.filter((a) => !a.is_active);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateAlert = (data: {
    commodityId: number;
    marketId?: number;
    direction: 'above' | 'below' | 'any';
    thresholdAmount?: number;
    thresholdPercent?: number;
    channel: 'email' | 'sms' | 'webhook';
  }) => {
    startTransition(async () => {
      const result = await createPriceAlert(data);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Alert created successfully');
        setShowCreateForm(false);
      }
    });
  };

  const handleUpdateAlert = (alertId: number, data: { isActive?: boolean }) => {
    startTransition(async () => {
      const result = await updatePriceAlert(alertId, data);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(data.isActive === false ? 'Alert paused' : 'Alert resumed');
      }
    });
  };

  const handleDeleteAlert = (alertId: number) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    startTransition(async () => {
      const result = await deletePriceAlert(alertId);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Alert deleted');
      }
    });
  };

  if (!hasEntitlement) {
    return (
      <div className="space-y-6 max-w-[1600px]">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">Price Alerts</h1>
          <p className="text-sm text-[#64736B] mt-1">Get notified when prices reach your targets</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
          <Bell className="w-12 h-12 text-[#C7A45A] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#17241F] mb-2">Premium Feature</h2>
          <p className="text-sm text-[#64736B] mb-4 max-w-md mx-auto">
            Price alerts notify you when commodity prices reach your target thresholds.
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
        <div className={`fixed top-4 right-4 z-[300] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-[#1D805A] text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">Price Alerts</h1>
          <p className="text-sm text-[#64736B] mt-1">
            Get notified when prices reach your target thresholds
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={alertCount >= 50}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D805A] text-white text-sm font-medium rounded-lg hover:bg-[#103C2D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Active Alerts</p>
          <p className="text-2xl font-bold text-[#1D805A]">{activeAlerts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Paused Alerts</p>
          <p className="text-2xl font-bold text-[#64736B]">{inactiveAlerts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Total Alerts</p>
          <p className="text-2xl font-bold text-[#17241F]">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Limit</p>
          <p className="text-2xl font-bold text-[#17241F]">{alertCount}/50</p>
          <div className="w-full h-1.5 bg-[#E3EAE5] rounded-full mt-1">
            <div
              className={`h-full rounded-full transition-all ${alertCount >= 45 ? 'bg-red-500' : alertCount >= 30 ? 'bg-amber-500' : 'bg-[#1D805A]'}`}
              style={{ width: `${Math.min(100, (alertCount / 50) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div>
        <h2 className="text-sm font-semibold text-[#17241F] mb-3">Active Alerts</h2>
        {activeAlerts.length > 0 ? (
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPause={() => handleUpdateAlert(alert.id, { isActive: false })}
                onDelete={() => handleDeleteAlert(alert.id)}
                onEdit={() => setEditingAlert(alert)}
                isPending={isPending}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E3EAE5] p-8 text-center">
            <Bell className="w-8 h-8 text-[#E3EAE5] mx-auto mb-2" />
            <p className="text-sm text-[#64736B]">No active alerts</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-xs text-[#1D805A] font-medium hover:underline mt-1"
            >
              Create your first alert
            </button>
          </div>
        )}
      </div>

      {/* Paused Alerts */}
      {inactiveAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#17241F] mb-3">Paused Alerts</h2>
          <div className="space-y-2">
            {inactiveAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResume={() => handleUpdateAlert(alert.id, { isActive: true })}
                onDelete={() => handleDeleteAlert(alert.id)}
                onEdit={() => setEditingAlert(alert)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Trigger History */}
      {triggerLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#17241F] mb-3">Recent Trigger History</h2>
          <div className="bg-white rounded-xl border border-[#E3EAE5] divide-y divide-[#E3EAE5]">
            {triggerLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#17241F] truncate">
                    {log.commodity?.name} — {log.market?.name}
                  </p>
                  <p className="text-[10px] text-[#64736B]">
                    {log.trigger_type} {log.observation_value && `· ₦${log.observation_value.toLocaleString()}`}
                  </p>
                </div>
                <span className="text-[10px] text-[#64736B]">
                  {new Date(log.triggered_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Alert Modal */}
      {showCreateForm && (
        <CreateAlertModal
          commodities={commodities}
          markets={markets}
          onCreate={handleCreateAlert}
          onClose={() => setShowCreateForm(false)}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ─── Alert Card ────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onPause,
  onResume,
  onDelete,
  onEdit,
  isPending,
}: {
  alert: Alert;
  onPause?: () => void;
  onResume?: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isPending: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 transition-all group ${
      alert.is_active ? 'border-[#E3EAE5] hover:shadow-sm' : 'border-[#E3EAE5] opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        {/* Direction icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          alert.direction === 'above'
            ? 'bg-emerald-50 text-emerald-600'
            : alert.direction === 'below'
            ? 'bg-red-50 text-red-600'
            : 'bg-blue-50 text-blue-600'
        }`}>
          {alert.direction === 'above' ? (
            <TrendingUp className="w-4 h-4" />
          ) : alert.direction === 'below' ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#17241F] truncate">
            {alert.commodity?.name}
            {alert.market?.name && ` @ ${alert.market.name}`}
          </p>
          <p className="text-xs text-[#64736B]">
            {alert.direction === 'any' ? 'Price change' : `Price goes ${alert.direction}`}
            {alert.threshold_amount && ` · ₦${alert.threshold_amount.toLocaleString()}`}
            {alert.threshold_percent && ` · ${alert.threshold_percent}%`}
            {` · via ${alert.channel}`}
          </p>
        </div>

        {/* Last triggered */}
        {alert.last_triggered_at && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-[#64736B]">
            <Clock className="w-3 h-3" />
            {new Date(alert.last_triggered_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {alert.is_active && onPause && (
            <button
              onClick={onPause}
              disabled={isPending}
              className="p-1.5 text-[#64736B] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Pause alert"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {!alert.is_active && onResume && (
            <button
              onClick={onResume}
              disabled={isPending}
              className="p-1.5 text-[#64736B] hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Resume alert"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={isPending}
            className="p-1.5 text-[#64736B] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete alert"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Alert Modal ────────────────────────────────────────────────────

function CreateAlertModal({
  commodities,
  markets,
  onCreate,
  onClose,
  isPending,
}: {
  commodities: Commodity[];
  markets: Market[];
  onCreate: (data: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [commodityId, setCommodityId] = useState<number | ''>('');
  const [marketId, setMarketId] = useState<number | ''>('');
  const [direction, setDirection] = useState<'above' | 'below' | 'any'>('above');
  const [thresholdAmount, setThresholdAmount] = useState<string>('');
  const [thresholdPercent, setThresholdPercent] = useState<string>('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'webhook'>('email');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodityId) return;

    onCreate({
      commodityId: Number(commodityId),
      marketId: marketId ? Number(marketId) : undefined,
      direction,
      thresholdAmount: thresholdAmount ? Number(thresholdAmount) : undefined,
      thresholdPercent: thresholdPercent ? Number(thresholdPercent) : undefined,
      channel,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3EAE5]">
          <h3 className="text-sm font-semibold text-[#17241F]">Create Price Alert</h3>
          <button onClick={onClose} className="p-1 text-[#64736B] hover:text-[#17241F] rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Commodity */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Commodity *</label>
            <select
              value={commodityId}
              onChange={(e) => setCommodityId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            >
              <option value="">Select commodity...</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Market (optional) */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Market (optional)</label>
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            >
              <option value="">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Direction</label>
            <div className="flex gap-1">
              {(['above', 'below', 'any'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`flex-1 h-10 text-xs font-medium rounded-lg transition-colors capitalize ${
                    direction === d ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64736B] mb-1.5">Price (₦)</label>
              <input
                type="number"
                value={thresholdAmount}
                onChange={(e) => setThresholdAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64736B] mb-1.5">Change (%)</label>
              <input
                type="number"
                value={thresholdPercent}
                onChange={(e) => setThresholdPercent(e.target.value)}
                placeholder="e.g. 5"
                className="w-full h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
              />
            </div>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-[#64736B] mb-1.5">Notification Channel</label>
            <div className="flex gap-1">
              {(['email', 'sms', 'webhook'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`flex-1 h-10 text-xs font-medium rounded-lg transition-colors uppercase ${
                    channel === c ? 'bg-[#1D805A] text-white' : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 text-sm font-medium text-[#64736B] bg-[#F7F9F7] rounded-lg hover:bg-[#E3EAE5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !commodityId}
              className="flex-1 h-10 text-sm font-medium text-white bg-[#1D805A] rounded-lg hover:bg-[#103C2D] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
