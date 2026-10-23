import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getAgentSubmissions } from '@/lib/operations/agent';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'My prices — Field collection',
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Waiting for review',
  pending_verification: 'Waiting for review',
  verified: 'Approved',
  rejected: 'Rejected',
  correction_requested: 'Correction needed',
  legacy_unverified: 'Legacy — unverified',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-ink-100 text-ink-700',
  submitted: 'bg-blue-50 text-blue-800',
  pending_verification: 'bg-blue-50 text-blue-800',
  verified: 'bg-emerald-50 text-emerald-800',
  rejected: 'bg-red-50 text-red-800',
  correction_requested: 'bg-amber-50 text-amber-900',
  legacy_unverified: 'bg-amber-50 text-amber-900',
};

export default async function AgentSubmissionsPage() {
  const profile = await requireAgent('/agent/submissions');
  const submissions = await getAgentSubmissions(profile.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">My prices</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Every price you have sent, and what the reviewer said about it.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-ink-700">No prices sent yet</p>
          <p className="mt-1 text-xs text-ink-500">
            The prices you collect will appear here with their review status.
          </p>
          <Link
            href="/agent/collect"
            className="mt-3 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Collect a price
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {submissions.map((submission) => (
            <li key={submission.id} className="rounded-xl border border-ink-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-900">
                    {submission.commodityName} · {submission.marketName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {submission.reportedAmount === null
                      ? 'No amount recorded'
                      : `₦${submission.reportedAmount.toLocaleString('en-NG')}`}{' '}
                    per {submission.unitCode ?? 'unit not recorded'} ·{' '}
                    {submission.priceType.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    Collected {formatDateTime(submission.collectedAt)}
                    {submission.submittedAt
                      ? ` · sent ${formatDateTime(submission.submittedAt)}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    STATUS_TONE[submission.verificationStatus] ?? 'bg-ink-100 text-ink-700'
                  }`}
                >
                  {STATUS_LABELS[submission.verificationStatus] ??
                    submission.verificationStatus.replace(/_/g, ' ')}
                </span>
              </div>

              {submission.reviewerNote ? (
                <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-700">
                  <span className="font-semibold">Reviewer:</span> {submission.reviewerNote}
                </p>
              ) : null}

              {submission.qualityFlags.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {submission.qualityFlags.map((flag) => (
                    <li
                      key={flag}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                    >
                      {flag.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              ) : null}

              {submission.verificationStatus === 'correction_requested' ? (
                <Link
                  href="/agent/collect"
                  className="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Collect the corrected price
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
