/**
 * productQuerySchema — Zod Schemas for HTTP Query Parameter Validation
 *
 * Single Source of Truth for all product-filter validation rules.
 *
 * Two schemas are provided:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ProductQuerySchema        (HTTP boundary — strings in)         │
 * │  ProductFilterSpecSchema   (Domain boundary — types in)         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ProductQuerySchema
 * ──────────────────
 * Parses raw URLSearchParams (all values are strings) and coerces them
 * to the appropriate TypeScript types.  Used by API route handlers.
 *
 * ProductFilterSpecSchema
 * ───────────────────────
 * Validates an already-typed ProductFilters object (numbers, booleans).
 * Used by ProductFilterSpec.create() in the domain/application layer.
 *
 * Keeping both schemas here ensures:
 *   • No duplicated validation logic (was previously split between the
 *     route's buildFilters() and ProductFilterSpec.create())
 *   • A single place to update rules when business requirements change
 *   • Type-safe parsing with Zod's discriminated-union result
 */

import { z } from 'zod';

// ─── Shared constants ─────────────────────────────────────────────────────────

const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/g;
const SAFE_SLUG_RE    = /^[a-z0-9-]+$/;

export const SORT_FIELDS  = ['price', 'rating', 'title', 'discountPercentage'] as const;
export const SORT_ORDERS  = ['asc', 'desc'] as const;

// ─── Coercion helpers ─────────────────────────────────────────────────────────

/**
 * Coerce a raw query-param value (string | undefined | null) to a finite
 * number, or `undefined` on empty / non-numeric input.
 */
function coerceFiniteNumber(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ─── ProductQuerySchema (HTTP boundary) ──────────────────────────────────────

/**
 * Validates and coerces raw URLSearchParams for the GET /api/products endpoint.
 *
 * Usage:
 *   const parsed = ProductQuerySchema.safeParse(Object.fromEntries(searchParams));
 *   if (!parsed.success) return 400;
 */
export const ProductQuerySchema = z
  .object({
    // ── Text filters ──────────────────────────────────────────────────────────

    /** Full-text search term. Control chars stripped; truncated to 200 chars. */
    search: z
      .string()
      .optional()
      .transform((v) => {
        if (!v) return undefined;
        const cleaned = v.replace(CONTROL_CHAR_RE, '').trim().slice(0, 200);
        return cleaned || undefined;
      }),

    /** Category slug. Lowercased; must match [a-z0-9-]. */
    category: z.preprocess(
      (v) => {
        if (!v || typeof v !== 'string') return undefined;
        const slug = v.toLowerCase().trim().slice(0, 100);
        return slug || undefined;
      },
      z
        .string()
        .regex(SAFE_SLUG_RE, 'Invalid category. Use lowercase letters, numbers, and hyphens only.')
        .optional(),
    ),

    // ── Sorting ───────────────────────────────────────────────────────────────

    sortBy:    z.enum(SORT_FIELDS).default('title'),
    sortOrder: z.enum(SORT_ORDERS).default('asc'),

    // ── Numeric range filters ─────────────────────────────────────────────────

    minPrice:  z.preprocess(coerceFiniteNumber, z.number().min(0,         'minPrice must be ≥ 0').optional()),
    maxPrice:  z.preprocess(coerceFiniteNumber, z.number().max(1_000_000, 'maxPrice must be ≤ 1,000,000').optional()),
    minRating: z.preprocess(coerceFiniteNumber, z.number().min(0).max(5,  'minRating must be between 0 and 5').optional()),

    // ── Pagination ────────────────────────────────────────────────────────────

    page: z.preprocess(
      (v) => {
        const n = Math.floor(Number(v));
        return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
      },
      z.number().int().min(1).max(10_000),
    ),

    limit: z.preprocess(
      (v) => {
        const n = Math.floor(Number(v));
        return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 12;
      },
      z.number().int().min(1).max(100),
    ),

    cursor: z.preprocess(
      (v) => {
        if (!v && v !== 0) return undefined;
        const n = Math.floor(Number(v));
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      },
      z.number().int().min(0).optional(),
    ),

    // ── Feature flags (non-production only — enforced in route handler) ───────

    perfMode:    z.string().optional().transform((v) => v?.toLowerCase() === 'true'),
    slowNetwork: z.string().optional().transform((v) => v?.toLowerCase() === 'true'),
  })
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    { message: 'minPrice must be ≤ maxPrice', path: ['minPrice'] },
  );

export type ProductQueryParsed = z.output<typeof ProductQuerySchema>;

// ─── ProductFilterSpecSchema (domain boundary) ────────────────────────────────

/**
 * Validates an already-typed ProductFilters object.
 * No string-coercion — all values are expected to be the correct types already.
 *
 * Usage (inside ProductFilterSpec.create()):
 *   const result = ProductFilterSpecSchema.safeParse(input);
 */
export const ProductFilterSpecSchema = z
  .object({
    search:    z.string().optional().transform((v) => v || undefined),
    category:  z.string().optional().transform((v) => v || undefined),

    minPrice:  z.number().min(0,         'minPrice must be ≥ 0').optional(),
    maxPrice:  z.number().max(1_000_000, 'maxPrice must be ≤ 1,000,000').optional(),
    minRating: z.number().min(0).max(5,  'minRating must be between 0 and 5').optional(),

    sortBy:    z.enum(SORT_FIELDS).default('title'),
    sortOrder: z.enum(SORT_ORDERS).default('asc'),

    page:  z.number().default(1).transform( (v) => Math.max(1,   Math.min(10_000, Math.floor(v)))),
    limit: z.number().default(12).transform((v) => Math.max(1,   Math.min(100,    Math.floor(v)))),

    cursor:   z.number().int().min(0).optional(),
    perfMode: z.boolean().default(false),
  })
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    { message: 'minPrice must be ≤ maxPrice', path: ['minPrice'] },
  );

export type ProductFilterSpecValidated = z.output<typeof ProductFilterSpecSchema>;
