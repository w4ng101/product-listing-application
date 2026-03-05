// ─── Domain Types ────────────────────────────────────────────────────────────

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductMeta {
  createdAt: string;
  updatedAt: string;
  barcode: string;
  qrCode: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand: string;
  sku: string;
  weight: number;
  dimensions: ProductDimensions;
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  reviews: ProductReview[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta: ProductMeta;
  images: string[];
  thumbnail: string;
  /**
   * @internal Performance Test Mode only.
   * Populated by `expandForPerfMode` in GetProductsUseCase when `perfMode=true`.
   * Never set on items returned by real DummyJSON API calls.
   * Use the `PerfTestProduct` type when you need to narrow to synthetic items.
   */
  _synthetic?: true;
}

// ─── API Response Types ───────────────────────────────────────────────────────

// ─── Filter & Query Types ─────────────────────────────────────────────────────

export type SortField = "price" | "rating" | "title" | "discountPercentage";
export type SortOrder = "asc" | "desc";

export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  /**
   * Cursor-based pagination: skip offset for the next fetch.
   * When provided, takes precedence over `page` for slice calculation.
   * Pass `0` (or omit) for the first page.
   */
  cursor?: number;
  /** 6.1 — Performance Test Mode: expand dataset to 1 000+ synthetic items */
  perfMode?: boolean;
  /** 6.2 — Slow-network simulation: inject ~1.5 s artificial API latency */
  slowNetwork?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  /**
   * Cursor-based pagination — the skip offset used to fetch this page.
   * Consumers should treat this as an opaque token.
   */
  cursor: number;
  /**
   * The cursor to pass to fetch the next page, or `null` when all items
   * have been loaded.  Replaces offset-based `page + 1` arithmetic and
   * remains stable even if items are inserted/deleted between requests.
   */
  nextCursor: number | null;
}

export interface PaginatedProductsResult {
  products: Product[];
  pagination: PaginationMeta;
}


