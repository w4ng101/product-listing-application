/**
 * ProductFilterSpec — Domain Value Object
 *
 * Encapsulates the validated filter criteria for a product query.
 * Using a Value Object isolates validation logic from the API route (HTTP layer)
 * and the use case (application layer).
 *
 * Validation rules are defined once in ProductFilterSpecSchema (Zod) and
 * not duplicated here — this class is the immutable typed result of that
 * validation.
 *
 * All properties are readonly after construction — Value Objects are immutable.
 */

import {
  ProductFilterSpecSchema,
  type ProductFilterSpecValidated,
} from '@/lib/schemas/productQuerySchema';
import type { SortField, SortOrder } from '@/types';

// Re-export input type so callers don't need to import the schema directly.
export type { ProductFilterSpecValidated as ProductFilterSpecInput };

// Kept for backward-compatibility with existing callers that pass a plain object.
export interface ProductFilterSpecRawInput {
  search?:    string;
  category?:  string;
  minPrice?:  number;
  maxPrice?:  number;
  minRating?: number;
  sortBy?:    SortField;
  sortOrder?: SortOrder;
  page?:      number;
  limit?:     number;
  cursor?:    number;
  perfMode?:  boolean;
}

export class ProductFilterSpec {
  readonly search:    string | undefined;
  readonly category:  string | undefined;
  readonly minPrice:  number | undefined;
  readonly maxPrice:  number | undefined;
  readonly minRating: number | undefined;
  readonly sortBy:    SortField;
  readonly sortOrder: SortOrder;
  readonly page:      number;
  readonly limit:     number;
  readonly cursor:    number | undefined;
  readonly perfMode:  boolean;

  private constructor(data: ProductFilterSpecValidated) {
    this.search    = data.search;
    this.category  = data.category;
    this.minPrice  = data.minPrice;
    this.maxPrice  = data.maxPrice;
    this.minRating = data.minRating;
    this.sortBy    = data.sortBy    as SortField;
    this.sortOrder = data.sortOrder as SortOrder;
    this.page      = data.page;
    this.limit     = data.limit;
    this.cursor    = data.cursor;
    this.perfMode  = data.perfMode;
  }

  /**
   * Factory: validate and build a ProductFilterSpec.
   *
   * Validation is delegated to the canonical Zod schema (ProductFilterSpecSchema)
   * which is the single source of truth for all filter constraints.
   *
   * Returns the spec on success, or a human-readable validation error string.
   */
  static create(input: ProductFilterSpecRawInput): ProductFilterSpec | string {
    const result = ProductFilterSpecSchema.safeParse(input);

    if (!result.success) {
      return result.error.issues[0]?.message ?? 'Invalid filter parameters.';
    }

    return new ProductFilterSpec(result.data);
  }
}
