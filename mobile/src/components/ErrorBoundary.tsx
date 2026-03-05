/**
 * ErrorBoundary — catches unhandled JavaScript errors anywhere in the
 * component subtree and renders a graceful fallback instead of a blank
 * screen or a red-box crash (production builds have no red-box).
 *
 * Engineering rationale:
 *   React does not provide error boundaries as hooks — a class component is
 *   the only stable API.  One boundary at the app root plus optional
 *   per-screen boundaries provides defence-in-depth.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '@/constants/config';

interface Props {
  children: ReactNode;
  /** Optional custom fallback — receives error + reset callback */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you would forward to your crash-reporting service here
    // e.g. Sentry.captureException(error, { extra: info });
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    if (this.props.fallback && error) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title} allowFontScaling={false}>
          Something went wrong
        </Text>
        <Text style={styles.message} allowFontScaling={false} selectable>
          {error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.btnText} allowFontScaling={false}>
            Try again
          </Text>
        </Pressable>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 2,
  },
  btnPressed: { opacity: 0.8 },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
