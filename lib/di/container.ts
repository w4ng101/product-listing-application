/**
 * ApplicationContainer — Dependency Injection / Composition Root (SOA)
 *
 * This is the single place where concrete implementations are bound to
 * their corresponding interfaces (ports).  The rest of the application
 * depends exclusively on ports — never on adapters directly.
 *
 * Pattern: Service Locator + Singleton
 * ─────────────────────────────────────
 * A singleton container is appropriate for Next.js server-side code.
 * In the Node.js process model, module-level singletons are safe and
 * prevent unnecessary re-instantiation on every request.
 *
 * Swapping an adapter (e.g. Redis cache, different upstream API) requires
 * changing ONLY this file.  All domain / application code remains untouched.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                      DEPENDENCY GRAPH                                │
 * │                                                                      │
 * │  TtlCacheService              (ICacheService)                        │
 * │       │                                                              │
 * │  ResilientHttpClient          ← CircuitBreaker + RetryPolicy         │
 * │       │                                                              │
 * │  DummyJsonProductRepository   (IProductRepository)                  │
 * │  DummyJsonCategoryRepository  (ICategoryRepository)                 │
 * │       │                                                              │
 * │  GetProductsUseCase                                                  │
 * │  GetProductByIdUseCase                                               │
 * │  GetCategoriesUseCase                                                │
 * │       │                                                              │
 * │  services/productService.ts   ← thin HTTP facades for existing API  │
 * │  app/api/products/route.ts    ← HTTP adapters                       │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import { TtlCacheService }                  from '@/infrastructure/cache/TtlCacheService';
import { ResilientHttpClient }              from '@/infrastructure/http/ResilientHttpClient';
import { DummyJsonProductRepository }       from '@/infrastructure/repositories/DummyJsonProductRepository';
import { DummyJsonCategoryRepository }      from '@/infrastructure/repositories/DummyJsonCategoryRepository';
import { GetProductsUseCase }               from '@/domain/products/GetProductsUseCase';
import { GetProductByIdUseCase }            from '@/domain/products/GetProductByIdUseCase';
import { GetCategoriesUseCase }             from '@/domain/categories/GetCategoriesUseCase';
import { createLogger }                     from '@/lib/observability/logger';
import type { ICacheService }               from '@/lib/contracts/ICacheService';

// ─── Singleton container ──────────────────────────────────────────────────────

export interface ApplicationContainer {
  /** Use case: retrieve a page of products with optional filters. */
  getProducts:     GetProductsUseCase;
  /** Use case: retrieve a single product by ID. */
  getProductById:  GetProductByIdUseCase;
  /** Use case: retrieve all categories. */
  getCategories:   GetCategoriesUseCase;
  /**
   * Cache service — typed as the port (ICacheService) so callers depend on
   * the abstraction, not the concrete TtlCacheService implementation.
   * Exposed here for health diagnostics (stats()).
   */
  cache:           ICacheService;
  /**
   * HTTP client — kept as the concrete type because the health endpoint needs
   * circuitStats(), which is infrastructure-specific and not part of IHttpClient.
   * Only the composition root and the health route should access this field.
   */
  httpClient:      ResilientHttpClient;
}

let _instance: ApplicationContainer | null = null;

/**
 * Return the singleton ApplicationContainer.
 * Instantiates once on first call; all subsequent calls return the same object.
 */
export function getContainer(): ApplicationContainer {
  if (_instance) return _instance;

  const log = createLogger('container');
  log.info('Bootstrapping ApplicationContainer');

  // ── Infrastructure ─────────────────────────────────────────────────────────

  const cache = new TtlCacheService({
    defaultTtlMs: 5 * 60 * 1_000,
    maxSize:      512,
  });

  const httpClient = new ResilientHttpClient({
    baseUrl:          'https://dummyjson.com',
    serviceName:      'dummyjson',
    timeoutMs:        8_000,
    maxAttempts:      3,
    failureThreshold: 5,
    cooldownMs:       30_000,
    isrRevalidate:    300,
  });

  // ── Repositories (adapters) ────────────────────────────────────────────────

  const productRepo  = new DummyJsonProductRepository(httpClient, cache);
  const categoryRepo = new DummyJsonCategoryRepository(httpClient, cache);

  // ── Use Cases (application layer) ─────────────────────────────────────────

  const getProducts    = new GetProductsUseCase(productRepo);
  const getProductById = new GetProductByIdUseCase(productRepo);
  const getCategories  = new GetCategoriesUseCase(categoryRepo);

  _instance = {
    getProducts,
    getProductById,
    getCategories,
    cache,
    httpClient,
  };

  log.info('ApplicationContainer ready');
  return _instance;
}

/**
 * Reset the singleton — for use in tests ONLY.
 * Never call this in production code.
 */
export function _resetContainer(): void {
  _instance = null;
}
