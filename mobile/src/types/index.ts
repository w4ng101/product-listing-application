// ─── Domain Types (mirrors the Next.js types/index.ts) ───────────────────────

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
  images: string[];
  thumbnail: string;
  /** True for synthetically-generated items in Performance Test Mode (§6.1).
   * These items do not correspond to a real DummyJSON product ID. */
  _synthetic?: true;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  /** Skip offset used to fetch this page. */
  cursor: number;
  /** Next skip offset, or null when all items have been loaded. */
  nextCursor: number | null;
}

export interface PaginatedProductsResult {
  products: Product[];
  pagination: PaginationMeta;
}

export interface Category {
  slug: string;
  label: string;
}

// ─── Filter & Query Types ─────────────────────────────────────────────────────

export type SortField = 'price' | 'rating' | 'title' | 'discountPercentage';
export type SortOrder = 'asc' | 'desc';

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
   */
  cursor?: number;
  /** 6.1 — Performance Test Mode: expand dataset to 1 000+ synthetic items */
  perfMode?: boolean;
  /** 6.2 — Slow-network simulation: inject ~1.5 s artificial API latency */
  slowNetwork?: boolean;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Products: undefined;
  ProductDetail: { id: number; title: string };
};
