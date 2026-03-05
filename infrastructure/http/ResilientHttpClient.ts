/**
 * ResilientHttpClient — Infrastructure Adapter
 *
 * Composes:
 *  • Circuit Breaker (fast-fail)
 *  • Retry Policy (transient fault recovery)
 *  • Timeout (resource safety)
 *  • Next.js ISR revalidation (CDN caching)
 *
 * Responsibilities
 * ----------------
 * This adapter belongs to Infrastructure.
 * Use cases and domain services must not depend on it.
 *
 * Repository adapters may depend on it.
 */

import { CircuitBreaker } from "@/lib/resilience/CircuitBreaker";
import { RetryPolicy } from "@/lib/resilience/RetryPolicy";
import { createLogger } from "@/lib/observability/logger";
import type { ILogger } from "@/lib/contracts/ILogger";
import type { IHttpClient } from "@/lib/contracts/IHttpClient";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface ResilientHttpClientOptions {
  baseUrl: string;
  serviceName: string;
  timeoutMs?: number;
  maxAttempts?: number;
  failureThreshold?: number;
  cooldownMs?: number;
  logger?: ILogger;

  /**
   * Next.js ISR revalidation interval (seconds).
   * Passed to fetch as next: { revalidate }.
   */
  isrRevalidate?: number;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class ResilientHttpClient implements IHttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly isrRevalidate: number;
  private readonly log: ILogger;

  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryPolicy: RetryPolicy;

  constructor(options: ResilientHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.isrRevalidate = options.isrRevalidate ?? 300;

    this.log =
      options.logger ??
      createLogger("http-client").child({ service: options.serviceName });

    this.circuitBreaker = new CircuitBreaker({
      service: options.serviceName,
      failureThreshold: options.failureThreshold ?? 5,
      cooldownMs: options.cooldownMs ?? 30_000,
      logger: this.log,
    });

    this.retryPolicy = new RetryPolicy({
      maxAttempts: options.maxAttempts ?? 3,
      baseDelayMs: 100,
      capMs: 5_000,
      logger: this.log,
    });
  }

  /**
   * GET request returning JSON response.
   *
   * Automatically applies:
   *  • circuit breaker
   *  • retries
   *  • timeout
   */
  async getJson<T>(path: string, correlationId?: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const start = Date.now();

    const result = await this.circuitBreaker.fire(() =>
      this.retryPolicy.execute(() =>
        this.fetchWithTimeout<T>(url, correlationId)
      )
    );

    this.log.debug("HTTP GET completed", {
      url,
      latencyMs: Date.now() - start,
      correlationId,
    });

    return result;
  }

  /**
   * Expose circuit breaker metrics for health/monitoring.
   */
  circuitStats() {
    return this.circuitBreaker.stats();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async fetchWithTimeout<T>(
    url: string,
    correlationId?: string
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (correlationId) {
        headers["x-correlation-id"] = correlationId;
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
        next: {
          revalidate: this.isrRevalidate,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Upstream request failed: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}