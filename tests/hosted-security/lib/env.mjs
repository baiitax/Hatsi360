/**
 * Environment validation for the hosted-security harness.
 *
 * Safety model:
 *   * the target must be named explicitly — there is no inference, no fallback
 *     to SUPABASE_URL/.env and no "the variable says staging so it must be";
 *   * the project reference must be supplied and must match the URL host;
 *   * the known production reference is refused outright;
 *   * write-capable mode needs a second, operator-typed confirmation that also
 *     names the reference, because a reference alone is not proof of
 *     disposability;
 *   * a local (Supabase CLI) target is permitted only to exercise the harness,
 *     and is reported as `local`, which blocks every hosted acceptance claim.
 */

export const PRODUCTION_REF = 'umxzsdepbrenqysabtlt';
export const LOCAL_URL = 'http://127.0.0.1:54321';

const REF = /^[a-z0-9]{20}$/;
const WRITE_CONFIRMATION = 'yes-this-staging-is-disposable';

export const REQUIRED_VARS = [
  'HATSI360_STAGING_PROJECT_REF',
  'HATSI360_STAGING_URL',
  'HATSI360_ANON_KEY',
];

/** Variables that would tempt an accidental fallback; their presence is reported. */
const AMBIENT_TARGET_VARS = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'DATABASE_URL'];

export function loadEnvironment(env = process.env, options = {}) {
  const errors = [];
  const warnings = [];
  const mode = options.mode ?? 'read-only';

  if (!['read-only', 'write'].includes(mode)) {
    errors.push(`unknown mode "${mode}" (expected read-only or write)`);
  }

  const ambient = AMBIENT_TARGET_VARS.filter((k) => env[k]);
  const present = REQUIRED_VARS.filter((k) => env[k]);

  if (present.length === 0) {
    errors.push(
      'no HATSI360_STAGING_* variables set — refusing to infer a target' +
        (ambient.length ? ` (found ${ambient.join(', ')}, which are ignored on purpose)` : ''),
    );
    return { ok: false, errors, warnings, config: null };
  }

  for (const k of REQUIRED_VARS) {
    if (!env[k]) errors.push(`${k} is required`);
  }

  const ref = (env.HATSI360_STAGING_PROJECT_REF ?? '').trim();
  const rawUrl = (env.HATSI360_STAGING_URL ?? '').trim().replace(/\/+$/, '');

  if (ref && ref === PRODUCTION_REF) {
    errors.push(`refusing to run: ${PRODUCTION_REF} is the production project reference`);
  }
  if (ref && !REF.test(ref)) {
    errors.push(`HATSI360_STAGING_PROJECT_REF must be a 20-character project reference, got "${ref}"`);
  }
  if (rawUrl && rawUrl.toLowerCase().includes(PRODUCTION_REF)) {
    errors.push('refusing to run: the configured URL contains the production project reference');
  }

  let kind = 'hosted-staging';
  let host = '';
  try {
    const u = new URL(rawUrl);
    host = u.host;
    if (u.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(u.hostname)) {
      if (env.HATSI360_ALLOW_LOCAL !== '1') {
        errors.push('local targets require HATSI360_ALLOW_LOCAL=1 and are never hosted acceptance evidence');
      }
      kind = 'local';
    } else if (!/\.supabase\.(co|in)$/.test(u.hostname)) {
      errors.push(`HATSI360_STAGING_URL host "${u.hostname}" is not a Supabase project host`);
    }
  } catch {
    errors.push(`HATSI360_STAGING_URL is not a valid URL: "${rawUrl}"`);
  }

  if (kind === 'hosted-staging' && ref && host && !host.startsWith(`${ref}.`)) {
    errors.push(
      `URL host "${host}" does not belong to project reference "${ref}" — a URL is not staging because a variable says so`,
    );
  }

  if (mode === 'write') {
    if (env.HATSI360_CONFIRM_WRITES !== WRITE_CONFIRMATION) {
      errors.push(`write mode requires HATSI360_CONFIRM_WRITES=${WRITE_CONFIRMATION}`);
    }
    if (!env.HATSI360_OPERATOR) {
      errors.push('write mode requires HATSI360_OPERATOR to name the person executing');
    }
    if (env.HATSI360_CONFIRMED_PROJECT_REF !== ref) {
      errors.push('write mode requires HATSI360_CONFIRMED_PROJECT_REF to repeat the project reference exactly');
    }
    if (!env.HATSI360_SERVICE_KEY) {
      warnings.push('HATSI360_SERVICE_KEY is unset — H-10 will be reported as not executed');
    }
  }

  if (kind === 'local') {
    warnings.push('target is LOCAL: every hosted check will be reported blocked, never passed');
  }

  const config = errors.length
    ? null
    : {
        mode,
        kind,
        ref,
        url: rawUrl,
        host,
        anonKey: env.HATSI360_ANON_KEY,
        serviceKey: env.HATSI360_SERVICE_KEY ?? null,
        operator: env.HATSI360_OPERATOR ?? null,
        userEmail: env.HATSI360_USER_EMAIL ?? null,
        userPassword: env.HATSI360_USER_PASSWORD ?? null,
        entitledEmail: env.HATSI360_ENTITLED_EMAIL ?? null,
        entitledPassword: env.HATSI360_ENTITLED_PASSWORD ?? null,
        appUrl: env.HATSI360_APP_URL ?? null,
        commit: env.HATSI360_GIT_COMMIT ?? null,
      };

  return { ok: errors.length === 0, errors, warnings, config };
}

/** Human-safe one-line description of the target, for logs and evidence. */
export function describeTarget(config) {
  if (!config) return 'none';
  return `${config.kind} ref=${config.ref} host=${config.host} mode=${config.mode}`;
}
