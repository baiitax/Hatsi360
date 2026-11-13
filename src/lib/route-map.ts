/**
 * The route map.
 *
 * A small number of public URLs are served by a differently-named internal
 * route. The reason is mechanical, not cosmetic: the workspace snapshot filter
 * excludes any directory whose name is `coverage`, so a route directory
 * literally named `coverage` would silently disappear from the working tree
 * between sessions — and `.gitignore` had the same effect, hiding it from git
 * as well.
 *
 * `/coverage` is a required public URL, so it is kept. The implementation
 * lives in `/coverage-report`, and `next.config.ts` rewrites one to the other
 * so the public URL never changes and the browser never sees the internal
 * name.
 *
 * This module is the single source of truth for that mapping. `next.config.ts`
 * builds the rewrite and the redirect from it, and the brand test resolves
 * navigation entries through it. Nothing else needs to know.
 */

/** Public URL -> internal route that implements it. */
export const ROUTE_ALIASES: Record<string, string> = {
  '/coverage': '/coverage-report',
};

/** The internal route for a public URL, or the URL itself. */
export function resolveRoute(path: string): string {
  return ROUTE_ALIASES[path] ?? path;
}

/** The public URL for an internal route, or the route itself. */
export function publicPathFor(route: string): string {
  for (const [publicPath, internalRoute] of Object.entries(ROUTE_ALIASES)) {
    if (internalRoute === route) return publicPath;
  }
  return route;
}
