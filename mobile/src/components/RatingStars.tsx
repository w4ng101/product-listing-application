/**
 * RatingStars — renders filled/empty stars for a given rating.
 * Uses React.memo to prevent re-renders when parent re-renders.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/config';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  showValue?: boolean;
  size?: number;
}

function RatingStars({ rating, maxRating = 5, showValue = false, size = 12 }: RatingStarsProps) {
  const filled = Math.round(rating);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${rating.toFixed(1)} out of ${maxRating} stars`}>
      {Array.from({ length: maxRating }).map((_, i) => (
        <Text key={i} style={[styles.star, { fontSize: size }, i < filled ? styles.filled : styles.empty]}>
          ★
        </Text>
      ))}
      {showValue && (
        <Text style={[styles.value, { fontSize: size }]}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

export default memo(RatingStars);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  star: {
    lineHeight: 14,
  },
  filled: {
    color: COLORS.star,
  },
  empty: {
    color: '#D1D5DB',
  },
  value: {
    marginLeft: 4,
    color: COLORS.textSecondary,
  },
});
