/**
 * ProductCard — List item card for the product grid.
 *
 * Low-end device optimisations:
 *   - React.memo with custom equality to skip re-renders
 *   - expo-image with disk cache and blurhash placeholder
 *   - Pre-calculated layout dimensions (avoids runtime measurement)
 *   - StyleSheet.create (StyleSheet objects are frozen and cheaper to diff)
 *   - allowFontScaling={false} prevents layout recalculation on font-scale changes
 */
import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import type { Product } from '@/types';
import { formatPrice, getDiscountedPrice, truncate } from '@/utils';
import { COLORS, RADIUS, SPACING, IMAGE_CACHE_POLICY } from '@/constants/config';
import RatingStars from './RatingStars';

// Card width: 2 columns with margins
const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 3) / 2;
export const CARD_HEIGHT = CARD_WIDTH + 100; // image + text area

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  /** Whether the product is in the user's favourites */
  isFavorite?: boolean;
  /** Called when the heart button is tapped */
  onFavoriteToggle?: (id: number) => void;
}

function ProductCard({ product, onPress, isFavorite = false, onFavoriteToggle }: ProductCardProps) {
  const discountedPrice = getDiscountedPrice(product.price, product.discountPercentage);
  const hasDiscount = product.discountPercentage > 0;

  const handlePress = useCallback(() => {
    onPress(product);
    // product.id is the stable dep — full object reference may differ across
    // React Query cache re-normalisations even when the data is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPress, product.id]);

  // stopPropagation prevents the outer Pressable (card nav) from also firing
  const handleFavoritePress = useCallback((e: GestureResponderEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(product.id);
  }, [onFavoriteToggle, product.id]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={handlePress}
      accessible
      accessibilityLabel={`${product.title}, ${formatPrice(discountedPrice)}`}
      accessibilityRole="button"
    >
      {/* Thumbnail */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.thumbnail }}
          style={styles.image}
          contentFit="cover"
          cachePolicy={IMAGE_CACHE_POLICY}
          // blurhash placeholder — no extra network request, minimal memory
          placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
          transition={200}
          recyclingKey={`product-thumb-${product.id}`}
          allowDownscaling
        />
        {hasDiscount && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} allowFontScaling={false}>
              -{Math.round(product.discountPercentage)}%
            </Text>
          </View>
        )}

        {/* Favourite button — absolute top-right */}
        {onFavoriteToggle && (
          <Pressable
            style={[styles.heartBtn, isFavorite && styles.heartBtnActive]}
            onPress={handleFavoritePress}
            accessibilityLabel={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={[styles.heartIcon, isFavorite && styles.heartIconActive]} allowFontScaling={false}>
              {isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1} allowFontScaling={false}>
          {product.category}
        </Text>
        <Text style={styles.title} numberOfLines={2} allowFontScaling={false}>
          {truncate(product.title, 50)}
        </Text>
        <RatingStars rating={product.rating} showValue size={11} />
        <View style={styles.priceRow}>
          <Text style={styles.price} allowFontScaling={false}>
            {formatPrice(discountedPrice)}
          </Text>
          {hasDiscount && (
            <Text style={styles.originalPrice} allowFontScaling={false}>
              {formatPrice(product.price)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// Custom equality: only re-render if the product id, prices, favourite status or handlers change
export default memo(ProductCard, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.discountPercentage === next.product.discountPercentage &&
    prev.isFavorite === next.isFavorite &&
    prev.onPress === next.onPress &&
    prev.onFavoriteToggle === next.onFavoriteToggle
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    // Shadow (Android elevation; iOS shadow)
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: {
    opacity: 0.85,
    elevation: 1,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
  },
  badge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: SPACING.sm,
    gap: 3,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  originalPrice: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  heartBtn: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow so it's visible on light and dark images
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  heartBtnActive: {
    backgroundColor: '#EF4444',
  },
  heartIcon: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  heartIconActive: {
    color: '#fff',
  },
});
