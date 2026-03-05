"use client";

/**
 * useFavorites — manages favorite product IDs in localStorage.
 *
 * Features
 * --------
 * • lazy initialization
 * • Set-based storage
 * • localStorage persistence
 * • React-safe updates
 */

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "shopnext_favorites";

// ─── Load helper (safe, SSR-aware) ─────────────────────────────────────────────

function loadIds(): Set<number> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids: number[] = raw ? JSON.parse(raw) : [];

    return new Set(ids);
  } catch {
    return new Set();
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(() => loadIds());

  // Persist whenever set changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...favorites])
      );
    } catch {
      // Quota or storage errors are non-fatal
    }
  }, [favorites]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: number) => favorites.has(id),
    [favorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}