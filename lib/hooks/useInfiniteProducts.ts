/**
 * useInfiniteProducts — Virtualized Infinite Scroll Hook (Web / No React Query)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE — Cursor-Based Infinite Scroll + Memory-Safe Page Window      │
 * │                                                                             │
 * │  Caller                  Hook                        API Route              │
 * │  ──────────              ──────                      ─────────              │
 * │  filter change  ──────►  reset()  ─────────────────► skip=0, limit=N       │
 * │                          fetch(cursor=0)              nextCursor → 12       │
 * │                          pages = [ [p1…p12] ]                              │
 * │                                                                             │
 * │  sentinel enters ──────► fetchNextPage()             skip=12, limit=N      │
 * │  viewport                fetch(cursor=12) ──────────► nextCursor → 24       │
 * │                          pages = [ [p1…p12], [p13…p24] ]                  │
 * │                                                                             │
 * │  ...10 pages in ──────►  pages.slice(-MAX_PAGES)     oldest page dropped   │
 * │  memory                  Memory stays bounded O(MAX_PAGES × limit)         │
 * │                                                                             │
 * │  Cursor = opaque skip offset (stable under insertions/deletions)           │
 * │  nextCursor = skip + limit, or null when all items loaded                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Memory safety
 * ─────────────
 * MAX_PAGES caps the live DOM nodes rendered.  When a new page is appended and
 * the buffer exceeds MAX_PAGES, the oldest page is evicted from the `pages`
 * array.  The virtual scroll sentinel at the bottom of the list ensures the
 * user always sees the most recently loaded content.
 *
 * Concurrency safety
 * ──────────────────
 * Each fetch is tied to an AbortController.  When filters change or the
 * component unmounts, in-flight requests are aborted and stale results are
 * discarded via a `latestKey` ref guard — preventing race conditions.
 */

"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { fetchProducts } from "@/services/productClientService";
import type { Product, ProductFilters, PaginationMeta } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Maximum number of page-batches held in the DOM at any time.
 * With the default limit=12, this caps the rendered node count at 120.
 */
const MAX_PAGES = 10;

// ─── State machine ────────────────────────────────────────────────────────────

interface PageEntry {
  products: Product[];
  pagination: PaginationMeta;
}

interface InfiniteState {
  pages: PageEntry[];
  status: "idle" | "loading" | "fetching-next" | "success" | "error";
  error: string | null;
  total: number;
}

type Action =
  | { type: "RESET" }
  | { type: "FETCH_NEXT_START" }
  | { type: "FETCH_SUCCESS"; entry: PageEntry }
  | { type: "FETCH_ERROR"; error: string };

function reducer(state: InfiniteState, action: Action): InfiniteState {
  switch (action.type) {
    case "RESET":
      return { pages: [], status: "loading", error: null, total: 0 };

    case "FETCH_NEXT_START":
      return { ...state, status: "fetching-next" };

    case "FETCH_SUCCESS": {
      const appended = [...state.pages, action.entry];
      // Memory-safe window: evict oldest page when buffer overflows
      const windowed =
        appended.length > MAX_PAGES
          ? appended.slice(appended.length - MAX_PAGES)
          : appended;
      return {
        ...state,
        pages: windowed,
        status: "success",
        error: null,
        total: action.entry.pagination.total,
      };
    }

    case "FETCH_ERROR":
      return { ...state, status: "error", error: action.error };

    default:
      return state;
  }
}

const INITIAL_STATE: InfiniteState = {
  pages: [],
  status: "idle",
  error: null,
  total: 0,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface UseInfiniteProductsResult {
  /** All products across all buffered pages (flat array). */
  allProducts: Product[];
  /** Fetch the next page. No-op when already fetching or `hasNextPage` is false. */
  fetchNextPage: () => void;
  /** True when more items exist on the server. */
  hasNextPage: boolean;
  /** True while the initial (first) page is loading. */
  isLoading: boolean;
  /** True while an additional page is being fetched. */
  isFetchingNextPage: boolean;
  /** True when the last fetch failed. */
  isError: boolean;
  /** Error message, or null. */
  error: string | null;
  /** Total item count reported by the server. */
  total: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param baseFilters  Everything except `cursor`/`page` — those are managed internally.
 * @param limit        Items per page batch (default: 12, max: 100).
 */
export function useInfiniteProducts(
  baseFilters: Omit<ProductFilters, "cursor" | "page">,
  limit = 12
): UseInfiniteProductsResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Cursor for the *next* page to load.  Starts at 0, advances after each success.
  const nextCursorRef = useRef<number | null>(0);

  /**
   * Stable key describing the current filter set (excluding cursor/page).
   * When this changes, we reset and start from cursor=0.
   */
  const filterKey = JSON.stringify({ ...baseFilters, limit });
  const filterKeyRef = useRef(filterKey);

  /**
   * Each fetch is keyed by (filterKey + cursor).  The guard ensures a stale
   * response arriving after a filter change is silently dropped.
   */
  const latestFetchKey = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // ── Core fetch function ─────────────────────────────────────────────────────

  const doFetch = useCallback(
    (cursor: number, isReset: boolean) => {
      // Abort any in-flight request for the previous cursor/key
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const fetchKey = `${filterKeyRef.current}::${cursor}`;
      latestFetchKey.current = fetchKey;

      dispatch(isReset ? { type: "RESET" } : { type: "FETCH_NEXT_START" });

      fetchProducts({ ...baseFilters, limit, cursor }, ac.signal)
        .then((result) => {
          // Discard stale responses (filters changed mid-flight)
          if (latestFetchKey.current !== fetchKey) return;
          nextCursorRef.current = result.pagination.nextCursor;
          dispatch({ type: "FETCH_SUCCESS", entry: result });
        })
        .catch((err: Error) => {
          if (ac.signal.aborted) return; // intentionally cancelled — not an error
          if (latestFetchKey.current !== fetchKey) return;
          dispatch({ type: "FETCH_ERROR", error: err.message ?? "Failed to load products" });
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, limit]
  );

  // ── Reset when filters change ───────────────────────────────────────────────

  useEffect(() => {
    if (filterKey === filterKeyRef.current && state.status !== "idle") return;
    filterKeyRef.current = filterKey;
    nextCursorRef.current = 0;
    doFetch(0, true);

    return () => {
      abortRef.current?.abort();
    };
  // Reset whenever baseFilters or limit changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // ── Public fetchNextPage ────────────────────────────────────────────────────

  const fetchNextPage = useCallback(() => {
    const cursor = nextCursorRef.current;
    if (
      cursor === null ||
      state.status === "loading" ||
      state.status === "fetching-next"
    )
      return;
    doFetch(cursor, false);
  }, [doFetch, state.status]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const allProducts = state.pages.flatMap((p) => p.products);

  return {
    allProducts,
    fetchNextPage,
    hasNextPage: nextCursorRef.current !== null,
    isLoading: state.status === "loading",
    isFetchingNextPage: state.status === "fetching-next",
    isError: state.status === "error",
    error: state.error,
    total: state.total,
  };
}
