/**
 * GET /api/health
 *
 * Microservice-style health & readiness endpoint.
 *
 * Used by:
 *   • Kubernetes liveness / readiness probes
 *   • AWS ALB / ECS health checks
 *   • Vercel deployment health assertions
 *   • Internal monitoring dashboards
 *
 * Response shape:
 * ──────────────
 * HTTP 200 — service is healthy
 * {
 *   "status": "ok",
 *   "uptime": 12345,
 *   "timestamp": "2026-03-05T10:00:00.000Z",
 *   "version": "1.0.0",
 *   "cache": { "size": 4, "hitRate": 0.87, ... },
 *   "circuitBreaker": { "state": "CLOSED", "failures": 0, ... }
 * }
 *
 * HTTP 503 — circuit is open (upstream unreachable)
 * {
 *   "status": "degraded",
 *   ...
 * }
 *
 * This endpoint is intentionally excluded from the rate limiter matcher
 * so orchestrators can health-check without consuming rate limit budget.
 */

import { NextResponse }  from 'next/server';
import { getContainer }  from '@/lib/di/container';

export const dynamic = 'force-dynamic'; // never cache — always live status

export async function GET() {
  const container = getContainer();

  const cacheStats   = container.cache.stats();
  const circuitStats = container.httpClient.circuitStats();

  const isHealthy    = circuitStats.state !== 'OPEN';
  const httpStatus   = isHealthy ? 200 : 503;

  const body = {
    status:    isHealthy ? 'ok' : 'degraded',
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '1.0.0',
    cache: {
      size:    cacheStats.size,
      gets:    cacheStats.gets,
      hits:    cacheStats.hits,
      misses:  cacheStats.misses,
      hitRate: parseFloat(cacheStats.hitRate.toFixed(4)),
    },
    circuitBreaker: {
      service:         'dummyjson',
      state:           circuitStats.state,
      failures:        circuitStats.failures,
      totalSuccesses:  circuitStats.totalSuccesses,
      totalFailures:   circuitStats.totalFailures,
      lastFailureTime: circuitStats.lastFailureTime
        ? new Date(circuitStats.lastFailureTime).toISOString()
        : null,
    },
  };

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache',
    },
  });
}
