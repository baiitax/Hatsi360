import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { JOB_DEFINITIONS, runJob } from '@/lib/jobs';

/**
 * The scheduled job endpoint.
 *
 * It is called by an authenticated scheduler — a cron job on the deployment
 * platform, not a browser and not the public. The secret is compared in
 * constant time and never written to a log.
 *
 * A job is idempotent: the same slot cannot run twice, so a retried or
 * duplicated cron trigger is harmless.
 */
export async function POST(request: Request) {
  const secret = process.env.JOB_RUNNER_SECRET;

  if (!secret) {
    return NextResponse.json(
      { ok: false, message: 'The job runner is not configured in this deployment.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';

  const expectedBuffer = Buffer.from(secret);
  const presentedBuffer = Buffer.from(presented);

  if (
    expectedBuffer.length !== presentedBuffer.length ||
    !timingSafeEqual(expectedBuffer, presentedBuffer)
  ) {
    return NextResponse.json({ ok: false, message: 'Not authorised.' }, { status: 401 });
  }

  let jobName: string | null = null;
  let scheduledFor: string | undefined;

  try {
    const body = (await request.json()) as { job?: string; scheduledFor?: string };
    jobName = body.job ?? null;
    scheduledFor = body.scheduledFor;
  } catch {
    // An empty body means "run everything".
  }

  if (jobName && !JOB_DEFINITIONS.some((job) => job.name === jobName)) {
    return NextResponse.json(
      { ok: false, message: `Unknown job "${jobName}".` },
      { status: 400 },
    );
  }

  const targets = jobName ? [jobName] : JOB_DEFINITIONS.map((job) => job.name);
  const outcomes = [];

  for (const name of targets) {
    outcomes.push(await runJob(name, { scheduledFor, triggeredBy: 'scheduler' }));
  }

  const failed = outcomes.filter((outcome) => outcome.status === 'failed');

  return NextResponse.json(
    { ok: failed.length === 0, outcomes },
    { status: failed.length === 0 ? 200 : 500 },
  );
}

/** A GET request is refused: the jobs must be triggered deliberately. */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: 'Use POST with the scheduler secret.' },
    { status: 405 },
  );
}
