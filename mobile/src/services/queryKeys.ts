/**
 * Centralised React Query key factory.
 * Structuring keys as arrays lets us invalidate whole subtrees efficiently
 * and keeps query keys type-safe and refactor-friendly.
 */
import type { ProductFilters } from '@/types';

export const queryKeys = {
  products: {
    detail: (id: number) => ['products', 'detail', id] as const,
    /**
     * Infinite-scroll key — cursor is managed internally by useInfiniteQuery,
     * so the baseFilters (everything except cursor/page) form the cache key.
     */
    infinite: (baseFilters: Omit<ProductFilters, 'cursor' | 'page'>) =>
      ['products', 'infinite', baseFilters] as const,
  },
  categories: {
    all: () => ['categories'] as const,
  },
} as const;
