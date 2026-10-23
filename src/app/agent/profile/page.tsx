import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getAgentHome } from '@/lib/operations/agent';
import { channelStatus } from '@/lib/notifications';

export const metadata: Metadata = {
  title: 'Profile — Field collection',
  robots: { index: false, follow: false },
};

export default async function AgentProfilePage() {
  const profile = await requireAgent('/agent/profile');
  const home = await getAgentHome(profile.id);
  const channels = channelStatus();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">My profile</h1>
        <p className="mt-0.5 text-sm text-ink-500">Your account and your assignments.</p>
      </div>

      <section className="card p-4">
        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Name</dt>
            <dd className="text-sm font-medium text-ink-900">
              {profile.fullName ?? 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Email</dt>
            <dd className="text-sm font-medium text-ink-900">{profile.email}</dd>
          </div>
          {profile.phone ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Phone
              </dt>
              <dd className="text-sm font-medium text-ink-900">{profile.phone}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Role</dt>
            <dd className="text-sm font-medium text-ink-900">
              {profile.role.replace(/_/g, ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Account state
            </dt>
            <dd className="text-sm font-medium text-ink-900">
              {profile.accountStatus === 'active'
                ? 'Active'
                : profile.accountStatus === 'suspended'
                  ? 'Suspended — contact your supervisor'
                  : 'Deactivated'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-bold text-ink-900">My markets</h2>
        {home.markets.length === 0 ? (
          <p className="mt-2 text-xs text-ink-500">
            You have no market assigned. You can only collect at a market assigned to you.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {home.markets.map((market) => (
              <li key={market.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink-900">{market.name}</span>
                <span className="text-xs text-ink-500">
                  {market.commodityCount} commodity(s)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-bold text-ink-900">How you are notified</h2>
        <ul className="mt-2 space-y-1.5">
          {channels.map((channel) => (
            <li key={channel.channel} className="flex items-center justify-between text-sm">
              <span className="text-ink-700">{channel.channel}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  channel.configured
                    ? 'bg-emerald-50 text-emerald-800'
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
      </section>

      <div className="space-y-2">
        <Link
          href="/agent/notifications"
          className="block rounded-xl border border-ink-200 bg-white px-4 py-3 text-center text-sm font-semibold text-ink-800"
        >
          My notifications
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
