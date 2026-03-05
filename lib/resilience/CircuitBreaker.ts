/**
 * CircuitBreaker — Resilience Pattern
 *
 * Protects downstream services and prevents cascading failures.
 *
 * State Machine
 * -------------
 * CLOSED    → normal operation
 * OPEN      → fast-fail until cooldown
 * HALF_OPEN → probe mode
 */

import type { ILogger } from "@/lib/contracts/ILogger";
import { createLogger } from "@/lib/observability/logger";
import { ErrorCode } from "@/lib/result/Result";

// ─── Error type ───────────────────────────────────────────────────────────────

export class CircuitOpenError extends Error {
  readonly code = ErrorCode.CIRCUIT_OPEN;

  constructor(service: string) {
    super(`Circuit breaker is OPEN for service: ${service}`);
    this.name = "CircuitOpenError";
  }
}

// ─── State ───────────────────────────────────────────────────────────────────

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  service: string;
  failureThreshold?: number;
  /**
   * Number of consecutive successes required in HALF_OPEN before the circuit
   * fully closes.  A value of 1 closes on the first probe success (original
   * behaviour). The default of 2 provides a safer recovery signal.
   */
  successThreshold?: number;
  cooldownMs?: number;
  logger?: ILogger;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  lastFailureTime: number | null;
  totalSuccesses: number;
  totalFailures: number;
  /** Consecutive successes recorded in HALF_OPEN state. */
  consecutiveSuccesses: number;
  successThreshold: number;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime: number | null = null;
  private totalSuccesses = 0;
  private totalFailures = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly cooldownMs: number;
  private readonly log: ILogger;
  readonly service: string;

  constructor(opts: CircuitBreakerOptions) {
    this.service          = opts.service;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.successThreshold = opts.successThreshold ?? 2;
    this.cooldownMs       = opts.cooldownMs       ?? 30_000;
    this.log =
      opts.logger ??
      createLogger("circuit-breaker").child({ service: opts.service });
  }

  /**
   * Execute function through circuit breaker.
   * Throws CircuitOpenError when OPEN and cooldown not elapsed.
   */
  async fire<T>(fn: () => Promise<T>): Promise<T> {
    this.transition();

    if (this.state === "OPEN") {
      this.log.warn("Circuit OPEN — fast-failing request", {
        state: this.state,
      });

      throw new CircuitOpenError(this.service);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  /**
   * Diagnostic snapshot for health endpoints.
   */
  stats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      successThreshold: this.successThreshold,
    };
  }

  // ─── State transitions ────────────────────────────────────────────────────

  private transition(): void {
    if (
      this.state === "OPEN" &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.cooldownMs
    ) {
      this.state = "HALF_OPEN";

      this.log.info("Circuit → HALF_OPEN (probing downstream)", {
        state: this.state,
      });
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;

    if (this.state === "HALF_OPEN") {
      this.consecutiveSuccesses++;

      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.log.info("Circuit → CLOSED (probe threshold met)", {
          state: "CLOSED",
          consecutiveSuccesses: this.consecutiveSuccesses,
          successThreshold: this.successThreshold,
        });
        this.state = "CLOSED";
        this.failures = 0;
        this.consecutiveSuccesses = 0;
      } else {
        this.log.debug("Circuit HALF_OPEN — probe success, waiting for threshold", {
          consecutiveSuccesses: this.consecutiveSuccesses,
          successThreshold: this.successThreshold,
        });
      }
      return;
    }

    // In CLOSED state, keep failure count reset
    this.failures = 0;
    this.consecutiveSuccesses = 0;
  }

  private onFailure(err: unknown): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    const message = err instanceof Error ? err.message : String(err);

    this.log.warn("Downstream call failed", {
      failures: this.failures,
      error: message,
    });

    if (this.state === "HALF_OPEN" || this.failures >= this.failureThreshold) {
      this.state = "OPEN";

      this.log.error("Circuit → OPEN (threshold reached)", {
        state: this.state,
        failureThreshold: this.failureThreshold,
        cooldownMs: this.cooldownMs,
      });
    }
  }
}