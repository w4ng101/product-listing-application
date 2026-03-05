/**
 * ICacheService — Caching Port (SOA / Hexagonal Architecture)
 *
 * Technology-agnostic cache contract.  Concrete adapters may use:
 *   - In-process Map (TtlCacheService)         — single instance, zero latency
 *   - Redis / Valkey                            — distributed, multi-replica safe
 *   - Vercel KV, Upstash, Cloudflare KV        — edge-native stores
 *
 * Swapping the adapter requires only a change in the DI Container —
 * no Application or Domain layer code changes.
 */

export interface ICacheService {
  /**
   * Retrieve a value by key.
   * Returns `undefined` on miss or expiry.
   */
  get<T>(key: string): T | undefined;

  /**
   * Store a value under `key` for `ttlMs` milliseconds.
   */
  set<T>(key: string, value: T, ttlMs: number): void;

  /**
   * Remove a specific key.
   */
  delete(key: string): void;

  /**
   * Flush the entire cache (use with care in production).
   */
  clear(): void;

  /**
   * Return the cached value for `key`, or execute `fn`, cache the result, and return it.
   * Equivalent to Java's ConcurrentMap.computeIfAbsent() / Guava Cache.get(key, loader).
   */
  getOrSet<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T>;

  /**
   * Return diagnostic stats (hit rate, size, etc.) for health endpoints.
   */
  stats(): CacheStats;
}

export interface CacheStats {
  /** Number of entries currently stored. */
  size:     number;
  /** Total cache get() calls since process start. */
  gets:     number;
  /** get() calls that returned a hit. */
  hits:     number;
  /** get() calls that returned a miss. */
  misses:   number;
  /** Hit rate [0–1]. */
  hitRate:  number;
}
