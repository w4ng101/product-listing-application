import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/constants/config';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title} allowFontScaling={false}>Something went wrong</Text>
      <Text style={styles.message} allowFontScaling={false}>{message}</Text>
      {onRetry && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onRetry}
          accessibilityLabel="Retry"
        >
          <Text style={styles.buttonText} allowFontScaling={false}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export default memo(ErrorState);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9B1C1C',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#C81E1E',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
