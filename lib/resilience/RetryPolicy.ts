/**
 * RetryPolicy — Exponential Backoff with Full Jitter
 *
 * Resilience pattern that retries transient failures while avoiding
 * retry storms (thundering herd).
 *
 * Non-retryable errors are propagated immediately.
 */

import type { ILogger } from "@/lib/contracts/ILogger";
import { createLogger } from "@/lib/observability/logger";
import { CircuitOpenError } from "@/lib/resilience/CircuitBreaker";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface RetryPolicyOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  capMs?: number;
  logger?: ILogger;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class RetryPolicy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly capMs: number;
  private readonly log: ILogger;

  constructor(opts: RetryPolicyOptions = {}) {
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 100;
    this.capMs = opts.capMs ?? 5_000;
    this.log = opts.logger ?? createLogger("retry-policy");
  }

  /**
   * Execute function with retry semantics.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        if (err instanceof CircuitOpenError) {
          throw err;
        }

        if (this.isNonRetryable(err)) {
          throw err;
        }

        if (attempt < this.maxAttempts - 1) {
          const delay = this.jitteredDelay(attempt);

          this.log.warn("Retrying after transient failure", {
            attempt: attempt + 1,
            maxAttempts: this.maxAttempts,
            delayMs: delay,
            error: err instanceof Error ? err.message : String(err),
          });

          await sleep(delay);
        }
      }
    }

    throw lastError;
  }

  // ─── Backoff with full jitter ───────────────────────────────────────────────

  private jitteredDelay(attempt: number): number {
    const ceiling = Math.min(
      this.capMs,
      this.baseDelayMs * Math.pow(2, attempt)
    );

    return Math.floor(Math.random() * ceiling);
  }

  // ─── Non-retryable detection ─────────────────────────────────────────────────

  private isNonRetryable(err: unknown): boolean {
    if (!(err instanceof Error)) return false;

    const message = err.message.toLowerCase();

    // HTTP 404 or not found
    if (message.includes("404") || message.includes("not found")) {
      return true;
    }

    // HTTP status pattern: "Upstream request failed: 404 ..."
    const match = message.match(/:\s*(\d{3})/);
    if (match) {
      const code = Number(match[1]);
      return code >= 400 && code < 500 && code !== 429;
    }

    return false;
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}