import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/services/productService';
import { queryKeys } from '@/services/queryKeys';

const STALE_TIME = 30 * 60 * 1000; // 30 minutes — categories rarely change

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: STALE_TIME,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}
