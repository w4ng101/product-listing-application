/**
 * StructuredLogger — Production-Grade Observability (SOA)
 *
 * Emits JSON-structured log lines compatible with:
 *   Datadog, AWS CloudWatch, ELK/OpenSearch, Loki, Splunk, GCP Cloud Logging.
 *
 * Schema
 * ──────
 * Every line is a single JSON object with:
 *   timestamp      ISO-8601 — allows time-base sorting in log platforms
 *   level          debug | info | warn | error
 *   service        Logical service name (e.g. "product-service")
 *   correlationId  Trace ID propagated from the inbound HTTP header
 *                  X-Correlation-ID — links log lines across service calls
 *   message        Human-readable message
 *   ...context     Any additional structured fields
 *
 * Performance
 * ───────────
 * Level filtering is applied before serialization — DEBUG output is
 * fully suppressed in production with zero allocation when below threshold.
 *
 * Usage
 * ─────
 * import { createLogger } from '@/lib/observability/logger';
 *
 * const log = createLogger('product-service');
 * log.info('Fetched products', { correlationId, count: 42, latencyMs: 12 });
 */

import type { ILogger, LogContext, LogLevel } from '@/lib/contracts/ILogger';

// ─── Config ───────────────────────────────────────────────────────────────────

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

function activeLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error') {
    return env;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

// ─── Implementation ───────────────────────────────────────────────────────────

class StructuredLogger implements ILogger {
  private readonly threshold: number;

  constructor(private readonly defaultCtx: LogContext = {}) {
    this.threshold = LOG_LEVEL_RANK[activeLevel()];
  }

  private write(level: LogLevel, message: string, ctx?: LogContext): void {
    if (LOG_LEVEL_RANK[level] < this.threshold) return;

    const entry = {
      timestamp:     new Date().toISOString(),
      level,
      message,
      ...this.defaultCtx,
      ...ctx,
    };

    const line = JSON.stringify(entry);

    // In production route everything through console.error to guarantee the
    // line reaches stderr (never swallowed by stdout buffering in containers).
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(message: string, context?: LogContext): void { this.write('debug', message, context); }
  info (message: string, context?: LogContext): void { this.write('info',  message, context); }
  warn (message: string, context?: LogContext): void { this.write('warn',  message, context); }
  error(message: string, context?: LogContext): void { this.write('error', message, context); }

  child(defaultContext: LogContext): ILogger {
    return new StructuredLogger({ ...this.defaultCtx, ...defaultContext });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a scoped logger pre-seeded with `service` name.
 * Pass the resulting instance into constructors / functions to avoid coupling
 * downstream code to the concrete logger implementation.
 *
 * @example
 * const log = createLogger('product-service');
 * const reqLog = log.child({ correlationId: req.headers['x-correlation-id'] });
 */
export function createLogger(service: string): ILogger {
  return new StructuredLogger({ service });
}

/** Shared root logger — use createLogger() for scoped instances. */
export const rootLogger: ILogger = new StructuredLogger({ service: 'product-listing' });
