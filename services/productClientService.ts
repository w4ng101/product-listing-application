/**
 * productClientService — Client-Side Service (SOA)
 *
 * All browser data fetching goes through Next.js API routes.
 * External APIs remain hidden from client code.
 */

import type {
  Product,
  ProductFilters,
  PaginatedProductsResult,
} from "@/types";
import type { Category } from "./categoryService";
import { buildQueryString } from "@/lib/utils";

// ─── Base URL helper ─────────────────────────────────────────────────────────

function apiUrl(path: string): string {
  if (typeof window === "undefined") {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;

    return `${base}${path}`;
  }

  return path;
}

// ─── Fetch helper (DRY + consistent error handling) ───────────────────────────

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      message: res.statusText,
    }));

    throw new Error(err.message ?? "Request failed");
  }

  return (await res.json()) as T;
}

// ─── Service functions ───────────────────────────────────────────────────────

export async function fetchProducts(
  filters: ProductFilters = {},
  signal?: AbortSignal
): Promise<PaginatedProductsResult> {
  const qs = buildQueryString(
    filters as Record<
      string,
      string | number | boolean | undefined | null
    >
  );

  return fetchJson<PaginatedProductsResult>(
    apiUrl(`/api/products${qs}`),
    signal
  );
}

export async function fetchProductDetail(id: number): Promise<Product> {
  return fetchJson<Product>(apiUrl(`/api/products/${id}`));
}

export async function fetchCategories(): Promise<Category[]> {
  return fetchJson<Category[]>(apiUrl("/api/categories"));
}