/**
 * IHttpClient — HTTP Port (SOA / Hexagonal Architecture)
 *
 * Technology-agnostic contract for outbound HTTP GET requests.
 * Concrete adapters may be:
 *   - ResilientHttpClient  (circuit breaker + retry + timeout)
 *   - Lightweight fetch wrapper (unit tests / minimal environments)
 *   - Mock implementations (integration test doubles)
 *
 * Repository adapters depend exclusively on this port — never on a
 * concrete HTTP client — satisfying the Dependency Inversion Principle.
 * Swapping the underlying client requires only a change in the DI Container.
 */

export interface IHttpClient {
  /**
   * Perform a GET request to `path` (relative to the client's base URL)
   * and return the parsed JSON body as `T`.
   *
   * Implementations are expected to handle:
   *   - timeout             (abort stalled requests)
   *   - retry               (transient fault recovery)
   *   - circuit breaking    (fast-fail when upstream is unhealthy)
   *
   * Throws on non-2xx responses or unrecoverable network failures.
   *
   * @param path           URL path relative to the configured base URL.
   * @param correlationId  Optional trace ID propagated to outbound headers.
   */
  getJson<T>(path: string, correlationId?: string): Promise<T>;
}
