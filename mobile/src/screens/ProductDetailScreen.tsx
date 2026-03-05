/**
 * ProductDetailScreen — Full product detail view.
 *
 * Low-end Android optimisations:
 * - Image pager uses a plain FlatList (horizontal, paging) — no additional libraries needed
 * - expo-image handles disk caching and progressive loading
 * - Heavy sections (reviews grid) only render when data is available
 * - useProductDetail caches results for 10 min — no re-fetch on back navigation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/types';

import { useProductDetail } from '@/hooks/useProductDetail';
import RatingStars from '@/components/RatingStars';
import ErrorState from '@/components/ErrorState';

import {
  COLORS,
  SPACING,
  RADIUS,
  IMAGE_CACHE_POLICY,
} from '@/constants/config';
import { formatPrice, getDiscountedPrice } from '@/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;        // 4:3 main image
const THUMB_SIZE = 60;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { id, title: routeTitle } = route.params;
  const { data: product, isLoading, isError, error, refetch } = useProductDetail(id);

  const [activeIndex, setActiveIndex] = useState(0);
  const mainListRef = useRef<FlatList>(null);
  const thumbListRef = useRef<FlatList>(null);
  // Mirror activeIndex in a ref so handleMainScroll's closure is stable —
  // reading from a ref never requires the callback to re-create itself.
  const activeIndexRef = useRef(0);

  // ── Image handlers ────────────────────────────────────────────────────────────

  const handleThumbPress = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
    mainListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const handleMainScroll = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      // Read + write through ref: callback deps stay empty (→ no recreation).
      if (newIndex !== activeIndexRef.current) {
        activeIndexRef.current = newIndex;
        setActiveIndex(newIndex);
        thumbListRef.current?.scrollToIndex({
          index: newIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    },
    [] // stable — reads activeIndexRef, does not close over activeIndex state
  );

  // Safe fallback when scrollToIndex targets an item that hasn't been rendered
  // yet — avoids the silent crash React Native throws in that case.
  const handleScrollToIndexFailed = useCallback(
    ({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
      const offset = index * averageItemLength;
      setTimeout(() => {
        mainListRef.current?.scrollToOffset({ offset, animated: false });
      }, 10);
    },
    []
  );

  const handleThumbScrollToIndexFailed = useCallback(
    ({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
      const offset = index * (averageItemLength || THUMB_SIZE + SPACING.sm);
      setTimeout(() => {
        thumbListRef.current?.scrollToOffset({ offset, animated: false });
      }, 10);
    },
    []
  );

  // Update nav header title once the product loads — must be before any early
  // returns to comply with the Rules of Hooks (hooks cannot be called after a
  // conditional return).
  useEffect(() => {
    if (product?.title) {
      navigation.setOptions({ title: product.title });
    }
  }, [navigation, product?.title]);

  // ── Loading / Error ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading product…</Text>
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView style={styles.center}>
        <ErrorState
          message={(error as Error)?.message ?? 'Failed to load product'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  // ── Data prep ─────────────────────────────────────────────────────────────────

  const images = product.images?.length ? product.images : [product.thumbnail];
  const discountedPrice = getDiscountedPrice(product.price, product.discountPercentage);
  const savings = product.price - discountedPrice;
  const hasDiscount = product.discountPercentage > 0;

  const stockColor =
    product.stock > 20 ? COLORS.success :
    product.stock > 5  ? COLORS.warning :
    COLORS.error;

  const stockLabel =
    product.stock > 20 ? 'In Stock' :
    product.stock > 5  ? `Only ${product.stock} left` :
    product.stock > 0  ? `⚠️ Only ${product.stock} left!` :
    'Out of Stock';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Image Gallery ────────────────────────────────────────────── */}
        <View>
          <FlatList
            ref={mainListRef}
            data={images}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleMainScroll}
            scrollEventThrottle={16}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.mainImage}
                contentFit="contain"
                cachePolicy={IMAGE_CACHE_POLICY}
                allowDownscaling
                recyclingKey={item}
                transition={200}
              />
            )}
          />

          {/* Dot indicator */}
          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {images.length > 1 && (
          <FlatList
            ref={thumbListRef}
            data={images}
            keyExtractor={(uri, i) => `thumb-${uri}-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
            getItemLayout={(_, index) => ({
              length: THUMB_SIZE + SPACING.sm,
              offset: (THUMB_SIZE + SPACING.sm) * index,
              index,
            })}
            initialNumToRender={Math.min(images.length, 6)}
            onScrollToIndexFailed={handleThumbScrollToIndexFailed}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => handleThumbPress(index)}>
                <Image
                  source={{ uri: item }}
                  style={[
                    styles.thumb,
                    index === activeIndex && styles.thumbActive,
                  ]}
                  contentFit="cover"
                  cachePolicy={IMAGE_CACHE_POLICY}
                  allowDownscaling
                  recyclingKey={item}
                />
              </Pressable>
            )}
          />
        )}

        {/* ── Content ────────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Category badge */}
          <Text style={styles.category} allowFontScaling={false}>
            {product.category}
          </Text>

          {/* Title */}
          <Text style={styles.title} allowFontScaling={false}>{product.title}</Text>

          {/* Brand */}
          {product.brand && (
            <Text style={styles.brand} allowFontScaling={false}>by {product.brand}</Text>
          )}

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <RatingStars rating={product.rating} size={16} />
            <Text style={styles.ratingText} allowFontScaling={false}>
              {product.rating.toFixed(1)}{' '}
              {product.reviews?.length
                ? `(${product.reviews.length} review${product.reviews.length !== 1 ? 's' : ''})`
                : ''}
            </Text>
          </View>

          {/* Stock */}
          <Text style={[styles.stock, { color: stockColor }]} allowFontScaling={false}>
            {stockLabel}
          </Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price} allowFontScaling={false}>
              {formatPrice(discountedPrice)}
            </Text>
            {hasDiscount && (
              <>
                <Text style={styles.originalPrice} allowFontScaling={false}>
                  {formatPrice(product.price)}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText} allowFontScaling={false}>
                    -{product.discountPercentage.toFixed(0)}%
                  </Text>
                </View>
              </>
            )}
          </View>

          {hasDiscount && (
            <Text style={styles.savings} allowFontScaling={false}>
              You save {formatPrice(savings)}
            </Text>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle} allowFontScaling={false}>Description</Text>
          <Text style={styles.description} allowFontScaling={false}>{product.description}</Text>

          {/* Info Cards */}
          <View style={styles.infoGrid}>
            {product.shippingInformation && (
              <InfoCard icon="🚚" label="Shipping" value={product.shippingInformation} />
            )}
            {product.returnPolicy && (
              <InfoCard icon="↩️" label="Returns" value={product.returnPolicy} />
            )}
            {product.warrantyInformation && (
              <InfoCard icon="🛡️" label="Warranty" value={product.warrantyInformation} />
            )}
            {product.minimumOrderQuantity && product.minimumOrderQuantity > 1 && (
              <InfoCard icon="📦" label="Min. Order" value={`Qty ${product.minimumOrderQuantity}`} />
            )}
          </View>

          {/* Specs */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle} allowFontScaling={false}>Specifications</Text>
          <SpecRow label="SKU" value={product.sku} />
          <SpecRow label="Weight" value={`${product.weight} g`} />
          {product.dimensions && (
            <SpecRow
              label="Dimensions"
              value={`${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} cm`}
            />
          )}
          <SpecRow label="Availability" value={product.availabilityStatus} />

          {/* Tags */}
          {product.tags?.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle} allowFontScaling={false}>Tags</Text>
              <View style={styles.tagsRow}>
                {product.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText} allowFontScaling={false}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Reviews */}
          {product.reviews?.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle} allowFontScaling={false}>
                Customer Reviews ({product.reviews.length})
              </Text>
              {product.reviews.map((review, i) => (
                <View key={i} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName} allowFontScaling={false}>
                      {review.reviewerName}
                    </Text>
                    <RatingStars rating={review.rating} size={12} />
                  </View>
                  <Text style={styles.reviewComment} allowFontScaling={false}>
                    {review.comment}
                  </Text>
                  <Text style={styles.reviewDate} allowFontScaling={false}>
                    {new Date(review.date).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel} allowFontScaling={false}>{label}</Text>
      <Text style={styles.infoValue} allowFontScaling={false}>{value}</Text>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel} allowFontScaling={false}>{label}</Text>
      <Text style={styles.specValue} allowFontScaling={false}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // ── Gallery ──
  mainImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: COLORS.surface,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingTop: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 14,
  },
  thumbRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },

  // ── Content ──
  content: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
  },
  brand: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  stock: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  originalPrice: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  badge: {
    backgroundColor: COLORS.badgeBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.badgeText,
  },
  savings: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  // ── Info cards ──
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },

  // ── Specs ──
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },

  // ── Tags ──
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // ── Reviews ──
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewComment: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
