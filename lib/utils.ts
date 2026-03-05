/**
 * Web utility helpers.
 *
 * DRY note
 * --------
 * The functions below are mirrored in:
 *
 *   mobile/src/utils/index.ts
 *
 * Keep behavior and signatures aligned across both environments.
 *
 * cn() is web-only (Tailwind + clsx).
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Tailwind class merger (web only) ─────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Currency formatting ─────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

// ─── Discount calculation ─────────────────────────────────────────────────────

export function getDiscountedPrice(price: number, discount: number): number {
  return price * (1 - discount / 100);
}

// ─── String utilities ─────────────────────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

// ─── Query string builder ─────────────────────────────────────────────────────

export function buildQueryString(
  params: Record<
    string,
    string | number | boolean | undefined | null
  >
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// ─── Debounce utility ─────────────────────────────────────────────────────────

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}