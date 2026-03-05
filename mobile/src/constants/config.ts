/**
 * App-wide constants and configuration
 *
 * Android Emulator: 10.0.2.2 maps to the host machine's localhost
 * Physical device: replace with your machine's LAN IP (e.g. 192.168.1.x)
 */
import { Platform } from 'react-native';

// ─── API ──────────────────────────────────────────────────────────────────────

const DEV_HOST =
  Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${DEV_HOST}:3000`;

export const PAGE_SIZE = 20;

// ─── Low-End Device Optimisations ────────────────────────────────────────────

/**
 * FlashList tuning for 1–2 GB RAM devices.
 * Keep render window small to reduce memory pressure.
 */
export const FLASH_LIST_CONFIG = {
  estimatedItemSize: 260,        // Approximate card height in px
  drawDistance: 400,             // Pixels beyond viewport to pre-render
  disableAutoLayout: false,
  overScrollMode: 'never',      // Reduces overdraw on low-end GPU
} as const;

/**
 * Image cache settings — disk-first, small memory footprint.
 */
export const IMAGE_CACHE_POLICY = 'disk' as const;

/**
 * Debounce delay for search input (ms).
 * Larger than web (400 ms) to save CPU cycles on weaker hardware.
 */
export const SEARCH_DEBOUNCE_MS = 500;

// ─── Design tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  primary: '#4F46E5',       // indigo-600
  primaryLight: '#EEF2FF',  // indigo-50
  danger: '#E11D48',        // rose-600
  success: '#059669',       // emerald-600
  warning: '#D97706',       // amber-600
  border: '#E5E7EB',        // gray-200
  surface: '#FFFFFF',
  background: '#F9FAFB',    // gray-50
  text: '#111827',          // gray-900
  textSecondary: '#6B7280', // gray-500
  textMuted: '#9CA3AF',     // gray-400
  star: '#FBBF24',          // amber-400
  error: '#E11D48',         // rose-600 (alias for danger)
  badgeBg: '#FEF3C7',       // amber-100
  badgeText: '#92400E',     // amber-800
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
