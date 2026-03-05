/**
 * usePersistedListState — Persist & restore product list UI state across
 * process kills (device memory pressure / extended background).
 *
 * What is persisted
 * ─────────────────
 * • search string
 * • filter state  (category, price range, minimum rating)
 * • sort state    (field + order)
 * • scroll offset (updated on every scroll frame via ref; flushed to disk
 *                  immediately on AppState → 'background' or 'inactive')
 *
 * Storage
 * ───────
 * • AsyncStorage key : @product_list_v1
 * • Normal writes    : debounced 400 ms after any search / filter / sort change.
 *   The guard `!isRestored` prevents defaults from being written on top of real
 *   data during the brief async-read window on startup.
 * • Background flush : immediate synchronous-style write so the latest scroll
 *   offset (updated on every scroll frame) is always captured even if the
 *   debounce timer hasn't fired yet.
 *
 * On cold start
 * ─────────────
 * `isRestored` is false while the initial AsyncStorage read is in flight
 * (~10–50 ms on device).  Callers should defer rendering the product list
 * until isRestored is true to prevent a double network request — one with
 * default/empty filters and another immediately after with the real saved ones.
 *
 * Sort reference equality
 * ───────────────────────
 * The `sort !== DEFAULT_SORT` reference check used for the "active" chip style
 * is preserved:  when the persisted sort values equal the defaults, the hook
 * restores the exact DEFAULT_SORT constant reference, not a fresh object.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FilterState } from '@/components/FilterSheet';
import type { SortState } from '@/components/SortSheet';

// ─── Storage key ──────────────────────────────────────────────────────────────
// Bump the version suffix if the persisted schema ever changes to avoid
// silent hydration bugs from stale data in the old format.

const STORAGE_KEY = '@product_list_v1';
const WRITE_DEBOUNCE_MS = 400;

// ─── Defaults ─────────────────────────────────────────────────────────────────
// Exported so callers never need to redeclare them, and so the hook can perform
// reference-equality restoration for sort (see top-of-file comment).

export const DEFAULT_FILTERS: FilterState = {
  category: '',
  minPrice: '',
  maxPrice: '',
  minRating: 0,
};

export const DEFAULT_SORT: SortState = {
  sortBy: 'title',
  sortOrder: 'asc',
};

// ─── Persisted schema ─────────────────────────────────────────────────────────

interface PersistedState {
  search:       string;
  filters:      FilterState;
  sort:         SortState;
  scrollOffset: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PersistedListState {
  /**
   * False while the initial AsyncStorage read is in flight (~10–50 ms).
   * Render a loading indicator until true to avoid a double network request.
   */
  isRestored:     boolean;
  search:         string;
  setSearch:      (s: string) => void;
  filters:        FilterState;
  setFilters:     React.Dispatch<React.SetStateAction<FilterState>>;
  sort:           SortState;
  setSort:        React.Dispatch<React.SetStateAction<SortState>>;
  /**
   * Mutable ref tracking the live scroll offset.
   * Update it in the FlashList onScroll handler:
   *   scrollOffsetRef.current = e.nativeEvent.contentOffset.y
   */
  scrollOffsetRef: React.MutableRefObject<number>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePersistedListState(): PersistedListState {
  const [isRestored, setIsRestored] = useState(false);
  const [search,  setSearch]  = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort,    setSort]    = useState<SortState>(DEFAULT_SORT);

  // Scroll offset lives in a ref — never causes re-renders.
  const scrollOffsetRef = useRef(0);

  // Mirror mutable state into refs so write callbacks always access the latest
  // values without requiring them as effect dependencies (which would restart
  // the debounce timer on every keystroke / scroll frame).
  const latestSearch  = useRef(search);
  const latestFilters = useRef(filters);
  const latestSort    = useRef(sort);

  useEffect(() => { latestSearch.current  = search;  }, [search]);
  useEffect(() => { latestFilters.current = filters; }, [filters]);
  useEffect(() => { latestSort.current    = sort;    }, [sort]);

  // ── Load from AsyncStorage on mount ─────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as Partial<PersistedState>;

          if (typeof saved.search === 'string') {
            setSearch(saved.search);
          }

          if (saved.filters) {
            setFilters(saved.filters);
          }

          if (saved.sort) {
            // Use the exact DEFAULT_SORT reference when values are unchanged so
            // that the `sort !== DEFAULT_SORT` reference check in the UI chip
            // style correctly reports "no custom sort applied".
            const s = saved.sort;
            setSort(
              s.sortBy   === DEFAULT_SORT.sortBy &&
              s.sortOrder === DEFAULT_SORT.sortOrder
                ? DEFAULT_SORT
                : s
            );
          }

          if (typeof saved.scrollOffset === 'number' && saved.scrollOffset > 0) {
            scrollOffsetRef.current = saved.scrollOffset;
          }
        } catch {
          // Corrupt JSON — silently fall through to defaults.
        }
      })
      .catch(() => { /* I/O error — silently fall through to defaults. */ })
      .finally(() => setIsRestored(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced write on state change ─────────────────────────────────────────
  // Guard: !isRestored prevents writing empty defaults over real saved data
  //        during the brief async-read window on cold start.

  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isRestored) return;

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);

    writeTimerRef.current = setTimeout(() => {
      const data: PersistedState = {
        search:       latestSearch.current,
        filters:      latestFilters.current,
        sort:         latestSort.current,
        scrollOffset: scrollOffsetRef.current,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
  }, [search, filters, sort, isRestored]);

  // Cancel any pending write on unmount to prevent a post-unmount state update.
  useEffect(() => () => {
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
  }, []);

  // ── Immediate flush when app transitions to background ───────────────────────
  // The debounce may not have fired yet (e.g. user scrolled then immediately
  // pressed the Home button).  This ensures the latest scroll offset is always
  // persisted regardless of debounce timing.

  const flushToDisk = useCallback(() => {
    const data: PersistedState = {
      search:       latestSearch.current,
      filters:      latestFilters.current,
      sort:         latestSort.current,
      scrollOffset: scrollOffsetRef.current,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background' || status === 'inactive') {
        flushToDisk();
      }
    });
    return () => sub.remove();
  }, [flushToDisk]);

  return {
    isRestored,
    search,  setSearch,
    filters, setFilters,
    sort,    setSort,
    scrollOffsetRef,
  };
}
