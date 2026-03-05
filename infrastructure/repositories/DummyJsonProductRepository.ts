/**
 * DummyJsonProductRepository — Infrastructure Adapter
 *
 * Implements IProductRepository against DummyJSON REST API.
 *
 * Responsibilities
 * ----------------
 * • translate upstream DTOs to domain Product
 * • apply caching strategy
 * • delegate HTTP via resilient client
 * • return Result type (no exceptions)
 *
 * Upstream shape is internal to this adapter.
 */

import type { IProductRepository } from "@/lib/contracts/IProductRepository";
import type { ICacheService } from "@/lib/contracts/ICacheService";
import type { IHttpClient } from "@/lib/contracts/IHttpClient";
import type { ILogger } from "@/lib/contracts/ILogger";
import { Result, ErrorCode } from "@/lib/result/Result";
import type { Product } from "@/types";
import { createLogger } from "@/lib/observability/logger";

// ─── Upstream DTO (internal) ─────────────────────────────────────────────────

interface DummyJsonProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

// ─── Cache TTLs ───────────────────────────────────────────────────────────────

const TTL = {
  catalogue: 5 * 60 * 1_000,
  category: 5 * 60 * 1_000,
  search: 2 * 60 * 1_000,
  single: 10 * 60 * 1_000,
} as const;

/**
 * Hard ceiling on single-request payload size.
 * Prevents unbounded fetches when the upstream catalogue grows arbitrarily large.
 * For larger catalogues, implement cursor-based retrieval in the repository.
 */
const MAX_FETCH_SIZE = 500;

// ─── Implementation ─────────────────────────────────────────────────────────

export class DummyJsonProductRepository implements IProductRepository {
  private readonly http: IHttpClient;
  private readonly cache: ICacheService;
  private readonly log: ILogger;

  constructor(
    http: IHttpClient,
    cache: ICacheService,
    logger?: ILogger
  ) {
    this.http = http;
    this.cache = cache;
    this.log = logger ?? createLogger("product-repository");
  }

  // ─── IProductRepository ────────────────────────────────────────────────────

  async findAll(): Promise<Result<Product[]>> {
    return Result.fromAsync(
      () =>
        this.cache.getOrSet(
          "all-products",
          async () => {
            this.log.debug("Cache miss — fetching full catalogue");

            const probe = await this.http.getJson<DummyJsonProductsResponse>(
              "/products?limit=0"
            );

            const safeLimit = Math.min(probe.total, MAX_FETCH_SIZE);

            const all = await this.http.getJson<DummyJsonProductsResponse>(
              `/products?limit=${safeLimit}&skip=0`
            );

            this.log.info("Fetched catalogue", {
              total: all.products.length,
            });

            return all.products;
          },
          TTL.catalogue
        ),
      (err) => ({
        code: ErrorCode.UPSTREAM_ERROR,
        message: "Failed to load product catalogue.",
        cause: err,
      })
    );
  }

  async findByCategory(category: string): Promise<Result<Product[]>> {
    const key = `cat:${encodeURIComponent(category)}`;

    return Result.fromAsync(
      () =>
        this.cache.getOrSet(
          key,
          async () => {
            this.log.debug("Cache miss — fetching category", { category });

            const encoded = encodeURIComponent(category);

            const probe = await this.http.getJson<DummyJsonProductsResponse>(
              `/products/category/${encoded}?limit=0`
            );

            const safeLimit = Math.min(probe.total, MAX_FETCH_SIZE);

            const all = await this.http.getJson<DummyJsonProductsResponse>(
              `/products/category/${encoded}?limit=${safeLimit}&skip=0`
            );

            this.log.info("Fetched category products", {
              category,
              total: all.products.length,
            });

            return all.products;
          },
          TTL.category
        ),
      (err) => ({
        code: ErrorCode.UPSTREAM_ERROR,
        message: `Failed to load products for category "${category}".`,
        cause: err,
      })
    );
  }

  async findBySearchQuery(query: string): Promise<Result<Product[]>> {
    const key = `search:${query}`;

    return Result.fromAsync(
      () =>
        this.cache.getOrSet(
          key,
          async () => {
            this.log.debug("Cache miss — searching products", { query });

            const encoded = encodeURIComponent(query);

            const probe = await this.http.getJson<DummyJsonProductsResponse>(
              `/products/search?q=${encoded}&limit=0`
            );

            const safeLimit = Math.min(probe.total, MAX_FETCH_SIZE);

            const all = await this.http.getJson<DummyJsonProductsResponse>(
              `/products/search?q=${encoded}&limit=${safeLimit}&skip=0`
            );

            this.log.info("Search completed", {
              query,
              total: all.products.length,
            });

            return all.products;
          },
          TTL.search
        ),
      (err) => ({
        code: ErrorCode.UPSTREAM_ERROR,
        message: `Search for "${query}" failed.`,
        cause: err,
      })
    );
  }

  async findById(id: number): Promise<Result<Product>> {
    const key = `product:${id}`;

    const cached = this.cache.get<Product>(key);
    if (cached) {
      return Result.ok(cached);
    }

    const result = await Result.fromAsync<Product>(
      () => this.http.getJson<Product>(`/products/${id}`),
      (err) => {
        const message =
          err instanceof Error ? err.message : String(err);

        const notFound =
          message.includes("404") ||
          message.toLowerCase().includes("not found");

        return {
          code: notFound
            ? ErrorCode.NOT_FOUND
            : ErrorCode.UPSTREAM_ERROR,
          message: notFound
            ? `Product with ID ${id} was not found.`
            : `Failed to load product ${id}.`,
          cause: err,
        };
      }
    );

    if (result.ok) {
      this.cache.set(key, result.value, TTL.single);
      this.log.debug("Fetched product", { id });
    }

    return result;
  }
}