/**
 * SortSheet — slide-up modal for choosing sort order on the product list.
 *
 * Uses the same animation pattern as FilterSheet for visual consistency.
 * Kept deliberately lightweight: a single flat list of sort options rendered
 * as tappable rows — no FlatList overhead needed for 6 items.
 */
import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/config';
import type { SortField, SortOrder } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { SortField, SortOrder };

export interface SortState {
  sortBy: SortField;
  sortOrder: SortOrder;
}

interface SortSheetProps {
  visible: boolean;
  current: SortState;
  onClose: () => void;
  onChange: (sort: SortState) => void;
}

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS: Array<{ label: string; sortBy: SortField; sortOrder: SortOrder }> = [
  { label: 'Name: A → Z',          sortBy: 'title',              sortOrder: 'asc'  },
  { label: 'Name: Z → A',          sortBy: 'title',              sortOrder: 'desc' },
  { label: 'Price: Low → High',    sortBy: 'price',              sortOrder: 'asc'  },
  { label: 'Price: High → Low',    sortBy: 'price',              sortOrder: 'desc' },
  { label: 'Rating: Best first',   sortBy: 'rating',             sortOrder: 'desc' },
  { label: 'Discount: Highest',    sortBy: 'discountPercentage', sortOrder: 'desc' },
];

function isSame(a: SortState, b: SortState) {
  return a.sortBy === b.sortBy && a.sortOrder === b.sortOrder;
}

// ─── Component ────────────────────────────────────────────────────────────────

function SortSheet({ visible, current, onClose, onChange }: SortSheetProps) {
  const slideY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      bounciness: 4,
      speed: 16,
    }).start();
  }, [visible, slideY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideY }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        <Text style={styles.title} allowFontScaling={false}>Sort By</Text>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {SORT_OPTIONS.map((option) => {
            const selected = isSame(option, current);
            return (
              <Pressable
                key={`${option.sortBy}-${option.sortOrder}`}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => {
                  onChange({ sortBy: option.sortBy, sortOrder: option.sortOrder });
                  onClose();
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text
                  style={[styles.label, selected && styles.labelSelected]}
                  allowFontScaling={false}
                >
                  {option.label}
                </Text>
                {selected && (
                  <Text style={styles.checkmark} allowFontScaling={false}>✓</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText} allowFontScaling={false}>Done</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export default memo(SortSheet);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: 32,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  listContent: {
    gap: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  rowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
  },
  labelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
