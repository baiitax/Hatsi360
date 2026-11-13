import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldHome } from '@/lib/operations/field';
import { channelStatus } from '@/lib/notifications';
import { ProfileForm } from '@/components/agent/ProfileForm';
import { FieldCard, FieldDetailRow, FieldSection } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'Profile — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The agent's own account.
 *
 * The page shows what the agent is allowed to change and what they are not.
 * The role, the account state and the assignments are read-only here, and
 * the database refuses a write to them in any case.
 */
export default async function AgentProfilePage() {
  const profile = await requireAgent('/agent/profile');
  const [home, channels] = await Promise.all([getFieldHome(profile.id), Promise.resolve(channelStatus())]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">My profile</h1>
        <p className="mt-0.5 text-sm text-ink-500">Your account and your assignments.</p>
      </header>

      <FieldSection title="Your details">
        <FieldCard>
          <ProfileForm
            fullName={profile.fullName ?? ''}
            alternatePhone={home.alternatePhone ?? ''}
          />
        </FieldCard>
      </FieldSection>

      <FieldSection title="Your account">
        <FieldCard>
          <dl>
            <FieldDetailRow label="Email">{profile.email}</FieldDetailRow>
            {profile.phone ? (
              <FieldDetailRow label="Phone">{profile.phone}</FieldDetailRow>
            ) : null}
            <FieldDetailRow label="Role">
              <span className="capitalize">{profile.role.replace(/_/g, ' ')}</span>
            </FieldDetailRow>
            <FieldDetailRow label="Account state">
              {profile.accountStatus === 'active'
                ? 'Active'
                : profile.accountStatus === 'suspended'
                  ? 'Suspended — contact your supervisor'
                  : 'Deactivated'}
            </FieldDetailRow>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
            Your role, account state and assignments are set by the office. They cannot be changed
            from this app, and the database refuses the attempt even if the request is made by
            hand.
          </p>
        </FieldCard>
      </FieldSection>

      <FieldSection title="Your markets">
        <FieldCard>
          {home.markets.length === 0 ? (
            <p className="text-xs text-ink-500">
              You have no market assigned. You can only collect at a market assigned to you.
            </p>
          ) : (
            <ul className="space-y-2">
              {home.markets.map((market) => (
                <li
                  key={market.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/agent/markets/${market.id}`}
                    className="font-semibold text-ink-900 underline underline-offset-2"
                  >
                    {market.name}
                  </Link>
                  <span className="text-xs text-ink-500">{market.commodityCount} commodity(s)</span>
                </li>
              ))}
            </ul>
          )}
        </FieldCard>
      </FieldSection>

      <FieldSection title="How you are notified">
        <FieldCard>
          <ul className="space-y-1.5">
            {channels.map((channel) => (
              <li key={channel.channel} className="flex items-center justify-between text-sm">
                <span className="capitalize text-ink-700">{channel.channel}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    channel.configured
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {channel.configured ? 'On' : 'Not available'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Messages always arrive in the app. Email, SMS and WhatsApp become available when the
            office connects a provider.
          </p>
        </FieldCard>
      </FieldSection>

      <div className="space-y-2">
        <Link
          href="/agent/notifications"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-800"
        >
          My notifications
        </Link>
        <Link
          href="/agent/help"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-800"
        >
          Help
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ink-900 px-4 py-3 text-sm font-bold text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
