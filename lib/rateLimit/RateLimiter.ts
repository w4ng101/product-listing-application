/**
 * TokenBucketRateLimiter — In-Process Rate Limiting (Token Bucket)
 *
 * Controls request throughput with burst support and sustained limits.
 *
 * For distributed deployments (multi-instance), replace the in-memory
 * bucket Map with Redis/Valkey and preserve the same decision contract.
 */

export interface RateLimitOptions {
  capacity?: number;
  windowMs?: number;
  refillRate?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
  resetAtMs: number;
}

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

// ─── Implementation ─────────────────────────────────────────────────────────

export class TokenBucketRateLimiter {
  private readonly capacity: number;
  private readonly windowMs: number;
  private readonly refillRate: number;

  private readonly buckets = new Map<string, BucketEntry>();
  private readonly cleanupTimer: ReturnType<typeof setInterval> | null;

  constructor(opts: RateLimitOptions = {}) {
    this.capacity = opts.capacity ?? 60;
    this.windowMs = opts.windowMs ?? 60_000;
    this.refillRate = opts.refillRate ?? this.capacity;

    this.cleanupTimer =
      typeof setInterval !== "undefined"
        ? setInterval(() => this.evict(), this.windowMs * 5)
        : null;

    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === "object" &&
      "unref" in this.cleanupTimer
    ) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }

  /**
   * Check and consume one token for clientKey.
   */
  check(clientKey: string): RateLimitDecision {
    const now = Date.now();
    let bucket = this.buckets.get(clientKey);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(clientKey, bucket);
    }

    // Refill based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / this.windowMs) * this.refillRate;

    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const resetAtMs = now + this.windowMs;
    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    const missingTokens = Math.max(0, 1 - bucket.tokens);
    const retryAfterMs = allowed
      ? 0
      : Math.ceil((missingTokens / this.refillRate) * this.windowMs);

    return {
      allowed,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      limit: this.capacity,
      retryAfterMs,
      resetAtMs,
    };
  }

  /**
   * Evict stale buckets (no activity for 2× window).
   */
  private evict(): void {
    const stale = Date.now() - this.windowMs * 2;

    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefill < stale) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Active bucket count (health/monitoring).
   */
  get activeBuckets(): number {
    return this.buckets.size;
  }
}

// ─── Singleton (API gateway convenience) ─────────────────────────────────────

export const apiRateLimiter = new TokenBucketRateLimiter({
  capacity: 60,
  windowMs: 60_000,
  refillRate: 60,
});