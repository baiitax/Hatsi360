/**
 * Secret redaction for hosted-security evidence.
 *
 * The rule is deny-by-default at the value level: anything that looks like a
 * bearer token, a JWT, a service-role key or a password is replaced before a
 * record can reach disk. Evidence files are committed-adjacent artefacts and
 * must never carry a usable credential.
 */

const SECRET_KEY = /(^|_)(key|token|secret|password|passwd|authorization|apikey|jwt|bearer|cookie|session)(_|$)/i;
const JWT_LIKE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g;
const LONG_OPAQUE = /\b[A-Za-z0-9_-]{40,}\b/g;
const PLACEHOLDER = '[REDACTED]';

export const isSecretKey = (key) => SECRET_KEY.test(String(key));

/** Redact secrets embedded in a free-text string (URLs, headers, bodies). */
export function redactString(value, { opaque = true } = {}) {
  if (typeof value !== 'string') return value;
  let out = value.replace(JWT_LIKE, PLACEHOLDER);
  out = out.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${PLACEHOLDER}`);
  if (opaque) out = out.replace(LONG_OPAQUE, (m) => (/^[a-z0-9]{20}$/.test(m) ? m : PLACEHOLDER));
  return out;
}

/** Deep-clone with secrets removed. Never mutates the input. */
export function redact(value, { opaque = true } = {}) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, { opaque }));
  if (typeof value === 'string') return redactString(value, { opaque });
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (isSecretKey(k)) {
      // keep a shape hint so an operator can tell a token was present
      out[k] = v ? PLACEHOLDER : v;
    } else {
      out[k] = redact(v, { opaque });
    }
  }
  return out;
}

/** Headers are always risky; only these survive verbatim. */
const SAFE_HEADERS = new Set(['content-type', 'accept', 'prefer', 'content-length', 'x-client-info']);

export function redactHeaders(headers = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SAFE_HEADERS.has(k.toLowerCase()) ? redactString(String(v), { opaque: false }) : PLACEHOLDER;
  }
  return out;
}
