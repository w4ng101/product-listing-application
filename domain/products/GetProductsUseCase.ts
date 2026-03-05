/**
 * GetProductsUseCase — Application Layer (CQRS Query)
 *
 * Retrieves products with filtering, sorting, pagination, and
 * performance-test expansion.
 *
 * Responsibilities
 * ----------------
 * • Orchestrates product listing Application use case
 * • Delegates data access to IProductRepository (port)
 * • Applies domain rules (filters, sort, pagination)
 * • Returns Result<PaginatedProductsResult> (no exceptions)
 *
 * HTTP adapters must NOT contain business logic.
 */

import type { IProductRepository } from "@/lib/contracts/IProductRepository";
import type { ILogger } from "@/lib/contracts/ILogger";
import { Result } from "@/lib/result/Result";
import type {
  Product,
  PaginatedProductsResult,
} from "@/types";
import type { ProductFilterSpec } from "@/domain/products/filters/ProductFilterSpec";
import { createLogger } from "@/lib/observability/logger";

// ─── Performance configuration ───────────────────────────────────────────────

const TARGET_PERF_SIZE = 1_020;

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class GetProductsUseCase {
  private readonly log: ILogger;

  constructor(
    private readonly productRepo: IProductRepository,
    logger?: ILogger
  ) {
    this.log = logger ?? createLogger("get-products-use-case");
  }

  async execute(
    spec: ProductFilterSpec,
    correlationId?: string
  ): Promise<Result<PaginatedProductsResult>> {
    const ctx = { correlationId, useCase: "GetProducts" };

    this.log.debug("Executing GetProducts", { ...ctx, spec });

    const dataResult = await this.fetchDataset(spec, ctx);
    if (!dataResult.ok) return dataResult;

    let products = dataResult.value;

    if (spec.perfMode) {
      products = expandForPerfMode(products);
      this.log.debug("PerfMode active", {
        ...ctx,
        expandedTo: products.length,
      });
    }

    products = applyNumericFilters(products, spec);
    products = sortProducts(products, spec.sortBy, spec.sortOrder);

    return Result.ok(paginateProducts(products, spec, ctx));
  }

  // ─── Data access (Clean boundary) ─────────────────────────────────────────

  private async fetchDataset(
    spec: ProductFilterSpec,
    ctx: Record<string, unknown>
  ): Promise<Result<Product[]>> {
    if (spec.search) {
      this.log.debug("Fetching by search", { ...ctx, query: spec.search });
      return this.productRepo.findBySearchQuery(spec.search);
    }

    if (spec.category) {
      this.log.debug("Fetching by category", {
        ...ctx,
        category: spec.category,
      });
      return this.productRepo.findByCategory(spec.category);
    }

    return this.productRepo.findAll();
  }
}

// ─── Pure domain functions (testable) ─────────────────────────────────────────

function applyNumericFilters(
  products: Product[],
  spec: ProductFilterSpec
): Product[] {
  return products.filter((p) => {
    if (spec.minPrice !== undefined && p.price < spec.minPrice) return false;
    if (spec.maxPrice !== undefined && p.price > spec.maxPrice) return false;
    if (spec.minRating !== undefined && p.rating < spec.minRating) return false;
    return true;
  });
}

function sortProducts(
  products: Product[],
  sortBy: "price" | "rating" | "title" | "discountPercentage",
  sortOrder: "asc" | "desc"
): Product[] {
  return [...products].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
}

function paginateProducts(
  products: Product[],
  spec: ProductFilterSpec,
  ctx: Record<string, unknown>
): PaginatedProductsResult {
  const total = products.length;
  const limit = spec.limit;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const cursor =
    spec.cursor !== undefined
      ? Math.max(0, Math.min(spec.cursor, total))
      : undefined;

  const page =
    cursor !== undefined
      ? Math.floor(cursor / limit) + 1
      : Math.max(1, Math.min(spec.page, totalPages));

  const skip = (page - 1) * limit;
  const paginated = products.slice(skip, skip + limit);
  const nextCursor = skip + limit < total ? skip + limit : null;

  return {
    products: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: nextCursor !== null,
      hasPrevPage: skip > 0,
      cursor: skip,
      nextCursor,
    },
  };
}

// ─── Performance testing (domain utility) ─────────────────────────────────────

function expandForPerfMode(base: Product[]): Product[] {
  if (base.length === 0) return base;

  const result: Product[] = [];
  const copies = Math.ceil(TARGET_PERF_SIZE / base.length);

  for (let i = 0; i < copies; i++) {
    for (const src of base) {
      if (result.length >= TARGET_PERF_SIZE) break;

      const synthetic = i > 0;

      const item: Product = {
        ...src,
        id: synthetic ? src.id + i * 1000 : src.id,
        title: synthetic ? `${src.title} (${i + 1})` : src.title,
        price: Math.round(src.price * (1 + i * 0.05) * 100) / 100,
        _synthetic: synthetic || src._synthetic,
      };

      result.push(item);
    }
  }

  return result;
}