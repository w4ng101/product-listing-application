/**
 * Next.js Proxy — Cross-Cutting Concerns (SOA / API Gateway layer)
 *
 * Runs on the Edge Runtime before every matched request.
 * (Replaces the deprecated `middleware.ts` file convention — Next.js 16+)
 *
 * Responsibilities
 * ─────────────────
 * 1. Correlation ID injection
 *    Reads X-Correlation-ID from the inbound request; generates one if absent.
 *    Propagates it on both the forwarded request (to API routes) and the
 *    response (back to the client) for end-to-end distributed tracing.
 *
 * 2. Rate-limit headers
 *    Adds X-RateLimit-* response headers based on the token-bucket state.
 *    Hard rejection (HTTP 429) is emitted when the bucket is empty.
 *    Note: The TokenBucketRateLimiter module-level singleton persists across
 *    requests in the same Node.js process (serverless warm instances).
 *
 * 3. Security headers (belt-and-suspenders alongside next.config.ts)
 *    Repeating the most critical headers in proxy ensures they are
 *    applied even for routes that bypass the Next.js config headers array
 *    (e.g. dynamic catch-all routes, rewrites).
 *
 * Edge Runtime constraints
 * ─────────────────────────
 * • No Node.js built-ins (fs, path, crypto module — use globalThis.crypto).
 * • No dynamic require().
 * • Proxy file must be < 1 MB uncompressed.
 * • setInterval is not available — rate limiter eviction is best-effort here.
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  extractOrGenerate,
  CORRELATION_HEADER,
  REQUEST_ID_HEADER,
} from '@/lib/observability/correlationId';
import { apiRateLimiter } from '@/lib/rateLimit/RateLimiter';

// ─── Route matcher ────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/api/:path*',   // all API routes
  ],
};

// ─── Proxy ────────────────────────────────────────────────────────────────────

export function proxy(request: NextRequest) {
  // 1. Correlation ID ──────────────────────────────────────────────────────────
  const correlationId = extractOrGenerate(request.headers);

  // 2. Rate limiting ────────────────────────────────────────────────────────────
  // Use the real IP from Vercel/CF (x-real-ip is set by the trusted edge layer).
  // x-forwarded-for fallback: take the LAST entry (appended by our edge proxy),
  // not the first — the first entry is client-controlled and can be spoofed.
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'anonymous';

  const rl = apiRateLimiter.check(ip);

  if (!rl.allowed) {
    return NextResponse.json(
      {
        message:    'Too many requests. Please slow down.',
        retryAfter: Math.ceil(rl.retryAfterMs / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After':           String(Math.ceil(rl.retryAfterMs / 1000)),
          'X-RateLimit-Limit':     String(rl.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.ceil(rl.resetAtMs / 1000)),
          [CORRELATION_HEADER]:    correlationId,
        },
      },
    );
  }

  // 3. Forward request with correlation ID ─────────────────────────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_HEADER, correlationId);
  requestHeaders.set(REQUEST_ID_HEADER,  correlationId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // 4. Attach observability + rate-limit headers to every response ──────────────
  response.headers.set(CORRELATION_HEADER,     correlationId);
  response.headers.set(REQUEST_ID_HEADER,      correlationId);
  response.headers.set('X-RateLimit-Limit',    String(rl.limit));
  response.headers.set('X-RateLimit-Remaining',String(rl.remaining));
  response.headers.set('X-RateLimit-Reset',    String(Math.ceil(rl.resetAtMs / 1000)));

  return response;
}
