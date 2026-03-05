/**
 * SearchBar — debounced text input for product search.
 * Wrapped in React.memo to prevent re-renders from parent state changes.
 */
import React, { memo, useState, useCallback } from 'react';
import { View, TextInput, Pressable, StyleSheet, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { debounce } from '@/utils';

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
}

function SearchBar({ onSearch, placeholder = 'Search products…' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((v: string) => onSearch(v), SEARCH_DEBOUNCE_MS),
    [onSearch]
  );

  function handleChange(text: string) {
    setLocalValue(text);
    debouncedSearch(text);
  }

  function handleClear() {
    setLocalValue('');
    onSearch('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon} accessible={false}>🔍</Text>
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        returnKeyType="search"
        clearButtonMode="never"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search products"
        allowFontScaling={false}
        // Reduce JS thread pressure on older devices
        keyboardType="default"
      />
      {localValue.length > 0 && (
        <Pressable onPress={handleClear} accessibilityLabel="Clear search" style={styles.clearBtn}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

export default memo(SearchBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.xs,
  },
  icon: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: SPACING.xs,
  },
  clearText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
