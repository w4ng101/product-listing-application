/**
 * correlationId — Distributed Tracing Utility (SOA / Observability)
 *
 * A correlation ID ties together all log lines, downstream API calls, and
 * error reports that belong to a single inbound request — making it possible
 * to filter by a single ID in a log aggregator to see the full request journey.
 *
 * Convention
 * ──────────
 * Inbound requests carry the ID in:
 *   X-Correlation-ID   Incoming client header (if present, propagate it)
 *
 * Outbound responses carry:
 *   X-Correlation-ID   Same value — lets the client correlate API errors
 *   X-Request-ID       Alias for compatibility with AWS / GCP load balancers
 *
 * This module is edge-runtime compatible (crypto.randomUUID is available in
 * the Next.js edge runtime and Node ≥ 15).
 */

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate a new UUID v4 correlation ID.
 * Falls back to a timestamp-based placeholder if crypto is unavailable.
 */
export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without Web Crypto (rare in modern Node)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sanitize an untrusted correlation ID from an inbound request header.
 *
 * Strips any character that is not a word character or hyphen to prevent:
 *   - Log injection (newlines embedding fake log entries)
 *   - Header injection (CR/LF in outbound response headers)
 *   - Resource exhaustion (multi-megabyte header values)
 *
 * Returns a freshly-generated ID when the sanitized result is empty.
 */
export function sanitizeCorrelationId(raw: string): string {
  const sanitized = raw.replace(/[^\w\-]/g, '').slice(0, 64);
  return sanitized || generateCorrelationId();
}

// ─── Header helpers ───────────────────────────────────────────────────────────

export const CORRELATION_HEADER = 'x-correlation-id' as const;
export const REQUEST_ID_HEADER  = 'x-request-id'     as const;

/**
 * Extract the correlation ID from an inbound request's headers.
 * Sanitizes the inbound value to prevent log injection and header injection.
 * Returns a newly generated ID if none is present or if the value is empty
 * after sanitization.
 */
export function extractOrGenerate(headers: Headers): string {
  const raw =
    headers.get(CORRELATION_HEADER) ??
    headers.get(REQUEST_ID_HEADER);

  if (raw) {
    return sanitizeCorrelationId(raw);
  }

  return generateCorrelationId();
}

