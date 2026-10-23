import 'server-only';

import type { OperationalSnapshot } from '@/lib/analytics/types';
import { agentPerformance, marketCoverage, commodityCoverage, collectionTrends } from '@/lib/analytics/metrics';
import { formatPercent, operationalToday } from '@/lib/analytics/format';
import type { UserRole } from '@/types/domain';

/**
 * Pluck Live — the operational reports.
 *
 * Twelve reports, each with a documented scope, a documented column set and a
 * role that may run it. Every report is built from the operational snapshot,
 * so a report can never contain a number that is not also visible on the
 * dashboard.
 *
 * The reports are the same data the console shows. Nothing is estimated and
 * nothing is filled in.
 */

export type ReportId =
  | 'daily_prices'
  | 'market_summary'
  | 'commodity_movement'
  | 'agent_performance'
  | 'verification_throughput'
  | 'rejections_corrections'
  | 'coverage_against_plan'
  | 'overdue_tasks'
  | 'data_quality'
  | 'publication_audit'
  | 'task_generation'
  | 'reference_data';

export interface ReportDefinition {
  id: ReportId;
  label: string;
  description: string;
  /** The operational question the report answers. */
  purpose: string;
  /** The roles that may run it. */
  roles: UserRole[];
  /** The column headers, in order. */
  columns: string[];
  build: (snapshot: OperationalSnapshot) => string[][];
}

const emptyRows = (): string[][] => [];

export const REPORTS: ReportDefinition[] = [
  {
    id: 'daily_prices',
    label: 'Daily collected prices',
    description: 'Every price collected in the selected window, with its market, agent and unit.',
    purpose: 'What was collected, where, and by whom.',
    roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
    columns: ['Date', 'Market', 'Commodity', 'Agent', 'Price', 'Unit', 'Type', 'Status'],
    build: (snapshot) => {
      const agents = new Map(snapshot.agents.map((a) => [a.id, a.full_name ?? 'Unknown']));
      const markets = new Map(snapshot.markets.map((m) => [m.id, m.name]));
      return snapshot.observations
        .slice()
        .sort((a, b) => b.collected_at.localeCompare(a.collected_at))
        .map((observation) => [
          observation.collected_at.slice(0, 10),
          markets.get(observation.market_id) ?? `Market #${observation.market_id}`,
          `Commodity #${observation.commodity_id}`,
          agents.get(observation.agent_user_id ?? '') ?? 'Unassigned',
          observation.reported_amount === null ? '' : String(observation.reported_amount),
          observation.reported_unit_id === null ? 'not recorded' : `Unit #${observation.reported_unit_id}`,
          observation.price_type,
          observation.verification_status,
        ]);
    },
  },
  {
    id: 'market_summary',
    label: 'Market price summary',
    description: 'One row per market: how much was collected, how much is published and who covers it.',
    purpose: 'Which markets are producing data and which are not.',
    roles: ['verification_officer', 'market_supervisor', 'analyst', 'admin', 'super_admin'],
    columns: ['Market', 'Active', 'Scheduled', 'Agents', 'Collected', 'Open tasks', 'Overdue', 'Last collection'],
    build: (snapshot) =>
      marketCoverage(snapshot).map((row) => [
        row.name,
        row.active ? 'yes' : 'no',
        row.scheduled ? 'yes' : 'no',
        String(row.assignedAgents),
        String(row.collected),
        String(row.openTasks),
        String(row.overdueTasks),
        row.latestCollectionAt ?? '',
      ]),
  },
  {
    id: 'commodity_movement',
    label: 'Commodity movement',
    description: 'How many observations each commodity has, across how many markets, and how many carry a flag.',
    purpose: 'Which commodities are covered and which are thin.',
    roles: ['analyst', 'market_supervisor', 'admin', 'super_admin'],
    columns: ['Commodity id', 'Observations', 'Markets', 'Flagged', 'Latest collection'],
    build: (snapshot) =>
      commodityCoverage(snapshot).map((row) => [
        String(row.commodityId),
        String(row.observations),
        String(row.markets),
        String(row.flagged),
        row.latestCollectedAt ?? '',
      ]),
  },
  {
    id: 'agent_performance',
    label: 'Agent collection performance',
    description:
      'Task completion, submission counts, acceptance rate, reporting consistency and missed deadlines, per agent.',
    purpose: 'Who is collecting, who is reporting, and where the gaps are.',
    roles: ['market_supervisor', 'analyst', 'admin', 'super_admin'],
    columns: [
      'Agent',
      'Status',
      'Markets',
      'Eligible tasks',
      'Completed',
      'Completion rate',
      'Submitted',
      'Acceptance rate',
      'Consistency',
      'Missed deadlines',
      'Last activity',
    ],
    build: (snapshot) =>
      agentPerformance(snapshot).map((row) => [
        row.name,
        row.accountStatus,
        String(row.assignedMarkets),
        String(row.tasksEligible),
        String(row.tasksCompleted),
        row.taskCompletionRate === null ? '' : `${row.taskCompletionRate}%`,
        String(row.observationsSubmitted),
        row.verificationAcceptanceRate === null ? '' : `${row.verificationAcceptanceRate}%`,
        row.reportingConsistency === null ? '' : `${row.reportingConsistency}%`,
        String(row.missedDeadlines),
        row.lastActivityAt ?? '',
      ]),
  },
  {
    id: 'verification_throughput',
    label: 'Verification throughput',
    description: 'Daily counts of submissions, approvals and rejections, with the median time to verification.',
    purpose: 'How quickly the review queue is moving.',
    roles: ['verification_officer', 'analyst', 'admin', 'super_admin'],
    columns: ['Date', 'Collected', 'Submitted', 'Approved', 'Rejected', 'Median hours to verification'],
    build: (snapshot) =>
      collectionTrends(snapshot).map((point) => [
        point.date,
        String(point.collected),
        String(point.submitted),
        String(point.approved),
        String(point.rejected),
        point.medianHoursToVerification === null ? '' : String(point.medianHoursToVerification),
      ]),
  },
  {
    id: 'rejections_corrections',
    label: 'Rejections and corrections',
    description: 'The submissions that were rejected or sent back for correction, with the reviewer.',
    purpose: 'Why submissions are being sent back, and to whom.',
    roles: ['verification_officer', 'market_supervisor', 'admin', 'super_admin'],
    columns: ['Submitted at', 'Agent', 'Market', 'Commodity id', 'Status', 'Price'],
    build: (snapshot) => {
      const agents = new Map(snapshot.agents.map((a) => [a.id, a.full_name ?? 'Unknown']));
      const markets = new Map(snapshot.markets.map((m) => [m.id, m.name]));
      return snapshot.submissions
        .filter((s) =>
          ['rejected', 'correction_requested'].includes(s.verification_status),
        )
        .map((s) => [
          s.submitted_at ?? '',
          agents.get(s.agent_user_id ?? '') ?? 'Unassigned',
          markets.get(s.market_id) ?? `Market #${s.market_id}`,
          `Commodity #${s.commodity_id}`,
          s.verification_status,
          s.reported_amount === null ? '' : String(s.reported_amount),
        ]);
    },
  },
  {
    id: 'coverage_against_plan',
    label: 'Coverage against the collection plan',
    description: 'Expected commodities per market against the commodities that were actually reported.',
    purpose: 'Where the collection plan and reality disagree.',
    roles: ['market_supervisor', 'analyst', 'admin', 'super_admin'],
    columns: ['Market', 'Scheduled', 'Expected observations', 'Collected', 'Coverage', 'Missing commodities'],
    build: (snapshot) =>
      marketCoverage(snapshot)
        .filter((row) => row.scheduled)
        .map((row) => [
          row.name,
          'yes',
          String(row.expected),
          String(row.collected),
          row.coverageRate === null ? '' : `${row.coverageRate}%`,
          String(row.missingCommodities),
        ]),
  },
  {
    id: 'overdue_tasks',
    label: 'Overdue and open tasks',
    description: 'Collection tasks that have not been completed, and how long they have been waiting.',
    purpose: 'What is stuck, and since when.',
    roles: ['market_supervisor', 'admin', 'super_admin'],
    columns: ['Task', 'Market', 'Agent', 'Due', 'Deadline', 'Status', 'Priority'],
    build: (snapshot) => {
      const agents = new Map(snapshot.agents.map((a) => [a.id, a.full_name ?? 'Unknown']));
      const markets = new Map(snapshot.markets.map((m) => [m.id, m.name]));
      const today = operationalToday();
      return snapshot.tasks
        .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
        .map((task) => [
          String(task.id),
          markets.get(task.market_id) ?? `Market #${task.market_id}`,
          agents.get(task.assigned_to ?? '') ?? 'Unassigned',
          task.due_on,
          task.deadline_at ?? '',
          task.status,
          task.priority ?? 'normal',
        ])
        .sort((a, b) => a[3]!.localeCompare(b[3]!))
        .filter((row) => row[3]! <= today);
    },
  },
  {
    id: 'data_quality',
    label: 'Data quality',
    description: 'How many records carry each quality flag, and how many flags are still open.',
    purpose: 'Where the data quality problems are concentrated.',
    roles: ['verification_officer', 'analyst', 'admin', 'super_admin'],
    columns: ['Flag', 'Records', 'Share of submissions'],
    build: (snapshot) => {
      const flags = new Map<string, number>();
      for (const submission of snapshot.submissions) {
        for (const flag of submission.quality_flags ?? []) {
          flags.set(flag, (flags.get(flag) ?? 0) + 1);
        }
      }
      const total = snapshot.submissions.length;
      return [...flags.entries()]
        .map(([flag, count]) => [
          flag,
          String(count),
          formatPercent(total === 0 ? null : (count / total) * 100),
        ])
        .sort((a, b) => Number(b[1]) - Number(a[1]));
    },
  },
  {
    id: 'publication_audit',
    label: 'Publication record',
    description: 'Which prices were published, when, and by whom.',
    purpose: 'What the public can currently see, and who released it.',
    roles: ['verification_officer', 'analyst', 'admin', 'super_admin'],
    columns: ['Published at', 'Market', 'Commodity id', 'Price', 'Unit', 'Collected at', 'Verified at'],
    build: (snapshot) => {
      const markets = new Map(snapshot.markets.map((m) => [m.id, m.name]));
      return snapshot.submissions
        .filter((s) => s.published_at)
        .map((s) => [
          s.published_at!,
          markets.get(s.market_id) ?? `Market #${s.market_id}`,
          `Commodity #${s.commodity_id}`,
          s.reported_amount === null ? '' : String(s.reported_amount),
          s.reported_unit_id === null ? 'not recorded' : `Unit #${s.reported_unit_id}`,
          s.collected_at,
          s.verified_at ?? '',
        ])
        .sort((a, b) => b[0]!.localeCompare(a[0]!));
    },
  },
  {
    id: 'task_generation',
    label: 'Task generation and completion',
    description: 'The tasks the scheduler created and what happened to them.',
    purpose: 'Is the scheduler producing the work it should?',
    roles: ['market_supervisor', 'admin', 'super_admin'],
    columns: ['Task', 'Market', 'Due', 'Status', 'Started', 'Submitted', 'Completed'],
    build: (snapshot) => {
      const markets = new Map(snapshot.markets.map((m) => [m.id, m.name]));
      return snapshot.tasks
        .slice()
        .sort((a, b) => a.due_on.localeCompare(b.due_on))
        .map((task) => [
          String(task.id),
          markets.get(task.market_id) ?? `Market #${task.market_id}`,
          task.due_on,
          task.status,
          task.started_at ?? '',
          task.submitted_at ?? '',
          task.completed_at ?? '',
        ]);
    },
  },
  {
    id: 'reference_data',
    label: 'Reference data inventory',
    description: 'The markets, commodities, units and schedules the operation is configured with.',
    purpose: 'What the estate is configured to cover.',
    roles: ['analyst', 'admin', 'super_admin'],
    columns: ['Type', 'Count', 'Detail'],
    build: (snapshot) => [
      ['Markets', String(snapshot.markets.length), snapshot.markets.map((m) => m.name).join('; ')],
      [
        'Agents',
        String(snapshot.agents.length),
        snapshot.agents.map((a) => a.full_name ?? a.id).join('; '),
      ],
      [
        'Schedules',
        String(snapshot.schedules.length),
        snapshot.schedules
          .map((s) => `Market #${s.market_id} ${s.frequency} ${(s.days_of_week ?? []).join('/')}`)
          .join('; '),
      ],
      [
        'Tasks in window',
        String(snapshot.tasks.length),
        `${snapshot.tasks.filter((t) => t.status === 'completed').length} completed`,
      ],
      [
        'Observations in window',
        String(snapshot.observations.length),
        `${snapshot.observations.filter((o) => o.published_at).length} published`,
      ],
    ],
  },
];

export function reportById(id: string): ReportDefinition | undefined {
  return REPORTS.find((report) => report.id === id);
}

export function reportsForRole(role: UserRole): ReportDefinition[] {
  return REPORTS.filter((report) => report.roles.includes(role));
}

/** Escape one CSV cell. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Render a report as CSV.
 *
 * The file is generated from the same rows the screen shows, so an export can
 * never disagree with the console it was taken from.
 */
export function reportToCsv(report: ReportDefinition, rows: string[][]): string {
  const header = report.columns.map(csvCell).join(',');
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  return `${header}\n${body}${body ? '\n' : ''}`;
}
