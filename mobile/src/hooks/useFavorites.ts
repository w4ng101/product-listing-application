/**
 * useFavorites (mobile) — persists favourite product IDs via AsyncStorage.
 *
 * Reads from storage once on mount; writes back whenever the set changes.
 * The `loaded` guard prevents a write at the initial empty-state before the
 * first read completes (which would wipe previously saved favourites).
 */
import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@shopnext:favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  // Guard: prevents state updates after the component that called this hook
  // has unmounted (e.g. if the screen is popped while the AsyncStorage read
  // is still in-flight).
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mountedRef.current) return;
        if (raw) {
          const ids: number[] = JSON.parse(raw);
          setFavorites(new Set(ids));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoaded(true);
      });
  }, []);

  // Persist whenever the set changes, but skip the pre-load flush
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites])).catch(
      () => {}
    );
  }, [favorites, loaded]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: number) => favorites.has(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
