/**
 * ILogger — Observability Port (SOA cross-cutting concern)
 *
 * Abstracts the logging mechanism so implementations can output to:
 *   - console (development)
 *   - JSON stdout (Docker / Kubernetes)
 *   - Datadog / CloudWatch / ELK aggregators (production)
 *
 * Every log entry should carry a `correlationId` for distributed tracing.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Distributed trace / request identifier propagated across services. */
  correlationId?: string;
  /** Name of the service or module emitting the log. */
  service?:       string;
  /** Arbitrary structured fields for search & alerting. */
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info (message: string, context?: LogContext): void;
  warn (message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;

  /**
   * Return a child logger that automatically merges `defaultContext`
   * into every log entry — useful for scoping to a service name.
   */
  child(defaultContext: LogContext): ILogger;
}
