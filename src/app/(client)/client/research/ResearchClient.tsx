'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  Filter,
  Sparkles,
  Calendar,
  BookOpen,
  X,
  ArrowLeft,
  Clock,
  Download,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Report {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  body?: string;
  is_premium: boolean;
  published_at?: string;
  created_at?: string;
  commodity_id?: number;
  market_id?: number;
  commodity?: { id: number; name: string; slug: string } | null;
  market?: { id: number; name: string; slug: string } | null;
  is_subscribed: boolean;
}

interface Commodity {
  id: number;
  name: string;
  slug: string;
}

interface ResearchClientProps {
  reports: Report[];
  commodities: Commodity[];
  subscribedCount: number;
}

type SortBy = 'newest' | 'oldest' | 'title';
type ReportFilter = 'all' | 'free' | 'premium' | 'subscribed';

// ─── Component ─────────────────────────────────────────────────────────────

export function ResearchClient({ reports, commodities, subscribedCount }: ResearchClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterBy, setFilterBy] = useState<ReportFilter>('all');
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filter and sort reports
  const filtered = useMemo(() => {
    let result = [...reports];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) =>
        r.title.toLowerCase().includes(query) ||
        r.summary?.toLowerCase().includes(query) ||
        r.commodity?.name.toLowerCase().includes(query) ||
        r.market?.name.toLowerCase().includes(query)
      );
    }

    // Filter by type
    switch (filterBy) {
      case 'free':
        result = result.filter((r) => !r.is_premium);
        break;
      case 'premium':
        result = result.filter((r) => r.is_premium);
        break;
      case 'subscribed':
        result = result.filter((r) => r.is_subscribed);
        break;
    }

    // Filter by commodity
    if (selectedCommodity) {
      result = result.filter((r) => r.commodity_id === selectedCommodity);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.published_at || a.created_at || 0).getTime() - new Date(b.published_at || b.created_at || 0).getTime());
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [reports, searchQuery, sortBy, filterBy, selectedCommodity]);

  // Featured reports (first 3 premium or most recent)
  const featured = useMemo(() => {
    return reports
      .filter((r) => r.is_premium || r.summary)
      .slice(0, 3);
  }, [reports]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#17241F]">Research & Reports</h1>
        <p className="text-sm text-[#64736B] mt-1">
          Market analysis, commodity research, and trade intelligence
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Available Reports</p>
          <p className="text-2xl font-bold text-[#17241F]">{reports.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">My Subscriptions</p>
          <p className="text-2xl font-bold text-[#1D805A]">{subscribedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Free Reports</p>
          <p className="text-2xl font-bold text-[#17241F]">{reports.filter((r) => !r.is_premium).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
          <p className="text-xs text-[#64736B] mb-1">Premium Reports</p>
          <p className="text-2xl font-bold text-[#C7A45A]">{reports.filter((r) => r.is_premium).length}</p>
        </div>
      </div>

      {/* Featured Reports */}
      {featured.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#17241F] mb-3">Featured Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="text-left bg-gradient-to-br from-[#103C2D] to-[#0B2A20] rounded-xl p-5 text-white hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  {report.is_premium && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C7A45A]/20 text-[#C7A45A] text-[10px] font-semibold rounded-full">
                      <Sparkles className="w-2.5 h-2.5" />
                      PREMIUM
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold mb-2 line-clamp-2 group-hover:text-[#C7A45A] transition-colors">
                  {report.title}
                </h3>
                {report.summary && (
                  <p className="text-xs text-white/60 line-clamp-2 mb-3">{report.summary}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  {report.commodity?.name && <span>{report.commodity.name}</span>}
                  {report.published_at && (
                    <span>· {new Date(report.published_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E3EAE5] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64736B]" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] placeholder:text-[#64736B] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1">
            {([
              { value: 'all', label: 'All' },
              { value: 'free', label: 'Free' },
              { value: 'premium', label: 'Premium' },
              { value: 'subscribed', label: 'Subscribed' },
            ] as { value: ReportFilter; label: string }[]).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterBy(tab.value)}
                className={`h-10 px-3 text-xs font-medium rounded-lg transition-colors ${
                  filterBy === tab.value
                    ? 'bg-[#1D805A] text-white'
                    : 'bg-[#F7F9F7] text-[#64736B] hover:bg-[#EAF4EE]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Commodity filter */}
          <select
            value={selectedCommodity || ''}
            onChange={(e) => setSelectedCommodity(e.target.value ? Number(e.target.value) : null)}
            className="h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
          >
            <option value="">All Commodities</option>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-10 px-3 text-sm bg-[#F7F9F7] border border-[#E3EAE5] rounded-lg text-[#17241F] focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:border-[#1D805A]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-[#64736B]">
        Showing {filtered.length} of {reports.length} reports
      </p>

      {/* Reports List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} onRead={() => setSelectedReport(report)} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3EAE5] p-12 text-center">
          <FileText className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
          <p className="text-[#64736B] font-medium">No reports found</p>
          <p className="text-xs text-[#64736B] mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Report Reader Modal */}
      {selectedReport && (
        <ReportReader report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}

// ─── Report Card ───────────────────────────────────────────────────────────

function ReportCard({ report, onRead }: { report: Report; onRead: () => void }) {
  // Estimate reading time (average 200 words per minute, ~5 chars per word)
  const wordCount = report.body ? report.body.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="bg-white rounded-xl border border-[#E3EAE5] p-5 hover:shadow-sm hover:border-[#1D805A]/20 transition-all">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="hidden sm:flex w-10 h-10 rounded-lg bg-[#EAF4EE] items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-[#1D805A]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {report.is_premium && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#C7A45A]/10 text-[#C7A45A] text-[9px] font-semibold rounded">
                <Sparkles className="w-2.5 h-2.5" />
                PREMIUM
              </span>
            )}
            {report.is_subscribed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#1D805A]/10 text-[#1D805A] text-[9px] font-semibold rounded">
                <Bookmark className="w-2.5 h-2.5" />
                SUBSCRIBED
              </span>
            )}
          </div>

          <button
            onClick={onRead}
            className="text-left w-full"
          >
            <h3 className="text-sm font-semibold text-[#17241F] hover:text-[#1D805A] transition-colors mb-1">
              {report.title}
            </h3>
          </button>

          {report.summary && (
            <p className="text-xs text-[#64736B] line-clamp-2 mb-2">{report.summary}</p>
          )}

          <div className="flex items-center gap-3 text-[10px] text-[#64736B]">
            {report.commodity?.name && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-[#F7F9F7] rounded">
                {report.commodity.name}
              </span>
            )}
            {report.market?.name && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-[#F7F9F7] rounded">
                {report.market.name}
              </span>
            )}
            {report.published_at && (
              <span className="flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(report.published_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
            {wordCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {readingTime} min read
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onRead}
          className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1D805A] bg-[#EAF4EE] rounded-lg hover:bg-[#1D805A] hover:text-white transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Read
        </button>
      </div>
    </div>
  );
}

// ─── Report Reader Modal ───────────────────────────────────────────────────

function ReportReader({ report, onClose }: { report: Report; onClose: () => void }) {
  const [expanded, setExpanded] = useState(true);

  // Close on escape
  if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') onClose();
    }, { once: true });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-12 pb-12 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E3EAE5] px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {report.is_premium && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#C7A45A]/10 text-[#C7A45A] text-[9px] font-semibold rounded">
                    <Sparkles className="w-2.5 h-2.5" />
                    PREMIUM
                  </span>
                )}
                {report.published_at && (
                  <span className="text-[10px] text-[#64736B]">
                    {new Date(report.published_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-[#17241F]">{report.title}</h2>
              {report.commodity?.name && (
                <p className="text-xs text-[#64736B] mt-0.5">{report.commodity.name}{report.market?.name ? ` · ${report.market.name}` : ''}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#64736B] hover:text-[#17241F] hover:bg-[#F7F9F7] rounded-lg transition-colors"
              aria-label="Close report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Summary */}
          {report.summary && (
            <div className="mb-6 p-4 bg-[#EAF4EE] rounded-lg border border-[#1D805A]/10">
              <h3 className="text-xs font-semibold text-[#103C2D] uppercase tracking-wider mb-2">Summary</h3>
              <p className="text-sm text-[#17241F] leading-relaxed">{report.summary}</p>
            </div>
          )}

          {/* Full Body */}
          {report.body ? (
            <div className="prose prose-sm max-w-none">
              <div
                className="text-sm text-[#17241F] leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formatReportBody(report.body) }}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-[#64736B]">
              <FileText className="w-12 h-12 text-[#E3EAE5] mx-auto mb-3" />
              <p className="font-medium">Full report content not available</p>
              <p className="text-xs mt-1">
                {report.is_premium
                  ? 'Upgrade to a premium plan to access this report'
                  : 'The full report body has not been published yet'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#E3EAE5] px-6 py-3 rounded-b-xl flex items-center justify-between">
          <div className="text-xs text-[#64736B]">
            {report.body && (
              <span>{report.body.split(/\s+/).length} words · ~{Math.max(1, Math.ceil(report.body.split(/\s+/).length / 200))} min read</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/reports/${report.slug}`}
              className="px-3 py-1.5 text-xs font-medium text-[#1D805A] bg-[#EAF4EE] rounded-lg hover:bg-[#1D805A] hover:text-white transition-colors"
            >
              Full Page View
            </Link>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#64736B] bg-[#F7F9F7] rounded-lg hover:bg-[#E3EAE5] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatReportBody(body: string): string {
  // Basic markdown-like formatting
  return body
    .split('\n\n')
    .map((paragraph) => {
      if (paragraph.startsWith('### ')) {
        return `<h3 class="text-base font-semibold text-[#17241F] mt-6 mb-2">${paragraph.slice(4)}</h3>`;
      }
      if (paragraph.startsWith('## ')) {
        return `<h2 class="text-lg font-bold text-[#17241F] mt-8 mb-3">${paragraph.slice(3)}</h2>`;
      }
      if (paragraph.startsWith('# ')) {
        return `<h1 class="text-xl font-bold text-[#17241F] mt-8 mb-4">${paragraph.slice(2)}</h1>`;
      }
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        const items = paragraph.split('\n').map((line) => `<li>${line.replace(/^[-*] /, '')}</li>`).join('');
        return `<ul class="list-disc pl-5 my-3 space-y-1">${items}</ul>`;
      }
      return `<p class="mb-3">${paragraph}</p>`;
    })
    .join('');
}
