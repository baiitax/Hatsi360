import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { getSystemSettings } from '@/lib/operations/admin';
import { channelStatus } from '@/lib/notifications';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { SettingsEditor } from '@/components/admin/SettingsEditor';

export const metadata: Metadata = {
  title: 'Settings — Control Centre',
  robots: { index: false, follow: false },
};

function readSetting(settings: Record<string, unknown>, key: string, fallback: string): string {
  const value = settings[key];
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export default async function SettingsPage() {
  await requireAdmin('/admin/settings');

  const settings = await getSystemSettings();
  const channels = channelStatus();

  return (
    <>
      <PageHeader
        title="Settings"
        description="The operational settings of the price network. Every change is written to the audit trail with the person who made it."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Settings' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Business" description="How the operation presents itself and what it publishes.">
          <SettingsEditor
            settingKey="business.name"
            label="Operation name"
            description="Shown in the field app and on the public price pages."
            value={readSetting(settings, 'business.name', 'GonaPulse')}
          />
          <SettingsEditor
            settingKey="business.currency"
            label="Default currency"
            description="ISO code. Prices are stored in this currency."
            value={readSetting(settings, 'business.currency', 'NGN')}
          />
          <SettingsEditor
            settingKey="business.support_email"
            label="Support email"
            description="Shown to the public on the contact page."
            value={readSetting(settings, 'business.support_email', '')}
          />
          <SettingsEditor
            settingKey="business.operating_timezone"
            label="Operating timezone"
            description="The timezone every collection day and deadline is measured in."
            value={readSetting(settings, 'business.operating_timezone', 'Africa/Lagos')}
          />
        </Panel>

        <Panel title="Collection" description="The defaults the collection plan and the field app use.">
          <SettingsEditor
            settingKey="collection.default_deadline"
            label="Default deadline time"
            description="Local time of day by which a collection is expected."
            value={readSetting(settings, 'collection.default_deadline', '16:00')}
          />
          <SettingsEditor
            settingKey="collection.freshness_window_hours"
            label="Freshness window (hours)"
            description="How long a price stays inside its freshness window before it is reported as stale."
            type="number"
            value={readSetting(settings, 'collection.freshness_window_hours', '72')}
          />
          <SettingsEditor
            settingKey="collection.max_submission_age_hours"
            label="Maximum submission age (hours)"
            description="How long after collection a price may still be submitted."
            type="number"
            value={readSetting(settings, 'collection.max_submission_age_hours', '72')}
          />
          <SettingsEditor
            settingKey="collection.evidence_required_by_default"
            label="Evidence required by default"
            description="Whether a new schedule asks the agent for supporting evidence."
            type="boolean"
            value={readSetting(settings, 'collection.evidence_required_by_default', 'false')}
          />
        </Panel>

        <Panel title="Verification" description="The rules the review queue applies.">
          <SettingsEditor
            settingKey="verification.approval_ceiling"
            label="Approval ceiling"
            description="Prices above this amount need a supervisor as well as an officer to approve."
            value={readSetting(settings, 'verification.approval_ceiling', '')}
          />
          <SettingsEditor
            settingKey="verification.auto_publish"
            label="Publish automatically after approval"
            description="Off by default. Approval and publication are separate acts, and this setting does not change that."
            type="boolean"
            value={readSetting(settings, 'verification.auto_publish', 'false')}
          />
          <SettingsEditor
            settingKey="verification.quality_threshold_ratio"
            label="Outlier threshold (ratio)"
            description="How far a price may sit from the comparable median before it is flagged, e.g. 0.35 for 35%."
            value={readSetting(settings, 'verification.quality_threshold_ratio', '0.35')}
          />
        </Panel>

        <Panel title="Security" description="Access control for the operational workspaces.">
          <SettingsEditor
            settingKey="security.session_minutes"
            label="Session length (minutes)"
            description="How long an operational session stays valid before it must be signed in again."
            type="number"
            value={readSetting(settings, 'security.session_minutes', '480')}
          />
          <SettingsEditor
            settingKey="security.sign_in_max_failures"
            label="Sign-in attempts before a lockout"
            description="Failed attempts are counted against a hashed identifier, never against an address."
            type="number"
            value={readSetting(settings, 'security.sign_in_max_failures', '5')}
          />
          <SettingsEditor
            settingKey="security.require_agent_market_assignment"
            label="Require a market assignment"
            description="An agent cannot submit a price at a market they are not assigned to."
            type="boolean"
            value={readSetting(settings, 'security.require_agent_market_assignment', 'true')}
          />
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Integrations"
          description="The external channels the notification service can use. Credentials are environment variables, never settings, and are never shown here."
        >
          <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((channel) => (
              <li
                key={channel.channel}
                className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2"
              >
                <span className="text-sm font-medium text-ink-800">{channel.channel}</span>
                <Pill tone={channel.configured ? 'success' : 'neutral'}>
                  {channel.configured ? 'Configured' : 'Not configured'}
                </Pill>
              </li>
            ))}
          </ul>

          <p className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
            The in-app inbox is the only channel that is switched on. Email, SMS and WhatsApp are
            implemented as adapters with a documented boundary: they become active the moment a
            provider credential is present in the environment, and until then a notification is
            never reported as delivered to a channel that did not deliver it.
          </p>
        </Panel>
      </div>
    </>
  );
}
