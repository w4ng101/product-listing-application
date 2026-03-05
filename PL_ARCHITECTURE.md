# ShopNext — Architecture

> This document describes the full architectural design of the ShopNext product-listing application, covering both the **Web (Next.js)** and **Mobile (Expo / React Native)** platforms.

---

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Web (Next.js) — Layer Diagram](#web-nextjs--layer-diagram)
- [Mobile (Expo / React Native) — Layer Diagram](#mobile-expo--react-native--layer-diagram)
- [Dependency Injection Graph](#dependency-injection-graph)
- [Cross-Cutting Concerns](#cross-cutting-concerns-lib)
- [Layer Responsibility Summary](#layer-responsibility-summary)
- [Project File Map](#project-file-map)
- [Key Design Decisions](#key-design-decisions)

---

## Design Philosophy

The project follows **Clean Architecture** (Ports & Adapters / Hexagonal Architecture) with a strict dependency rule:

> **Outer layers depend on inner layers. Inner layers never import from outer layers.**

A singleton `ApplicationContainer` (service locator in `lib/di/container.ts`) wires concrete implementations to their interfaces at startup. Swapping an adapter — e.g. replacing the in-memory cache with Redis, or pointing at a different upstream API — requires changing **only** `lib/di/container.ts`. All domain and application code remains untouched.

The mobile client mirrors this separation: screens know nothing about HTTP, hooks know nothing about UI, and the service layer knows nothing about navigation.

---

## Web (Next.js) — Layer Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                   Browser / React Client                           │
│  app/products/ProductsClient.tsx                                   │
│  lib/hooks/useInfiniteProducts.ts                                  │
│  components/  (ProductCard, FilterPanel, SearchBar, SortSelect …) │
│        │                                                          │
│        │  fetch()  →  services/productClientService.ts            │
└────────┼───────────────────────────────────────────────────────────┘
         │  HTTP  GET /api/products   GET /api/products/[id]
         │        GET /api/categories  GET /api/health
         ▼
┌────────────────────────────────────────────────────────────────────┐
│               HTTP Adapter Layer  (app/api/)                       │
│  Route handlers — Zod validation (lib/schemas/)                    │
│  Correlation-ID injection (lib/observability/correlationId.ts)     │
│  Rate-limit guard (lib/rateLimit/RateLimiter.ts)                   │
│  Delegates to Application Services ↓                               │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│          Application / Service Layer  (services/)                  │
│  productService.ts    categoryService.ts                           │
│  Orchestrates use cases, applies perfMode expansion,               │
│  slow-network simulation delay                                     │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                 Domain Layer  (domain/)                            │
│  GetProductsUseCase  ←  ProductFilterSpec (filter·sort·paginate)  │
│  GetProductByIdUseCase                                             │
│  GetCategoriesUseCase                                              │
│  Imports only ports (lib/contracts/I*.ts) — zero infra imports     │
└────────┬───────────────────────────────────────────────────────────┘
         │  IProductRepository   ICategoryRepository
         ▼
┌────────────────────────────────────────────────────────────────────┐
│          Infrastructure / Adapters  (infrastructure/)              │
│  DummyJsonProductRepository   DummyJsonCategoryRepository          │
│  ResilientHttpClient  ←  CircuitBreaker + RetryPolicy              │
│  TtlCacheService  (LRU + TTL, implements ICacheService)            │
└────────┬───────────────────────────────────────────────────────────┘
         │  HTTPS
         ▼
   DummyJSON Products API  (https://dummyjson.com)
```

### Web Layer Descriptions

| Layer | Folder | Responsibility |
|---|---|---|
| **UI / RSC** | `app/`, `components/` | Pages, React Server Components, interactive client islands |
| **Client facade** | `services/productClientService.ts` | Browser-to-internal-API bridge used by client-side hooks |
| **HTTP adapters** | `app/api/` | Route handlers — validate → correlate → delegate → respond |
| **Application services** | `services/` | Orchestrate use cases; apply perf-mode expansion and slow-network flags |
| **Domain use cases** | `domain/` | Pure business logic — filter, sort, paginate; no I/O, no framework imports |
| **Ports (contracts)** | `lib/contracts/` | Interfaces the domain depends on; never concrete types |
| **Adapters** | `infrastructure/` | DummyJSON repositories, resilient HTTP client, TTL/LRU cache |
| **Composition root** | `lib/di/container.ts` | Single file that binds all interfaces to their implementations |

---

## Mobile (Expo / React Native) — Layer Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                   Entry Point — App.tsx                            │
│  QueryClient (staleTime 5min · gcTime 10min · retry 2)             │
│  AppState → focusManager.setFocused()                              │
│  NavigationContainer  →  NativeStack                               │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                  Screens  (src/screens/)                           │
│  ProductListScreen    ← useInfiniteProducts, usePersistedListState │
│                         useCategories, useFavorites                │
│  ProductDetailScreen  ← useProductDetail, useFavorites             │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                 Data Hooks  (src/hooks/)                           │
│  useInfiniteProducts   cursor scroll, maxPages=8 memory window     │
│  useProductDetail      single product query (keyed by ID)          │
│  useCategories         category list query                         │
│  useFavorites          Set<number>, AsyncStorage persistence        │
│  usePersistedListState filter·sort·scroll, WRITE_DEBOUNCE 400ms    │
└────────┬───────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│               Service Layer  (src/services/)                       │
│  productService.ts  AbortController + ApiError typed fetch         │
│  queryKeys.ts       stable TanStack Query key factories            │
└────────┬───────────────────────────────────────────────────────────┘
         │  HTTP  (API_BASE_URL from src/constants/config.ts)
         ▼
   Next.js REST API
   (localhost:3000  or  10.0.2.2:3000 on Android emulator)
```

### Mobile Layer Descriptions

| Layer | Folder | Responsibility |
|---|---|---|
| **Entry point** | `App.tsx` | QueryClient setup, AppState wiring, navigation stack |
| **Screens** | `src/screens/` | Compose hooks + components; contain no direct data-fetching logic |
| **Data hooks** | `src/hooks/` | TanStack Query wrappers; cursor infinite scroll; persisted UI state |
| **Service layer** | `src/services/` | Fetches the Next.js REST API; AbortController cancellation; typed error mapping |
| **Components** | `src/components/` | Pure UI — `ProductCard`, `FilterSheet`, `SortSheet`, `SearchBar`, `ProductSkeleton`, `RatingStars`, `ErrorBoundary` |
| **Constants** | `src/constants/config.ts` | `API_BASE_URL`, `PAGE_SIZE`, `FLASH_LIST_CONFIG`, design tokens |
| **Types** | `src/types/index.ts` | Shared TypeScript interfaces (`Product`, `PaginatedProductsResult`, `RootStackParamList`) |

---

## Dependency Injection Graph

```
TtlCacheService            (ICacheService)
       │
ResilientHttpClient  ←  CircuitBreaker  ←  RetryPolicy
       │
DummyJsonProductRepository   (IProductRepository)
DummyJsonCategoryRepository  (ICategoryRepository)
       │
GetProductsUseCase    ←  ProductFilterSpec
GetProductByIdUseCase
GetCategoriesUseCase
       │
services/productService.ts   (thin orchestration facade)
       │
app/api/products/route.ts    (HTTP adapters: validate → delegate → respond)
app/api/health/route.ts      (exposes cache + circuit-breaker live stats)
```

All bindings live **exclusively** in `lib/di/container.ts`. Domain use cases import only port interfaces — never concrete adapters.

### Container Bootstrap Order

1. `TtlCacheService` — in-memory LRU + TTL cache (no external dependencies)
2. `CircuitBreaker` + `RetryPolicy` — stateless resilience wrappers
3. `ResilientHttpClient` — wraps fetch with circuit breaker and retry
4. `DummyJsonProductRepository` + `DummyJsonCategoryRepository` — receive `httpClient` and `cache` via constructor
5. `GetProductsUseCase` / `GetProductByIdUseCase` / `GetCategoriesUseCase` — receive repositories via constructor
6. `ApplicationContainer` singleton exported via `getContainer()`

---

## Cross-Cutting Concerns (`lib/`)

| Module | Path | Purpose |
|---|---|---|
| **Contracts (ports)** | `lib/contracts/` | `IProductRepository`, `ICategoryRepository`, `IHttpClient`, `ICacheService`, `ILogger` — domain only ever imports these |
| **DI container** | `lib/di/container.ts` | Singleton `ApplicationContainer`; the only place where interfaces are bound to concrete implementations |
| **Result monad** | `lib/result/Result.ts` | `Result<T>` railway-oriented error propagation; typed `ErrorCode` catalogue replaces thrown exceptions at service boundaries |
| **Circuit breaker** | `lib/resilience/CircuitBreaker.ts` | CLOSED → OPEN → HALF_OPEN state machine; `fire()` executes guarded calls; `stats()` exposes diagnostic snapshot |
| **Retry policy** | `lib/resilience/RetryPolicy.ts` | Exponential back-off with full jitter; non-retryable errors (4xx, `CircuitOpenError`) propagate immediately |
| **Rate limiter** | `lib/rateLimit/RateLimiter.ts` | Token-bucket rate limiter guarding all API routes |
| **Observability** | `lib/observability/` | Structured `pino`-style logger + `x-correlation-id` propagated across every HTTP hop |
| **Schemas** | `lib/schemas/productQuerySchema.ts` | Zod: `ProductQuerySchema` (HTTP strings-in) and `ProductFilterSpecSchema` (typed domain values); single source of truth for validation rules |
| **Utilities** | `lib/utils.ts` | `cn()`, `formatPrice()`, `debounce()`, `formatRating()` |

---

## Layer Responsibility Summary

| Layer | Location (Web) | Location (Mobile) | Responsibility |
|---|---|---|---|
| **UI** | `app/`, `components/` | `src/screens/`, `src/components/` | Render; no business logic |
| **Client data layer** | `lib/hooks/useInfiniteProducts.ts` | `src/hooks/` | TanStack Query; caching; pagination |
| **Client/service facade** | `services/productClientService.ts` | `src/services/productService.ts` | HTTP calls; AbortController; error mapping |
| **HTTP adapters** | `app/api/` | — | Validate → correlate → delegate → respond |
| **Application services** | `services/` | — | Orchestrate use cases; perf-mode / slow-network flags |
| **Domain use cases** | `domain/` | — | Pure filter / sort / paginate; no I/O |
| **Ports** | `lib/contracts/` | — | Interfaces domain depends on |
| **Infrastructure** | `infrastructure/` | — | DummyJSON repos, HTTP client, cache |
| **Resilience** | `lib/resilience/` | — | Circuit breaker + retry policy |
| **Composition root** | `lib/di/container.ts` | — | Wires everything together |

---

## Project File Map

### Web

```
product-listing/
├── app/
│   ├── api/
│   │   ├── categories/route.ts        GET /api/categories
│   │   ├── health/route.ts            GET /api/health (circuit + cache stats)
│   │   └── products/
│   │       ├── route.ts               GET /api/products
│   │       └── [id]/route.ts          GET /api/products/:id
│   ├── products/
│   │   ├── page.tsx                   Product list (RSC shell)
│   │   ├── ProductsClient.tsx         Interactive list island
│   │   └── [id]/
│   │       ├── page.tsx               Product detail (RSC)
│   │       └── ImageGallery.tsx       Client-side image carousel
│   ├── layout.tsx
│   └── page.tsx                       Redirects → /products
├── components/                        Shared UI components
├── domain/
│   ├── categories/GetCategoriesUseCase.ts
│   └── products/
│       ├── GetProductsUseCase.ts
│       ├── GetProductByIdUseCase.ts
│       └── filters/ProductFilterSpec.ts
├── infrastructure/
│   ├── cache/TtlCacheService.ts
│   ├── http/ResilientHttpClient.ts
│   └── repositories/
│       ├── DummyJsonProductRepository.ts
│       └── DummyJsonCategoryRepository.ts
├── lib/
│   ├── contracts/          I*.ts port interfaces
│   ├── di/container.ts     Composition root
│   ├── hooks/              Client-side React Query hooks
│   ├── observability/      Logger + correlation ID
│   ├── rateLimit/          Token-bucket rate limiter
│   ├── resilience/         CircuitBreaker + RetryPolicy
│   ├── result/Result.ts    Result<T> monad
│   └── schemas/            Zod validation schemas
├── services/
│   ├── categoryService.ts
│   ├── productService.ts
│   └── productClientService.ts
└── types/index.ts
```

### Mobile

```
mobile/
├── App.tsx                            Entry: QueryClient + Navigation
├── src/
│   ├── components/                    Pure UI components
│   ├── constants/config.ts            API_BASE_URL, PAGE_SIZE, design tokens
│   ├── hooks/
│   │   ├── useInfiniteProducts.ts     Cursor infinite scroll (maxPages=8)
│   │   ├── useProductDetail.ts        Single product query
│   │   ├── useCategories.ts           Category list query
│   │   ├── useFavorites.ts            Set<number> + AsyncStorage
│   │   └── usePersistedListState.ts   Filter/sort/scroll persistence
│   ├── screens/
│   │   ├── ProductListScreen.tsx
│   │   └── ProductDetailScreen.tsx
│   ├── services/
│   │   ├── productService.ts          AbortController fetch wrapper
│   │   └── queryKeys.ts               TanStack Query key factories
│   └── types/index.ts
```

---

## Key Design Decisions

### 1. Full-catalogue fetch + in-memory pagination (server-side)
DummyJSON does not expose `minPrice`, `maxPrice`, or `minRating` as server-side filter parameters. The repository fetches all products once, caches them in `TtlCacheService` for 5 minutes, then the domain use case runs filter → sort → paginate in memory. This is the only way to combine arbitrary filter combinations correctly without missing products on other pages.

### 2. `Result<T>` monad at service boundaries
Every use case returns `Result<T>` instead of throwing. Failure modes are explicit, composable, and typed via the `ErrorCode` catalogue (`NOT_FOUND`, `CIRCUIT_OPEN`, `RATE_LIMITED`, `TIMEOUT`, `UPSTREAM_ERROR`, `INVALID_INPUT`, `INTERNAL`). HTTP adapters translate `Result` variants to the appropriate HTTP status codes.

### 3. Circuit breaker protecting upstream calls
All outbound requests to DummyJSON flow through `ResilientHttpClient`, which wraps `CircuitBreaker` + `RetryPolicy`. If DummyJSON becomes unavailable, the circuit trips to OPEN after 5 consecutive failures and fast-fails all subsequent requests for a 30-second cooldown, preventing cascading timeouts throughout the system.

### 4. `maxPages=8` sliding window on mobile
React Query's `maxPages` option evicts the oldest page when a 9th is loaded, capping the in-memory product list at 160 items (8 × 20) regardless of how far the user scrolls. This is the primary memory-safety mechanism for low-end Android devices.

### 5. `AppState` → `focusManager` wiring (mobile)
`App.tsx` subscribes to React Native's `AppState` and calls `focusManager.setFocused()` so TanStack Query is aware of app foreground/background transitions — but `refetchOnWindowFocus: false` is set globally, so returning from background never triggers an automatic refetch. This saves CPU and battery on low-end devices while still keeping the cache lifecycle correct.

### 6. Zod as the single source of truth for filter validation
`ProductQuerySchema` validates raw URL strings at the HTTP boundary and coerces them to typed values. `ProductFilterSpecSchema` then validates the typed domain object. A single schema file means validation rules never get out of sync between the API layer and the domain layer.
