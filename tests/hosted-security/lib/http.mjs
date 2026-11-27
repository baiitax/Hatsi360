/**
 * Thin HTTP client for the hosted-security harness.
 *
 * Deliberately dumb: no retries, no redirects followed, no implicit auth, a
 * hard timeout, and it never throws on an HTTP error status — a 403 is a result,
 * not an exception. Request bodies and headers are redacted before they can be
 * recorded.
 */
import { redact, redactHeaders } from './redact.mjs';

export const DEFAULT_TIMEOUT_MS = 15000;

export function createClient({ baseUrl, anonKey, serviceKey, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl } = {}) {
  const doFetch = fetchImpl ?? globalThis.fetch;

  /**
   * @param {string} path e.g. "/rest/v1/rpc/has_entitlement"
   * @param {object} opts  { method, token, key, body, headers, timeoutMs }
   */
  async function request(path, opts = {}) {
    const method = opts.method ?? 'GET';
    const key = opts.key ?? anonKey;
    const token = opts.token ?? key;
    const headers = {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(opts.headers ?? {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? timeoutMs);
    let res;
    let text = '';
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        redirect: 'manual',
        signal: controller.signal,
      });
      text = await res.text();
    } catch (err) {
      clearTimeout(timer);
      return {
        ok: false,
        transportError: err.name === 'AbortError' ? `timeout after ${opts.timeoutMs ?? timeoutMs}ms` : String(err.message),
        request: redact({ method, path, headers: redactHeaders(headers), body: opts.body }),
      };
    }
    clearTimeout(timer);

    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body is fine */ }

    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json,
      text,
      code: json && typeof json === 'object' ? (json.code ?? null) : null,
      request: redact({ method, path, headers: redactHeaders(headers), body: opts.body }),
      response: redact({ status: res.status, body: json ?? text.slice(0, 400) }),
    };
  }

  return { request };
}
