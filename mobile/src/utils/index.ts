/**
 * Mobile utility helpers.
 *
 * DRY note
 * --------
 * The functions below (`formatPrice`, `getDiscountedPrice`, `truncate`,
 * `buildQueryString`, `debounce`) are intentionally mirrored from
 * `lib/utils.ts` (web).  If you change the signature or behaviour of any
 * of those functions there, apply the same change here and vice-versa.
 *
 * Notes on intentional differences:
 *  - No `cn()` helper here — clsx/tailwind-merge are web-only utilities.
 *  - `buildQueryString` uses manual `encodeURIComponent` joining instead of
 *    `URLSearchParams` so that space characters are encoded as `%20` (not `+`),
 *    which is the preferred encoding for React Native fetch URLs.
 */

/**
 * Format a number as USD currency.
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

/**
 * Apply a percentage discount to a price.
 */
export function getDiscountedPrice(price: number, discount: number): number {
  return price * (1 - discount / 100);
}

/**
 * Truncate a string to maxLength and append "…" if cut.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Build a query string from an object, omitting falsy/undefined values.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

/**
 * Debounce a function call.
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
