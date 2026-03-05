/**
 * App.tsx — Root entry point
 *
 * Low-end Android (1-2 GB RAM) QueryClient defaults:
 * - staleTime  5 min → avoids repeated network calls after navigation
 * - gcTime    10 min → keeps cache resident so back navigation is instant
 * - retry      2    → fail fast instead of hammering a slow connection
 * - refetch on window focus disabled → no background refetch on app resume
 *                                      (saves CPU and battery)
 */

import React, { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

import type { RootStackParamList } from '@/types';
import ProductListScreen from '@/screens/ProductListScreen';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import { COLORS } from '@/constants/config';
import ErrorBoundary from '@/components/ErrorBoundary';

// ─── QueryClient ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000,   // 5 min
      gcTime:              10 * 60 * 1000,   // 10 min
      retry:                2,
      refetchOnWindowFocus: false,           // Saves CPU on resume
      refetchOnReconnect:   true,            // Refresh when connection restored
    },
  },
});

// ─── Navigator ───────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // 6.5 — Wire AppState → React Query focusManager so the cache layer is
  // aware of foreground/background transitions.  refetchOnWindowFocus:false
  // ensures no auto-refetch fires on resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Products"
            screenOptions={{
              headerStyle:   { backgroundColor: COLORS.primary },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
              // Reduce animation overhead on low-end hardware:
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen
              name="Products"
              component={ProductListScreen}
              options={{ title: 'Products' }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              // Title is dynamically updated from the screen via navigation.setOptions
              options={({ route }) => ({ title: route.params.title ?? 'Product' })}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
