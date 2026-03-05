/**
 * useInfiniteProducts — React Query Infinite Scroll Hook (Mobile)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE — Cursor-Based Infinite Scroll + Memory-Safe Page Window      │
 * │                                                                             │
 * │  FlashList        Hook (React Query)          Next.js API        DummyJSON  │
 * │  ─────────        ─────────────────          ────────────        ─────────  │
 * │  mount    ──────► useInfiniteQuery            /api/products       cached    │
 * │                   pageParam=0  ─────────────► ?cursor=0&limit=N  in-mem    │
 * │                   getNextPageParam             nextCursor=12  ◄─── cache    │
 * │                   ← pages[0]                                               │
 * │  onEndReached ──► fetchNextPage()                                           │
 * │  (threshold 0.5)  pageParam=12 ─────────────► ?cursor=12&limit=N           │
 * │                   ← pages[0,1]                                             │
 * │                                                                             │
 * │  Memory safety: maxPages=8 — React Query automatically evicts the oldest   │
 * │  page when a new one is appended, keeping the JS heap bounded.             │
 * │  With limit=20: max 160 items in memory at any time.                       │
 * │                                                                             │
 * │  Cursor stability: cursor = skip offset, not derived from page counter.    │
 * │  Unaffected by concurrent catalogue mutations.                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * React Query v5 `maxPages` automatic page-window eviction
 * ─────────────────────────────────────────────────────────
 * When the buffer exceeds maxPages, React Query *drops the oldest pages* from
 * the cache entry's `pages` array automatically.  This is the built-in memory-
 * safe sliding-window behaviour — no manual eviction needed on mobile.
 *
 * Low-end device optimisations (inherited from parent hooks):
 *   staleTime 5 min → data survives navigation without a re-fetch
 *   gcTime   10 min → cache entry lives through brief backgrounding
 *   retry 2         → transient network errors do not surface immediately
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/services/productService';
import { queryKeys } from '@/services/queryKeys';
import type { Product, ProductFilters, PaginatedProductsResult } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Max page batches kept in cache. Caps rendered item count to maxPages × limit. */
const MAX_PAGES = 8;
const STALE_TIME = 5 * 60 * 1_000;
const GC_TIME    = 10 * 60 * 1_000;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface UseInfiniteProductsResult {
  /** Flat list of all products across all cached pages. */
  allProducts: Product[];
  /** Total item count reported by the server for the current filter set. */
  total: number;
  /** Fetch the next batch.  No-op when already fetching or at end. */
  fetchNextPage: () => void;
  /** True when the server has more items beyond the current cache. */
  hasNextPage: boolean;
  /** True while the very first page is loading. */
  isLoading: boolean;
  /** True while a subsequent page is being fetched. */
  isFetchingNextPage: boolean;
  isError: boolean;
  error: Error | null;
  /** Re-fetch the first page (pull-to-refresh). */
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param baseFilters  All filters EXCEPT `cursor` and `page` — those are
 *                     managed internally by `useInfiniteQuery`.
 * @param limit        Items per page batch (default 12, max 100).
 */
export function useInfiniteProducts(
  baseFilters: Omit<ProductFilters, 'cursor' | 'page'> = {},
  limit = 12
): UseInfiniteProductsResult {
  // Normalise boolean flags so false and undefined share the same cache key
  const normalisedFilters: Omit<ProductFilters, 'cursor' | 'page'> = {
    ...baseFilters,
    limit,
    perfMode: baseFilters.perfMode === true ? true : undefined,
    slowNetwork: baseFilters.slowNetwork === true ? true : undefined,
  };

  const query = useInfiniteQuery<
    PaginatedProductsResult,
    Error,
    { pages: PaginatedProductsResult[]; pageParams: number[] },
    ReturnType<typeof queryKeys.products.infinite>,
    number
  >({
    queryKey: queryKeys.products.infinite(normalisedFilters),

    queryFn: ({ pageParam, signal }) =>
      fetchProducts({ ...normalisedFilters, cursor: pageParam }, signal),

    initialPageParam: 0,

    getNextPageParam: (lastPage) =>
      // nextCursor is null when all items are loaded
      lastPage.pagination.nextCursor ?? undefined,

    // ── Memory safety ────────────────────────────────────────────────────────
    // React Query v5: when maxPages is exceeded, the oldest page is evicted
    // from the pages array automatically, keeping memory usage bounded.
    maxPages: MAX_PAGES,

    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
  });

  const pages = query.data?.pages ?? [];
  const allProducts = pages.flatMap((p) => p.products);
  const total = pages[pages.length - 1]?.pagination.total ?? 0;

  return {
    allProducts,
    total,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    refetch: () => { void query.refetch(); },
  };
}
