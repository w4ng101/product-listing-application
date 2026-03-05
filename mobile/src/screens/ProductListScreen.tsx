/**
 * ProductListScreen ” Main product listing Application screen.
 *
 * Low-end Android (1-2 GB RAM) optimisations:
 *
 * 1. @shopify/flash-list instead of FlatList:
 *    - Recycles native views (like RecyclerView on Android)
 *    - Dramatically reduces memory usage for long lists
 *
 * 2. Cursor-based infinite scroll (not per-page pagination):
 *    - FlashList onEndReached triggers fetchNextPage when 50% from bottom
 *    - useInfiniteQuery maxPages=8 caps the JS heap (≤ 96 items at a time)
 *    - nextCursor = skip offset (stable under catalogue mutations)
 *
 * 3. debounced search (500 ms):
 *    - Avoids API calls on every keystroke
 *
 * 4. React.memo on all list items (ProductCard):
 *    - Prevents re-render of existing items when only new data loads
 *
 * 5. keyExtractor returns a string from product.id:
 *    - FlashList can skip reconciliation for unchanged keys
 *
 * 6. removeClippedSubviews (FlashList default = true):
 *    - Off-screen views are unmounted from the native tree
 *
 * 7. React Query staleTime + gcTime:
 *    - Cached responses survive navigation â†’ zero network calls on back
 *
 * 8. InteractionManager.runAfterInteractions on page change:
 *    - Scroll-to-top waits until the navigation animation completes
 *
 * 9. Scroll position restoration (useFocusEffect):
 *    - scrollOffsetRef tracks the current scroll position
 *    - useFocusEffect restores it when returning from ProductDetailScreen
 *    - Handles the edge case where the OS unmounts the screen under memory pressure
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  InteractionManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { Product } from '@/types';
import type { FilterState } from '@/components/FilterSheet';
import type { SortState } from '@/components/SortSheet';
import type { RootStackParamList } from '@/types';

import { useInfiniteProducts } from '@/hooks/useInfiniteProducts';
import { useCategories } from '@/hooks/useCategories';
import { useFavorites } from '@/hooks/useFavorites';
import { usePersistedListState, DEFAULT_FILTERS, DEFAULT_SORT } from '@/hooks/usePersistedListState';

import ProductCard, { CARD_HEIGHT } from '@/components/ProductCard';
import { ProductSkeletonGrid } from '@/components/ProductSkeleton';
import SearchBar from '@/components/SearchBar';
import FilterSheet from '@/components/FilterSheet';
import SortSheet from '@/components/SortSheet';
import ErrorState from '@/components/ErrorState';

import { COLORS, SPACING, PAGE_SIZE } from '@/constants/config';

// Types and interfaces
type Props = NativeStackScreenProps<RootStackParamList, 'Products'>;

// DEFAULT_FILTERS and DEFAULT_SORT are defined in usePersistedListState and
// re-exported here so existing handler references (e.g. handleClearFilters)
// continue to work without any further changes.

// Component definition

export default function ProductListScreen({ navigation }: Props) {
  const listRef = useRef<FlashListRef<Product>>(null);

  // §6.5 — search, filters, sort, and scroll offset persist across process
  // kills (device memory pressure / extended background > 1 min).
  const {
    isRestored,
    search,  setSearch,
    filters, setFilters,
    sort,    setSort,
    scrollOffsetRef,
  } = usePersistedListState();

  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // 6.1 / 6.2 — stress-test toggles
  const [perfMode, setPerfMode] = useState(false);
  const [slowNetwork, setSlowNetwork] = useState(false);

  // Favourites state (in-memory only, no persistence) is managed with a custom hook.
  const { isFavorite, toggleFavorite } = useFavorites();

  // Scroll restoration (useFocusEffect runs when screen regains focus) 
  useFocusEffect(
    useCallback(() => {
      const offset = scrollOffsetRef.current;
      if (offset > 0) {
        InteractionManager.runAfterInteractions(() => {
          listRef.current?.scrollToOffset({ offset, animated: false });
        });
      }
    }, [scrollOffsetRef])
  );

  // Build base filters (cursor managed internally by useInfiniteProducts)
  const baseFilters = useMemo(() => ({
    search: search || undefined,
    category: filters.category || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    minRating: filters.minRating > 0 ? filters.minRating : undefined,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    perfMode: perfMode || undefined,
    slowNetwork: slowNetwork || undefined,
  }), [search, filters, sort, perfMode, slowNetwork]);

  const {
    allProducts,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteProducts(baseFilters, PAGE_SIZE);
  const { data: categories = [] } = useCategories();

  // Handlers (defined with useCallback to avoid unnecessary re-renders)

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, [setSearch]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, [setFilters]);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  const handleSortChange = useCallback((newSort: SortState) => {
    setSort(newSort);
  }, [setSort]);

  // Trigger next page load when FlashList nears the bottom
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleProductPress = useCallback(
    (product: Product) => {
      // 6.1: synthetic perf-mode items carry an offset id; navigate to the
      // original real product id so the detail screen gets a valid API response.
      const realId = product._synthetic ? product.id % 1000 : product.id;
      navigation.push('ProductDetail', { id: realId, title: product.title });
    },
    [navigation]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    },
    [scrollOffsetRef]
  );

  //Render helpers

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={handleProductPress}
        isFavorite={isFavorite(item.id)}
        onFavoriteToggle={toggleFavorite}
      />
    ),
    [handleProductPress, isFavorite, toggleFavorite]
  );

  const keyExtractor = useCallback((item: Product) => String(item.id), []);

  const hasActiveFilters =
    filters.category || filters.minPrice || filters.maxPrice || filters.minRating > 0;

  const sortLabel =
    sort.sortBy === 'title'              ? ' Name'
    : sort.sortBy === 'price'            ? ' Price'
    : sort.sortBy === 'rating'           ? ' Rating'
    : ' Discount';

  // Render a loading state until AsyncStorage has been read and the persisted state is available.

  // 6.5 — Defer rendering until AsyncStorage has been read so the first
  // React Query request fires with the real persisted filters, not defaults.
  if (!isRestored) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Row 1: Search */}
      <View style={styles.searchRow}>
        <SearchBar onSearch={handleSearch} />
      </View>

      {/* Row 2: Filter + Sort buttons */}
      <View style={styles.toolbar}>
        <Pressable
          style={[styles.chipBtn, hasActiveFilters && styles.chipBtnActive]}
          onPress={() => setShowFilters(true)}
          accessibilityLabel="Open filters"
        >
          <Text style={[styles.chipText, hasActiveFilters && styles.chipTextActive]} allowFontScaling={false}>
            {hasActiveFilters ? 'â— Filters' : 'Filters'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.chipBtn, sort !== DEFAULT_SORT && styles.chipBtnActive]}
          onPress={() => setShowSort(true)}
          accessibilityLabel="Open sort options"
        >
          <Text style={[styles.chipText, sort !== DEFAULT_SORT && styles.chipTextActive]} allowFontScaling={false}>
            {sortLabel}
          </Text>
        </Pressable>
      </View>

      {/* Row 3: Stress-test toggles (6.1 / 6.2) */}
      <View style={styles.toolbar}>
        <Pressable
          style={[styles.chipBtn, perfMode && styles.chipBtnPerf]}
          onPress={() => { setPerfMode(v => !v); }}
          accessibilityLabel="Toggle Performance Test Mode"
        >
          <Text style={[styles.chipText, perfMode && styles.chipTextPerf]} allowFontScaling={false}>
            {perfMode ? 'â— Perf (1k+)' : 'Perf Test'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.chipBtn, slowNetwork && styles.chipBtnSlow]}
          onPress={() => setSlowNetwork(v => !v)}
          accessibilityLabel="Toggle Slow 3G simulation"
        >
          <Text style={[styles.chipText, slowNetwork && styles.chipTextSlow]} allowFontScaling={false}>
            {slowNetwork ? 'â— Slow 3G' : 'Slow 3G'}
          </Text>
        </Pressable>
      </View>

      {/* Results count */}
      {total > 0 && (
        <Text style={styles.count} allowFontScaling={false}>
          {allProducts.length} / {total} product{total !== 1 ? 's' : ''}
          {isFetchingNextPage ? ' (loading more…)' : ''}
        </Text>
      )}

      {/* Content */}
      {isLoading ? (
        <ProductSkeletonGrid count={PAGE_SIZE} />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? 'Failed to load products'}
          onRetry={() => refetch()}
        />
      ) : (
        <FlashList
          ref={listRef}
          data={allProducts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          drawDistance={CARD_HEIGHT * 3}
          contentContainerStyle={styles.grid}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          // Infinite scroll: load next page when 50% from the bottom
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.footerText} allowFontScaling={false}>Loading more…</Text>
              </View>
            ) : !hasNextPage && allProducts.length > 0 ? (
              <View style={styles.footerEnd}>
                <Text style={styles.footerEndText} allowFontScaling={false}>
                  ✓ All {total} products loaded
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>ðŸ“¦</Text>
              <Text style={styles.emptyTitle} allowFontScaling={false}>No products found</Text>
              <Text style={styles.emptyText} allowFontScaling={false}>
                Try adjusting your search or filters.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      )}

      {/* Filter sheet */}
      <FilterSheet
        visible={showFilters}
        filters={filters}
        categories={categories}
        onClose={() => setShowFilters(false)}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Sort sheet */}
      <SortSheet
        visible={showSort}
        current={sort}
        onClose={() => setShowSort(false)}
        onChange={handleSortChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  chipBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  chipBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipBtnPerf: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  chipBtnSlow: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  chipTextPerf: {
    color: '#B45309',
    fontWeight: '700',
  },
  chipTextSlow: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  count: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  grid: {
    paddingHorizontal: SPACING.lg,
  },
  separator: {
    height: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: SPACING.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // ── Infinite scroll footer ─────────────────────────────────────────────────
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footerEnd: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerEndText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

