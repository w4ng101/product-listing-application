"use client";

import { SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@/services/categoryService";
import { cn } from "@/lib/utils";
import RatingStars from "./RatingStars";

export interface FilterState {
  category: string;
  minPrice: string;
  maxPrice: string;
  minRating: number;
}

interface FilterPanelProps {
  filters: FilterState;
  categories: Category[];
  onFilterChange: (key: keyof FilterState, value: string | number) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  className?: string;
}

const RATING_OPTIONS = [0, 1, 2, 3, 4] as const;

export default function FilterPanel({
  filters,
  categories,
  onFilterChange,
  onClearFilters,
  isLoading = false,
  className,
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.category ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minRating > 0;

  return (
    <aside
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm",
        className
      )}
      aria-label="Product filters"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
          Filters
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 transition-colors disabled:opacity-50"
            aria-label="Clear all filters"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="filter-category"
          className="text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Category
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => onFilterChange("category", e.target.value)}
          disabled={isLoading}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                     focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
                     disabled:opacity-50 transition-colors"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Price Range
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            id="filter-min-price"
            value={filters.minPrice}
            onChange={(e) => onFilterChange("minPrice", e.target.value)}
            placeholder="Min"
            min={0}
            disabled={isLoading}
            aria-label="Minimum price"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                       placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
                       disabled:opacity-50 transition-colors"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            id="filter-max-price"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange("maxPrice", e.target.value)}
            placeholder="Max"
            min={0}
            disabled={isLoading}
            aria-label="Maximum price"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                       placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
                       disabled:opacity-50 transition-colors"
          />
        </div>
      </div>

      {/* Minimum Rating */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Minimum Rating
        </span>
        <div className="flex flex-col gap-1.5">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onFilterChange("minRating", r)}
              disabled={isLoading}
              aria-label={r === 0 ? "Any rating" : `${r} stars and above`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50",
                filters.minRating === r
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              )}
            >
              {r === 0 ? (
                <span className="text-gray-500">Any rating</span>
              ) : (
                <>
                  <RatingStars rating={r} showValue={false} />
                  <span className="text-gray-600">&amp; up</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
