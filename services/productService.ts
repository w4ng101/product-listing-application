/**
 * ProductService — Server-Side Facade (SOA)
 *
 * Thin adapter between API routes and domain use cases.
 *
 * Responsibilities
 * ----------------
 * • translate Result<T> into exceptions (legacy contract)
 * • delegate to DI container
 * • validate filter spec
 *
 * No business logic lives here.
 */

import { getContainer } from "@/lib/di/container";
import { ProductFilterSpec } from "@/domain/products/filters/ProductFilterSpec";
import { ErrorCode } from "@/lib/result/Result";
import type {
  ProductFilters,
  PaginatedProductsResult,
  Product,
} from "@/types";

// ─── Error translation helper ───────────────────────────────────────────────

function throwFromResult(code: string, message: string): never {
  const error = new Error(message);

  if (code === ErrorCode.NOT_FOUND) {
    (error as Error & { statusCode: number }).statusCode = 404;
  }

  throw error;
}

// ─── Facade functions ───────────────────────────────────────────────────────

export async function getProducts(
  filters: ProductFilters = {},
  correlationId?: string
): Promise<PaginatedProductsResult> {
  const specOrError = ProductFilterSpec.create(filters);

  if (typeof specOrError === "string") {
    const error = new Error(specOrError);
    (error as Error & { statusCode: number }).statusCode = 400;
    throw error;
  }

  const { getProducts: useCase } = getContainer();
  const result = await useCase.execute(specOrError, correlationId);

  if (!result.ok) {
    throwFromResult(result.error.code, result.error.message);
  }

  return result.value;
}

export async function fetchProductById(
  id: number,
  correlationId?: string
): Promise<Product> {
  const { getProductById: useCase } = getContainer();
  const result = await useCase.execute(id, correlationId);

  if (!result.ok) {
    throwFromResult(result.error.code, result.error.message);
  }

  return result.value;
}

export async function fetchCategories(
  correlationId?: string
): Promise<string[]> {
  const { getCategories: useCase } = getContainer();
  const result = await useCase.execute(correlationId);

  if (!result.ok) {
    throwFromResult(result.error.code, result.error.message);
  }

  return result.value.map((c) => c.slug);
}