import { errors } from '@/lib/api/response';

/**
 * GET /api/v1/* — anything the API does not define.
 *
 * Without this route an unknown path fell through to Next.js's own not-found
 * page, so an API client asking for `/api/v1/nope` received 28 KB of HTML and
 * a `text/html` content type. Every other failure on this surface answers with
 * the documented JSON envelope, and a client that parses `error.code` on a 400
 * will parse it on a 404 too.
 *
 * This route does not authenticate. It is reached only when no other
 * `/api/v1` route matched, so there is nothing to authorise against — and
 * saying "not found" rather than "unauthorized" is the honest answer.
 */
export async function GET() {
  return errors.notFound(
    'No such endpoint. The documented surface is listed at /api-docs.',
  );
}

/** Anything other than a GET is not offered on this surface. */
export async function POST() {
  return errors.notFound(
    'No such endpoint. The documented surface is listed at /api-docs.',
  );
}
