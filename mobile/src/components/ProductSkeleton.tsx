/**
 * ProductSkeleton — animated loading placeholder.
 *
 * Uses Animated.loop with a simple opacity pulse instead of third-party
 * shimmer libraries to keep the bundle lean on low-end devices.
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { CARD_WIDTH } from './ProductCard';
import { COLORS, RADIUS, SPACING } from '@/constants/config';

function Bone({ width, height, style }: { width: number | string; height: number; style?: object }) {
  return <View style={[{ width, height, borderRadius: RADIUS.sm, backgroundColor: '#E5E7EB' }, style]} />;
}

function ProductSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]} accessibilityLabel="Loading product">
      {/* Image placeholder */}
      <View style={styles.image} />
      {/* Text placeholders */}
      <View style={styles.info}>
        <Bone width="40%" height={10} />
        <Bone width="90%" height={12} style={{ marginTop: 3 }} />
        <Bone width="60%" height={10} style={{ marginTop: 3 }} />
        <Bone width="50%" height={14} style={{ marginTop: 4 }} />
      </View>
    </Animated.View>
  );
}

export default memo(ProductSkeleton);

export function ProductSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid} accessibilityLabel="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: '#F3F4F6',
  },
  info: {
    padding: SPACING.sm,
    gap: 3,
  },
});
