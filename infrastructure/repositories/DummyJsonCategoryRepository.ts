/**
 * DummyJsonCategoryRepository — Infrastructure Adapter
 *
 * Implements ICategoryRepository using DummyJSON categories endpoint.
 *
 * Features
 * --------
 * • 1-hour cache (categories change rarely)
 * • resilient HTTP client
 * • Result-based error handling
 * • observability logging
 */

import type { ICategoryRepository } from "@/lib/contracts/ICategoryRepository";
import type { ICacheService } from "@/lib/contracts/ICacheService";
import type { IHttpClient } from "@/lib/contracts/IHttpClient";
import type { ILogger } from "@/lib/contracts/ILogger";
import { Result, ErrorCode } from "@/lib/result/Result";
import { createLogger } from "@/lib/observability/logger";

// ─── Upstream response shape ─────────────────────────────────────────────────

interface DummyJsonCategory {
  name: string;
  slug: string;
  url: string;
}

const CATEGORIES_CACHE_KEY = "categories";
const CATEGORIES_TTL_MS = 60 * 60 * 1_000; // 1 hour

// ─── Implementation ─────────────────────────────────────────────────────────

export class DummyJsonCategoryRepository implements ICategoryRepository {
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
    this.log = logger ?? createLogger("category-repository");
  }

  async findAll(): Promise<Result<string[]>> {
    return Result.fromAsync(
      () =>
        this.cache.getOrSet(
          CATEGORIES_CACHE_KEY,
          async () => {
            this.log.debug("Cache miss — fetching categories from DummyJSON");

            const data = await this.http.getJson<DummyJsonCategory[]>(
              "/products/categories"
            );

            const slugs = data.map((c) => c.slug);

            this.log.info("Fetched categories", {
              count: slugs.length,
            });

            return slugs;
          },
          CATEGORIES_TTL_MS
        ),
      (err) => ({
        code: ErrorCode.UPSTREAM_ERROR,
        message: "Failed to load product categories.",
        cause: err,
      })
    );
  }
}