/**
 * FilterSheet — modal bottom sheet for category + price + rating filters.
 * Uses RN Modal (zero extra deps) with a slide-up animation.
 *
 * Low-end optimisation: uses Animated.spring which is handled on
 * the native UI thread via useNativeDriver.
 */
import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import type { Category } from '@/types';
import { COLORS, RADIUS, SPACING } from '@/constants/config';

export interface FilterState {
  category: string;
  minPrice: string;
  maxPrice: string;
  minRating: number;
}

interface FilterSheetProps {
  visible: boolean;
  filters: FilterState;
  categories: Category[];
  onClose: () => void;
  onChange: (key: keyof FilterState, value: string | number) => void;
  onClear: () => void;
}

const RATING_OPTIONS = [0, 1, 2, 3, 4] as const;

function FilterSheet({ visible, filters, categories, onClose, onChange, onClear }: FilterSheetProps) {
  const translateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 600,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, translateY]);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  }, [translateY, onClose]);

  const hasFilters = filters.category || filters.minPrice || filters.maxPrice || filters.minRating > 0;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} allowFontScaling={false}>Filters</Text>
            {hasFilters && (
              <Pressable onPress={onClear} accessibilityLabel="Clear filters">
                <Text style={styles.clearText} allowFontScaling={false}>Clear all</Text>
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Category */}
            <Text style={styles.sectionLabel} allowFontScaling={false}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <Pressable
                style={[styles.chip, !filters.category && styles.chipActive]}
                onPress={() => onChange('category', '')}
              >
                <Text style={[styles.chipText, !filters.category && styles.chipTextActive]} allowFontScaling={false}>
                  All
                </Text>
              </Pressable>
              {categories.map(cat => (
                <Pressable
                  key={cat.slug}
                  style={[styles.chip, filters.category === cat.slug && styles.chipActive]}
                  onPress={() => onChange('category', cat.slug)}
                >
                  <Text style={[styles.chipText, filters.category === cat.slug && styles.chipTextActive]} allowFontScaling={false}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Price Range */}
            <Text style={styles.sectionLabel} allowFontScaling={false}>PRICE RANGE</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                value={filters.minPrice}
                onChangeText={v => onChange('minPrice', v)}
                placeholder="Min $"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                allowFontScaling={false}
                accessibilityLabel="Minimum price"
              />
              <Text style={styles.priceSep} allowFontScaling={false}>—</Text>
              <TextInput
                style={styles.priceInput}
                value={filters.maxPrice}
                onChangeText={v => onChange('maxPrice', v)}
                placeholder="Max $"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                allowFontScaling={false}
                accessibilityLabel="Maximum price"
              />
            </View>

            {/* Rating */}
            <Text style={styles.sectionLabel} allowFontScaling={false}>MIN RATING</Text>
            <View style={styles.ratingCol}>
              {RATING_OPTIONS.map(r => (
                <Pressable
                  key={r}
                  style={[styles.ratingRow, filters.minRating === r && styles.ratingRowActive]}
                  onPress={() => onChange('minRating', r)}
                  accessibilityLabel={r === 0 ? 'Any rating' : `${r} stars and up`}
                >
                  <Text style={[styles.ratingText, filters.minRating === r && styles.ratingTextActive]} allowFontScaling={false}>
                    {r === 0 ? 'Any rating' : `${'★'.repeat(r)}  & up`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Spacer for safe area */}
            <View style={{ height: SPACING.xxl }} />
          </ScrollView>

          {/* Apply button */}
          <Pressable
            style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
            onPress={handleClose}
          >
            <Text style={styles.applyBtnText} allowFontScaling={false}>Apply Filters</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(FilterSheet);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    backgroundColor: '#F9FAFB',
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
  },
  priceSep: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  ratingCol: {
    gap: SPACING.xs,
  },
  ratingRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  ratingRowActive: {
    backgroundColor: COLORS.primaryLight,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ratingTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  applyBtnPressed: {
    opacity: 0.85,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
