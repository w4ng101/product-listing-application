/**
 * productService — Client-Side SOA Service
 *
 * All network calls go through this module.
 * It talks exclusively to the Next.js REST API endpoints,
 * keeping the screens decoupled from the data source.
 *
 * Optimised for low-end Android devices:
 *   - AbortController for request cancellation (prevents memory leaks)
 *   - Explicit error typing
 *   - Minimal JSON payload parsing
 */

import { API_BASE_URL } from '@/constants/config';
import type {
  PaginatedProductsResult,
  Product,
  ProductFilters,
  Category,
} from '@/types';
import { buildQueryString } from '@/utils';

// ─── API Error ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  signal?: AbortSignal
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Fetch paginated, filtered, sorted products from the Next.js API.
 */
export async function fetchProducts(
  filters: ProductFilters = {},
  signal?: AbortSignal
): Promise<PaginatedProductsResult> {
  const qs = buildQueryString(
    filters as Record<string, string | number | boolean | undefined | null>
  );
  return apiFetch<PaginatedProductsResult>(`/api/products${qs}`, signal);
}

/**
 * Fetch a single product by its ID.
 */
export async function fetchProductById(
  id: number,
  signal?: AbortSignal
): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`, signal);
}

/**
 * Fetch all available product categories.
 */
export async function fetchCategories(
  signal?: AbortSignal
): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories', signal);
}
