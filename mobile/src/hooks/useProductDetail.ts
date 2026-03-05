/**
 * useProductDetail — custom hook for a single product.
 *
 * gcTime is longer (15 min) so detail data stays cached between
 * back-and-forth navigation — avoids redundant network calls on low-end devices.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchProductById } from '@/services/productService';
import { queryKeys } from '@/services/queryKeys';

const STALE_TIME = 10 * 60 * 1000; // 10 minutes
const GC_TIME    = 15 * 60 * 1000; // 15 minutes

export function useProductDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: ({ signal }) => fetchProductById(id, signal),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
    enabled: id > 0,
  });
}
