"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SortField, SortOrder } from "@/types";
import type { Category } from "@/services/categoryService";
import type { FilterState } from "@/components/FilterPanel";
import type { SortState } from "@/components/SortSelect";

import { fetchCategories } from "@/services/productClientService";
import { debounce, cn } from "@/lib/utils";
import { useInfiniteProducts } from "@/lib/hooks/useInfiniteProducts";

import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import SortSelect from "@/components/SortSelect";
import ProductGrid from "@/components/ProductGrid";
import ErrorMessage from "@/components/ErrorMessage";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { SlidersHorizontal, Loader2, CheckCircle2 } from "lucide-react";

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  category: "",
  minPrice: "",
  maxPrice: "",
  minRating: 0,
};

const DEFAULT_SORT: SortState = {
  sortBy: "title",
  sortOrder: "asc",
};

const BATCH_PRESETS = [10, 20, 40, 100] as const;
const DEFAULT_LIMIT = 20;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductsClient() {
  // ─── UI State ────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [limitInput, setLimitInput] = useState(String(DEFAULT_LIMIT));
  const [showFilters, setShowFilters] = useState(false);

  // 6.1 / 6.2 ────────────────────────────────────────────────────────────────
  const [perfMode, setPerfMode] = useState(false);
  const [slowNetwork, setSlowNetwork] = useState(false);

  // Debounce raw search input before passing to the hook
  const [committedSearch, setCommittedSearch] = useState("");

  // ─── Debounced search ──────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const commitSearch = useCallback(
    debounce((value: string) => setCommittedSearch(value), 400),
    []
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    commitSearch(value);
  }

  // ─── Infinite scroll hook ──────────────────────────────────────────────────────
  const {
    allProducts,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    total,
  } = useInfiniteProducts(
    {
      search: committedSearch || undefined,
      category: filters.category || undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      sortBy: sort.sortBy as SortField,
      sortOrder: sort.sortOrder as SortOrder,
      perfMode: perfMode || undefined,
      slowNetwork: slowNetwork || undefined,
    },
    limit
  );

  // ─── IntersectionObserver sentinel ─────────────────────────────────────────────
  // A 1 px invisible div at the bottom of the list.  When it enters the
  // viewport (user is near the end), the next page is fetched automatically.
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        // Start loading when the sentinel is within 400 px of the viewport
        rootMargin: "0px 0px 400px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Load categories once on mount for the filter panel.  They are unlikely to change often, and this avoids an extra API call on every page of products.
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((e) => console.error("Failed to load categories", e));
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────────────
  function handleFilterChange(key: keyof FilterState, value: string | number) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleSortChange(value: SortState) {
    setSort(value);
  }

  function commitLimit(raw: string) {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) return;
    const clamped = Math.min(Math.max(n, 1), 100);
    setLimitInput(String(clamped));
    setLimit(clamped);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Product Catalogue
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Infinite scroll new products load automatically as you reach the bottom.
          </p>
        </div>

        {/* ─── Toolbar row 1: stress-test toggles + batch size ───────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Perf mode */}
          <button
            type="button"
            onClick={() => setPerfMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              perfMode
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-pressed={perfMode}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                perfMode ? "bg-amber-500 animate-pulse" : "bg-gray-300"
              }`}
            />
            {perfMode ? "Perf Mode (1 000+ items)" : "Performance Test"}
          </button>

          {/* Slow 3G */}
          <button
            type="button"
            onClick={() => setSlowNetwork((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              slowNetwork
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-pressed={slowNetwork}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                slowNetwork ? "bg-blue-500 animate-pulse" : "bg-gray-300"
              }`}
            />
            {slowNetwork ? "Slow 3G (+1.5 s)" : "Simulate Slow 3G"}
          </button>

          {/* Batch size selector */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Batch:</span>
            {BATCH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setLimit(preset); setLimitInput(String(preset)); }}
                className={cn(
                  "h-7 min-w-[2rem] rounded-md border px-2 text-xs font-semibold transition-colors",
                  limit === preset
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                )}
                aria-pressed={limit === preset}
              >
                {preset}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={100}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onBlur={(e) => commitLimit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitLimit((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-label="Custom batch size"
              className="h-7 w-14 rounded-md border border-gray-300 bg-white px-1.5 text-center text-xs
                         text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1
                         focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Search + Sort row */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            className="sm:max-w-md"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2
                         text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors lg:hidden"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <SortSelect
              value={sort}
              onChange={handleSortChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters â€” desktop */}
          <FilterPanel
            filters={filters}
            categories={categories}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            isLoading={isLoading}
            className="hidden w-64 flex-shrink-0 self-start lg:flex lg:flex-col"
          />

          {/* Mobile filters overlay */}
          {showFilters && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowFilters(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto
                              rounded-t-3xl bg-white p-5 shadow-xl">
                <FilterPanel
                  filters={filters}
                  categories={categories}
                  onFilterChange={handleFilterChange}
                  onClearFilters={() => {
                    handleClearFilters();
                    setShowFilters(false);
                  }}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="min-w-0 flex-1">

            {/* Initial load skeleton */}
            {isLoading && allProducts.length === 0 && (
              <ProductSkeletonGrid count={limit} />
            )}

            {/* Error state */}
            {isError && allProducts.length === 0 && (
              <ErrorMessage message={error ?? "Failed to load products"} />
            )}

            {/* Product grid */}
            {allProducts.length > 0 && (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-700">
                    {allProducts.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-700">{total}</span>{" "}
                  products
                </p>

                <ProductGrid products={allProducts} />

                {/* ─── Infinite scroll footer ──────────────────────────────────────────────── */}

                {/* Fetching-next spinner */}
                {isFetchingNextPage && (
                  <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more products…
                  </div>
                )}

                {/* All-loaded message */}
                {!hasNextPage && !isFetchingNextPage && (
                  <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    All {total} products loaded
                  </div>
                )}

                {/* Manual "Load more" fallback (e.g. reduced-motion preference) */}
                {hasNextPage && !isFetchingNextPage && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={fetchNextPage}
                      className="rounded-xl border border-indigo-300 bg-white px-6 py-2.5 text-sm
                                 font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50
                                 transition-colors"
                    >
                      Load more
                    </button>
                  </div>
                )}

                {/* Invisible IntersectionObserver sentinel */}
                <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

