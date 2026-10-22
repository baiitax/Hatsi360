import { NextResponse } from 'next/server';

/**
 * The public API response envelope.
 *
 * Every endpoint returns the same shape so a client can handle success and
 * failure with one code path.
 */

export interface ApiMeta {
  requestId: string;
  generatedAt: string;
  [key: string]: unknown;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

function meta(extra: Record<string, unknown> = {}): ApiMeta {
  return {
    requestId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    ...extra,
  };
}

export function ok<T>(data: T, extraMeta: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ data, meta: meta(extraMeta) }, { status });
}

export function created<T>(data: T, extraMeta: Record<string, unknown> = {}) {
  return ok(data, extraMeta, 201);
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  extraMeta: Record<string, unknown> = {},
) {
  const body: ApiErrorBody = {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    meta: meta(extraMeta),
  };
  return NextResponse.json(body, { status });
}

export const errors = {
  badRequest: (message: string, details?: unknown) =>
    apiError('bad_request', message, 400, details),
  unauthorized: (message = 'A valid API key is required for this endpoint.') =>
    apiError('unauthorized', message, 401),
  forbidden: (message = 'Your API key does not have access to this resource.') =>
    apiError('forbidden', message, 403),
  notFound: (message = 'The requested resource does not exist.') =>
    apiError('not_found', message, 404),
  rateLimited: (message: string, retryAfter: number) =>
    apiError('rate_limited', message, 429, { retryAfterSeconds: retryAfter }, { retryAfter }),
  serverError: (message = 'Something went wrong on our side.') =>
    apiError('server_error', message, 500),
};

/** Standard pagination metadata. */
export function paginationMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
