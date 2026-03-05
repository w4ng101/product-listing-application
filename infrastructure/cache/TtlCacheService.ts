/**
 * TtlCacheService — Infrastructure Adapter: In-Process TTL + LRU Cache
 *
 * Implements ICacheService.
 *
 * Features
 * --------
 * • TTL expiration
 * • LRU eviction
 * • metrics for observability
 * • getOrSet helper
 *
 * Suitable for:
 *  - serverless
 *  - single-container deployments
 *
 * For multi-replica or distributed deployments, use Redis/Valkey/edge KV
 * and swap adapter via DI without changing domain or application layers.
 */

import type { ICacheService, CacheStats } from "@/lib/contracts/ICacheService";

// ─── Entry shape ─────────────────────────────────────────────────────────────

interface Entry<T> {
  value: T;
  expiresAt: number;
}

// ─── Configuration defaults ───────────────────────────────────────────────────

const DEFAULT_TTL_MS = 5 * 60 * 1_000; // 5 minutes
const DEFAULT_MAX_SIZE = 512;

// ─── Implementation ───────────────────────────────────────────────────────────

export class TtlCacheService implements ICacheService {
  private readonly store = new Map<string, Entry<unknown>>();

  private readonly ttlMs: number;
  private readonly maxSize: number;

  private gets = 0;
  private hits = 0;
  private misses = 0;

  constructor(options: { defaultTtlMs?: number; maxSize?: number } = {}) {
    this.ttlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }

  // ─── ICacheService ─────────────────────────────────────────────────────────

  get<T>(key: string): T | undefined {
    this.gets++;

    const entry = this.store.get(key) as Entry<T> | undefined;

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    // LRU promotion: delete + reinsert to update order
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;

    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs = this.ttlMs): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) {
        this.store.delete(lruKey);
      }
    }

    this.store.delete(key);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  stats(): CacheStats {
    return {
      size: this.store.size,
      gets: this.gets,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.gets === 0 ? 0 : this.hits / this.gets,
    };
  }

  // ─── Convenience ───────────────────────────────────────────────────────────

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const fresh = await fn();
    this.set(key, fresh, ttlMs);
    return fresh;
  }
}