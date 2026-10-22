import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { authenticateApiKey, checkRateLimit, logApiUsage, type ApiApplication } from './auth';

export interface HandlerContext {
  request: Request;
  params: Record<string, string | string[] | undefined>;
  query: URLSearchParams;
}

export interface HandlerOptions<TQuery extends object, TData> {
  /** Zod schema for the query string. Its output is merged into the context. */
  query?: ZodType<TQuery>;
  /** Required API scope. Omit for public, read-only endpoints. */
  scope?: string;
  /** Free-tier rate limit used when no API key is supplied. */
  anonymousRateLimit?: number;
  handler: (
    context: HandlerContext & TQuery & { application: ApiApplication | null },
  ) => Promise<TData | NextResponse>;
}

/**
 * Wraps an API route handler with the behaviour every endpoint shares:
 * query validation, optional API-key authentication, rate limiting, usage
 * logging and a predictable error envelope.
 */
export function createApiHandler<TQuery extends object, TData>(
  options: HandlerOptions<TQuery, TData>,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
  ): Promise<NextResponse> => {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const params = await context.params;

    const auth = await authenticateApiKey(request, options.scope);
    if (!auth.ok) {
      switch (auth.reason) {
        case 'missing':
          return errorResponse(
            'unauthorized',
            options.scope
              ? 'This endpoint requires an API key. Send it as "Authorization: Bearer <key>" or "X-API-Key: <key>".'
              : 'An API key is required for this endpoint.',
            401,
          );
        case 'expired':
          return errorResponse('forbidden', 'This API key has expired. Please issue a new one.', 403);
        case 'inactive':
          return errorResponse('forbidden', 'This API key has been deactivated.', 403);
        default:
          return errorResponse('unauthorized', 'The API key supplied is not valid.', 401);
      }
    }

    const limit = auth.application?.rateLimitPerMinute ?? options.anonymousRateLimit ?? 120;
    const rateKey =
      auth.application?.id ?? `anon:${request.headers.get('x-forwarded-for') ?? 'local'}`;
    const rate = checkRateLimit(rateKey, limit);

    if (!rate.allowed) {
      const response = errorResponse(
        'rate_limited',
        `Rate limit of ${limit} requests per minute exceeded.`,
        429,
        { retryAfterSeconds: rate.retryAfterSeconds },
      );
      response.headers.set('Retry-After', String(rate.retryAfterSeconds));
      return response;
    }

    let parsedQuery = {} as TQuery;
    if (options.query) {
      const raw = Object.fromEntries(url.searchParams.entries());
      const result = options.query.safeParse(raw);
      if (!result.success) {
        return errorResponse(
          'bad_request',
          'One or more query parameters are invalid.',
          400,
          result.error.flatten(),
        );
      }
      parsedQuery = result.data;
    }

    const recordUsage = (statusCode: number) => {
      if (!auth.application) return;
      void logApiUsage({
        applicationId: auth.application.id,
        endpoint: url.pathname,
        method: request.method,
        statusCode,
        responseMs: Date.now() - startedAt,
        request,
      });
    };

    try {
      const data = await options.handler({
        request,
        params,
        query: url.searchParams,
        application: auth.application,
        ...parsedQuery,
      } as HandlerContext & TQuery & { application: ApiApplication | null });

      // A handler may return a ready-made response (for example a 404) to
      // bypass the success envelope.
      if (data instanceof NextResponse) {
        recordUsage(data.status);
        return data;
      }

      const response = NextResponse.json({
        data,
        meta: {
          requestId: crypto.randomUUID(),
          generatedAt: new Date().toISOString(),
          rateLimit: { limit, remaining: rate.remaining },
        },
      });

      response.headers.set('X-RateLimit-Limit', String(limit));
      response.headers.set('X-RateLimit-Remaining', String(rate.remaining));
      recordUsage(200);

      return response;
    } catch (error) {
      console.error('API error on', url.pathname, error);
      recordUsage(500);
      return errorResponse('server_error', 'The request could not be completed.', 500);
    }
  };
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      meta: { requestId: crypto.randomUUID(), generatedAt: new Date().toISOString() },
    },
    { status },
  );
}
