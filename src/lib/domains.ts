import 'server-only';

import { getSiteUrl } from '@/lib/supabase/config';

/**
 * Domain and canonical-host management.
 *
 * Hatsi360 has to be able to run on more than one host during a migration:
 * the existing `liveprice.pluckagro.com`, a new Hatsi360 domain, or a
 * preview deployment. Three things have to agree on which host is canonical:
 * the metadata, the sitemap, and the redirect behaviour.
 *
 * This module is the single place that decides. It is configured through the
 * environment, and it is deliberately conservative: **no host is treated as
 * canonical, and no host is redirected to, unless it is named explicitly.**
 *
 * The rules
 * ---------
 * 1. `NEXT_PUBLIC_SITE_URL` is the canonical origin. It is the single value
 *    written into every canonical tag, Open Graph URL, sitemap entry and
 *    structured-data `@id`.
 * 2. A host listed in `NEXT_PUBLIC_LEGACY_HOSTS` is redirected to the
 *    canonical host with a 308, so a link keeps its equity and a method
 *    (POST, PUT) is preserved. Anything not listed is served as-is.
 * 3. A host listed in `NEXT_PUBLIC_PREVIEW_HOSTS` is served as-is and is
 *    excluded from the sitemap and from canonical tags, so a preview build
 *    can never be indexed as the production site.
 * 4. If no canonical origin is configured, the site falls back to the
 *    deployment's own URL and says so, rather than asserting a host nobody
 *    verified.
 */

/** The hosts that redirect to the canonical host. */
export function legacyHosts(): string[] {
  return splitList(process.env.NEXT_PUBLIC_LEGACY_HOSTS);
}

/** The hosts served without a redirect and excluded from indexing. */
export function previewHosts(): string[] {
  return splitList(process.env.NEXT_PUBLIC_PREVIEW_HOSTS);
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** The host the request arrived on, without the port. */
export function requestHost(request: Request): string | null {
  const url = new URL(request.url);
  return url.hostname.toLowerCase();
}

/**
 * Should this request be redirected to the canonical host?
 *
 * The answer is a full absolute URL, or `null` when the request should be
 * served where it arrived.
 */
export function canonicalRedirectTarget(request: Request): string | null {
  const host = requestHost(request);
  if (!host) return null;

  const legacy = legacyHosts();
  if (!legacy.includes(host)) return null;

  const canonical = getSiteUrl();
  let canonicalHost: string;
  try {
    canonicalHost = new URL(canonical).hostname.toLowerCase();
  } catch {
    return null;
  }

  // Never redirect the canonical host to itself.
  if (canonicalHost === host) return null;

  const incoming = new URL(request.url);
  const target = new URL(canonical);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  target.hash = incoming.hash;

  return target.toString();
}

/** True when the host is a preview host that must not be indexed. */
export function isPreviewHost(host: string | null): boolean {
  if (!host) return false;
  return previewHosts().includes(host.toLowerCase());
}

/**
 * The canonical origin, with a warning when it is not configured.
 *
 * A missing `NEXT_PUBLIC_SITE_URL` is a deployment error, not a licence to
 * guess. The site still renders — with the deployment's own URL — and the
 * sitemap and canonical tags will say so.
 */
export function canonicalOrigin(): { url: string; configured: boolean } {
  const configured = Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  return { url: getSiteUrl(), configured };
}
