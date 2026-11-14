import Link from 'next/link';
import type { Metadata } from 'next';
import { insights } from '@/lib/content/insights';
import { REPORTS } from '@/lib/content/reports';
import { formatDate } from '@/lib/money';
import { getInsightImage } from '@/lib/images/registry';
import { HatsiImage } from '@/components/media/HatsiImage';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import { EmptyStatePanel } from '@/components/feedback/TerminalFeedback';
import { IconBook, IconResearch } from '@/components/ui/icons';

export const metadata: Metadata = {
  title: 'Research',
  description:
    'Market briefs and published research from the Hatsi360 research desk on Nigerian agricultural markets — what the price data shows, and what it does not.',
  alternates: { canonical: '/insights' },
};

/**
 * Research.
 *
 * The long-form surface, and the one place the terminal uses the light
 * editorial environment rather than the dark one: a brief is read, not scanned,
 * and warm white with charcoal type is what a person can read for ten minutes.
 *
 * The desk's standing rule is stated on the page rather than buried in a
 * disclaimer: what was observed is separated from what it is thought to mean,
 * and no forecast is published. The previous site displayed a "Price Forecast"
 * figure on every commodity page without explaining how it was produced; that
 * is removed, and this page says so.
 */
export default function ResearchPage() {
  const undated = insights.filter((article) => !article.publishedAt).length;

  return (
    <PageContainer>
      <PageHeader
        title="Research"
        description="Analysis from the Hatsi360 research desk. We separate what we observed from what we think it means — and we do not publish forecasts."
        actions={
          <Link href="/reports" className="terminal-action">
            <IconResearch className="size-3.5" />
            Published reports
          </Link>
        }
      />

      {insights.length === 0 ? (
        <EmptyStatePanel
          kind="no-research"
          action={{ label: 'See the published price record', href: '/prices' }}
        />
      ) : (
        <>
          <section aria-label="Market briefs">
            <SectionHeader
              title="Market briefs"
              count={insights.length}
              action={{ href: '/methodology', label: 'How we separate observation from analysis' }}
            />
            <ol className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {insights.map((article, index) => (
                <li key={article.slug}>
                  <article className="editorial-panel flex h-full flex-col overflow-hidden">
                    <HatsiImage
                      asset={getInsightImage(article.slug)}
                      sizes="(min-width: 1280px) 24rem, (min-width: 768px) 45vw, 92vw"
                      ratio={index === 0 ? 'wide' : 'landscape'}
                      className="rounded-t-panel"
                      priority={index === 0}
                    />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-pill border border-editorial-border bg-editorial-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-editorial-text-secondary">
                          {article.category}
                        </span>
                        {article.publishedAt ? (
                          <span className="figure-num text-editorial-text-secondary">
                            {formatDate(article.publishedAt)}
                          </span>
                        ) : (
                          <span
                            className="text-editorial-text-secondary"
                            title="The original publication did not display a date, so none is asserted here."
                          >
                            Publication date not recorded
                          </span>
                        )}
                        <span className="text-editorial-text-secondary">
                          {article.readingMinutes} min read
                        </span>
                      </div>

                      <h3 className="mt-2.5 font-display text-[1.0625rem] font-bold leading-snug text-editorial-text">
                        <Link
                          href={`/insights/${article.slug}`}
                          className="hover:text-brand-700"
                        >
                          {article.title}
                        </Link>
                      </h3>

                      <p className="editorial-prose mt-2 flex-1 text-[0.8125rem] leading-relaxed text-editorial-text-secondary">
                        {article.excerpt}
                      </p>

                      <Link
                        href={`/insights/${article.slug}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Read the brief
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </section>

          {REPORTS.length > 0 ? (
            <section aria-label="Published reports">
              <SectionHeader
                title="Published reports"
                count={REPORTS.length}
                action={{ href: '/reports', label: 'The report library' }}
              />
              <ul className="terminal-panel divide-y divide-terminal-border">
                {REPORTS.map((report) => (
                  <li key={report.slug}>
                    <Link
                      href={`/reports/${report.slug}`}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors duration-150 ease-out hover:bg-terminal-interactive/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
                          {report.title}
                        </span>
                        <span className="block truncate text-[0.6875rem] text-terminal-text-muted">
                          {report.category} ·{' '}
                          {report.scope.windowDays
                            ? `${report.scope.windowDays}-day window`
                            : 'the full record'}{' '}
                          · {report.readingMinutes} min read
                        </span>
                      </span>
                      <span className="figure-label shrink-0">Report</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-label="A note on forecasts">
            <SectionHeader title="A note on forecasts" />
            <div className="terminal-panel p-4">
              <p className="text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
                <IconBook
                  className="mr-1.5 inline size-3.5 align-text-top text-terminal-text-muted"
                  aria-hidden="true"
                />
                The previous Pluck Live site displayed a &ldquo;Price Forecast&rdquo; figure
                on every commodity page without explaining how it was produced. It has been
                removed. Hatsi360 publishes observations and analysis; it does not publish
                predictions dressed up as data. See the{' '}
                <Link
                  href="/disclaimer"
                  className="font-semibold text-harvest-300 underline decoration-terminal-border underline-offset-2"
                >
                  price data disclaimer
                </Link>
                .
              </p>
              {undated > 0 ? (
                <p className="mt-2 border-t border-terminal-border pt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  {undated} brief{undated === 1 ? '' : 's'} in the archive carry no
                  publication date, because the original publication did not display one.
                  None is asserted here.
                </p>
              ) : null}
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}

/** Research while its content loads. */
export function ResearchLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Research"
        description="Loading the research archive."
      />
    </PageContainer>
  );
}
