/**
 * Evidence Citation Badge
 *
 * Displays the provenance of a data point: which source provided it,
 * when it was retrieved, and with what confidence level.
 *
 * This component enforces the core Phase 06 principle: every factual
 * market conclusion must be grounded in accessible evidence with
 * traceable sources, reporting dates, and methodology.
 */

interface EvidenceBadgeProps {
  sourceName: string;
  sourceType: 'government' | 'international_org' | 'academic' | 'industry' | 'media' | 'other';
  reliability: number;
  date: string;
  verificationStatus?: 'imported' | 'verified' | 'questionable' | 'deprecated';
  className?: string;
}

export function EvidenceBadge({
  sourceName,
  sourceType,
  reliability,
  date,
  verificationStatus = 'imported',
  className = '',
}: EvidenceBadgeProps) {
  const reliabilityColor =
    reliability >= 0.9 ? 'text-green-700 bg-green-50 border-green-200' :
    reliability >= 0.7 ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-red-700 bg-red-50 border-red-200';

  const statusIcon = {
    verified: '✓',
    imported: '•',
    questionable: '?',
    deprecated: '✗',
  }[verificationStatus];

  const statusColor = {
    verified: 'text-green-600',
    imported: 'text-blue-600',
    questionable: 'text-amber-600',
    deprecated: 'text-neutral-400 line-through',
  }[verificationStatus];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${reliabilityColor} ${className}`}
      title={`Source: ${sourceName} (${sourceType})\nReliability: ${Math.round(reliability * 100)}%\nDate: ${date}\nStatus: ${verificationStatus}`}
    >
      <span className={statusColor}>{statusIcon}</span>
      <span className="font-medium">{sourceName}</span>
      <span className="opacity-60">•</span>
      <span className="opacity-70">{new Date(date).getFullYear()}</span>
    </span>
  );
}

/**
 * Evidence Source Card — for displaying full source information
 * in detailed views (commodity profiles, reports, etc.)
 */
interface EvidenceSourceCardProps {
  sourceName: string;
  organization: string;
  url: string | null;
  sourceType: string;
  reliability: number;
  licenseType: string | null;
  lastSyncAt: string | null;
}

export function EvidenceSourceCard({
  sourceName,
  organization,
  url,
  sourceType,
  reliability,
  licenseType,
  lastSyncAt,
}: EvidenceSourceCardProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-neutral-900">{sourceName}</h4>
          <p className="text-xs text-neutral-500">{organization}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <div
              className={`h-2 w-2 rounded-full ${
                reliability >= 0.9 ? 'bg-green-500' :
                reliability >= 0.7 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
            />
            <span className="text-xs font-medium text-neutral-700">
              {Math.round(reliability * 100)}%
            </span>
          </div>
          <span className="text-xs text-neutral-400">{sourceType.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        {licenseType && <span>License: {licenseType.replace(/_/g, ' ')}</span>}
        {lastSyncAt && <span>Updated: {new Date(lastSyncAt).toLocaleDateString()}</span>}
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          View source →
        </a>
      )}
    </div>
  );
}
