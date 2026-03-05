# ShopNext � Product Listing Application

A **Next.js 16** product listing Application web app paired with an **Expo / React Native** Android client, both powered by the [DummyJSON Products API](https://dummyjson.com/products).


---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Web (Next.js)](#1-web-nextjs)
  - [Mobile (Expo / React Native)](#2-mobile-expo--react-native)
- [Running the Project](#running-the-project)
  - [Web only](#web-only)
  - [Mobile only](#mobile-only)
  - [Web + Mobile together](#web--mobile-together)
- [Opening on a Device or Emulator](#opening-on-a-device-or-emulator)
- [Environment & Configuration](#environment--configuration)
- [Available Commands](#available-commands)
  - [Web commands](#web-commands)
  - [Mobile commands](#mobile-commands)
- [Running Tests](#running-tests)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [REST API Reference](#rest-api-reference)

---

## Architecture

For the full architectural breakdown — layer diagrams, dependency injection graph, cross-cutting concerns, and design decisions — see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

### Quick Summary

The project follows **Clean Architecture** (Ports & Adapters). A singleton `ApplicationContainer` in `lib/di/container.ts` wires concrete implementations to port interfaces at startup. Domain use cases never import from infrastructure; infrastructure never imports from the domain.

```
Browser / React Client
        │  HTTP
        ▼
app/api/ — HTTP Adapter Layer (Zod validation, Correlation-ID, Rate-limit)
        │
        ▼
services/ — Application Service Layer (perf-mode, slow-network flags)
        │
        ▼
domain/ — Domain Use Cases (filter · sort · paginate — pure, no I/O)
        │  IProductRepository  ICategoryRepository
        ▼
infrastructure/ — Adapters (DummyJsonRepository, ResilientHttpClient, TtlCacheService)
        │  HTTPS
        ▼
DummyJSON Products API  (https://dummyjson.com)
```

Mobile (Expo) mirrors this: `screens/ → hooks/ → services/ → Next.js REST API`.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Image Optimisation**: Next.js Image (AVIF/WebP auto-conversion, ISR cache)
- **Data Source**: [DummyJSON](https://dummyjson.com)

---

## Features

### Core
- **Product List** � responsive grid (1 to 2 to 3 to 4 cols), discount badge, low-stock badge
- **Client-Side Search** � debounced (400 ms) text search; cancels stale requests
- **Category Filter** � dynamic list fetched from the REST API
- **Price Range Filter** � min / max price inputs
- **Rating Filter** � minimum star rating selector
- **Sorting** � by name, price, rating or discount percentage (asc / desc)
- **Pagination** � windowed page selector with range label
- **Product Detail** � image gallery (with thumbnails), price / discount, shipping, returns, warranty, tags, reviews
- **Responsive Design** � mobile filter drawer, desktop sidebar

### API
- `GET /api/products` � paginated, filterable, sortable products list
- `GET /api/products/[id]` � single product by ID
- `GET /api/categories` � all available categories

### Performance
- Next.js Image with `priority` on detail page hero, lazy-loading on list cards
- `stale-while-revalidate` cache headers on all API routes
- Upstream data cached with ISR (`next: { revalidate: 300 }`)
- Stale-request cancellation using a monotonic request ID ref
- Skeleton loading states on list page

---

## Project Structure

```
product-listing/
+-- app/
|   +-- api/
|   |   +-- categories/route.ts        # GET /api/categories
|   |   +-- products/
|   |       +-- route.ts               # GET /api/products
|   |       +-- [id]/route.ts          # GET /api/products/[id]
|   +-- products/
|   |   +-- page.tsx                   # Product list page (SSR shell)
|   |   +-- ProductsClient.tsx         # Interactive list with filters
|   |   +-- [id]/
|   |       +-- page.tsx               # Product detail (RSC)
|   |       +-- ImageGallery.tsx       # Client-side image carousel
|   +-- layout.tsx
|   +-- page.tsx                       # Redirects to /products
|   +-- globals.css
+-- components/
|   +-- ErrorMessage.tsx
|   +-- FilterPanel.tsx
|   +-- Navbar.tsx
|   +-- Pagination.tsx
|   +-- ProductCard.tsx
|   +-- ProductGrid.tsx
|   +-- ProductSkeleton.tsx
|   +-- RatingStars.tsx
|   +-- SearchBar.tsx
|   +-- SortSelect.tsx
+-- services/
|   +-- categoryService.ts             # Server-side category service
|   +-- productService.ts              # Server-side product service
|   +-- productClientService.ts        # Client-side service
+-- types/
|   +-- index.ts                       # All TypeScript interfaces
+-- lib/
|   +-- utils.ts                       # Helpers: cn, formatPrice, debounce...
+-- next.config.ts
+-- tsconfig.json
```

---

## REST API Reference

### `GET /api/products`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `search` | string | � | Full-text search query |
| `category` | string | � | Category slug |
| `minPrice` | number | � | Minimum price (inclusive) |
| `maxPrice` | number | � | Maximum price (inclusive) |
| `minRating` | number | � | Minimum rating 0-5 |
| `sortBy` | price, rating, title, discountPercentage | `title` | Sort field |
| `sortOrder` | asc, desc | `asc` | Sort direction |
| `page` | number | `1` | Page number (1-based) |
| `limit` | number | `20` | Items per page (max 100) |

**Response** `200 OK`

```json
{
  "products": [...],
  "pagination": {
    "total": 194,
    "page": 1,
    "limit": 20,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### `GET /api/products/[id]`

Returns a single Product object or `404` if not found.

### `GET /api/categories`

Returns Category array � `[{ "slug": "smartphones", "label": "Smartphones" }, ...]`

---


## Performance Notes

| Concern | Solution |
|---|---|
| Image format | AVIF to WebP to JPEG auto-negotiation via Next.js Image |
| Image caching | `minimumCacheTTL: 3600` in `next.config.ts` |
| API caching | `s-maxage=300, stale-while-revalidate=60` response headers |
| Upstream caching | `next: { revalidate: 300 }` on fetch() calls in services |
| Search debounce | 400 ms debounce prevents excessive API calls while typing |
| Stale requests | Monotonic request-ID ref discards out-of-order responses |
| Skeleton UI | `ProductSkeletonGrid` shown during loading to avoid layout shift |

---

## Trade-offs Made

| Trade-off | Decision | Rationale |
|---|---|---|
| **Server-assisted vs. pure client-side search** | Server-assisted (search term sent as API query param) | The spec asks for "client-side filtering" but also "do not duplicate the full dataset in state". Holding all ~194+ products in client memory to filter locally contradicts the memory constraint. Sending the search term to the API satisfies both the responsiveness and memory goals. |
| **Full catalogue fetch + in-memory pagination (server-side)** | Repo fetches all products once, caches them in `TtlCacheService`, paginates in memory | DummyJSON does not expose `minPrice`, `maxPrice`, or `minRating` as server-side filter params. Fetching the full catalogue server-side (once, cached for 5 min) is the only way to combine arbitrary filters correctly. True per-page DummyJSON cursor calls would silently miss products that fall on filtered-out pages. |
| **`maxPages=8` sliding page window** | React Query evicts the oldest page when the 9th is loaded | Caps the JS heap to 160 items (8 × 20) on mobile. Downside: backward-scrolling past page 8 would require re-fetching. With the current 194-product catalogue this window covers everything; on a larger dataset the user would notice gaps when scrolling back far. |
| **`Animated.loop` skeleton (no shimmer library)** | Pure `Animated` API with `useNativeDriver: true` | Keeps the mobile bundle lean. Third-party shimmer libraries add ~20 KB and an extra JS-thread bridge call per frame; the native driver approach moves all animation work to the UI thread with zero JS overhead. |
| **No pull-to-refresh on mobile list** | Omitted | React Query `staleTime=5 min` keeps data fresh across typical browsing sessions. Adding pull-to-refresh would complicate the cursor state (resetting to page 0 invalidates loaded pages). Added to the "improve with more time" list. |
| **Favorites in-memory only (no server sync)** | `useFavorites` persists IDs to AsyncStorage / localStorage | Keeps the implementation self-contained without requiring backend auth. The trade-off is favorites are device-local. |

---

## What Would Potentially Break on Very Low-End Devices

Devices with ≤ 512 MB RAM or very slow CPUs (e.g. MediaTek Helio A22 class):

1. **Image gallery in Product Detail** — The horizontal `FlatList` pre-renders multiple full-resolution images simultaneously. On 512 MB RAM, loading 5–8 × 2 MB images without downscaling will spike the bitmap heap and risk an OOM kill. Mitigation would be to use `expo-image` with `allowDownscaling` and render only the active image plus its immediate neighbours.

2. **Performance Test Mode (1 000+ items)** — Even though FlashList recycles native views, the JS heap still holds 160 product objects (8 pages × 20 items). With perf mode active, the server returns densely structured synthetic objects that increase GC pressure. Scrolling at high speed through 1 020 items may produce visible frame drops on a single-core 1 GHz CPU.

3. **Animated skeleton grid** — Six concurrent `Animated.loop` pulse animations (initial load state) all sharing the native driver thread is fine on mid-range devices but may cause stutter on a single-core CPU that is simultaneously handling network I/O.

4. **AsyncStorage write latency** — Cheap eMMC flash found on sub-$100 devices can have I/O latency of 50–200 ms. The `WRITE_DEBOUNCE_MS=400` debounce in `usePersistedListState` could miss a write if the process is killed in that window. The background-flush on `AppState → background` mitigates this but does not eliminate the race entirely.

5. **Navigation animation** — `slide_from_right` is the lightest stack animation available. On a degraded GPU (e.g. Adreno 304 equivalents), even this animation may drop frames when the detail screen image starts decoding simultaneously.

---

## What Would Be Improved With More Time

1. **True DummyJSON cursor pagination** — Replace the full-catalogue fetch in `DummyJsonProductRepository.findAll()` with proper cursor-based requests (`/products?limit=20&skip=N`). The price/rating filters would then run as a post-processing step only on the fetched page. This removes the need to cache 194+ items server-side and makes the architecture truly stateless.

2. **Detail screen image memory management** — Replace the horizontal `FlatList` image gallery with a windowed pager that renders only the active image + one neighbour on each side. This reduces the peak bitmap footprint from `N × imageSize` to `3 × imageSize`.

3. **Pull-to-refresh on mobile list** — Invalidate page 0 of the React Query cursor cache without destroying the entire cache entry, then scroll to top. Requires careful key invalidation to avoid cursor drift.

4. **Image prefetching** — When the user is 3 items from the end of the current page, silently prefetch the thumbnails for the next page using `expo-image`'s `prefetch` API. This makes the load-next-page experience feel instant.

5. **Offline mode** — Persist the last-loaded product list to AsyncStorage alongside the UI state so the user can browse without a network connection. Stale data would be clearly marked.

6. **Expanded test suite** — Add unit tests for the domain use cases (`GetProductsUseCase`, `expandForPerfMode`), the hook layer (`useInfiniteProducts`, `usePersistedListState`), and integration tests for the Next.js API routes. Current coverage is component-level only.

7. **End-to-end tests** — Add Maestro flows covering: scroll to end, open detail, navigate back × 20 (§6.4 navigation stress), toggle perf mode, slow 3G toggle.

8. **Accessibility audit** — Full VoiceOver / TalkBack pass: ensure all interactive elements have correct `accessibilityRole`, `accessibilityHint`, and that the image gallery announces the current image index.
