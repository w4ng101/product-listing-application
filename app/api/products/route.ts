/**
 * GET /api/products
 *
 * Products collection endpoint.
 *
 * 200: PaginatedProductsResult
 * 400: { message: string }
 * 500: { message: string }
 *
 * Query-parameter validation is performed by ProductQuerySchema (Zod) —
 * the single source of truth for all filter constraints.  No ad-hoc parsing
 * or manual type-casting lives in this file.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/services/productService";
import {
  extractOrGenerate,
  CORRELATION_HEADER,
} from "@/lib/observability/correlationId";
import { createLogger } from "@/lib/observability/logger";
import { ProductQuerySchema } from "@/lib/schemas/productQuerySchema";

const log = createLogger("api-products");

// ─── Route Handler (Thin Adapter) ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const correlationId = extractOrGenerate(request.headers);

  try {
    const { searchParams } = request.nextUrl;

    // ── Validate & parse query parameters (single source of truth via Zod) ───
    const parsed = ProductQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid query parameters.";

      log.warn("GET /api/products — validation failed", {
        correlationId,
        errors: parsed.error.issues,
      });

      return NextResponse.json(
        { message },
        { status: 400, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    const {
      slowNetwork,
      perfMode,
      ...filters
    } = parsed.data;

    // ── Non-production feature flags ──────────────────────────────────────────
    if (process.env.NODE_ENV !== "production" && slowNetwork) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const result = await getProducts(
      {
        ...filters,
        // perfMode is only honoured outside production
        perfMode: process.env.NODE_ENV !== "production" && perfMode,
      },
      correlationId
    );

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
        [CORRELATION_HEADER]: correlationId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    const statusCode =
      (error as { statusCode?: number })?.statusCode ?? 500;

    log.error("GET /api/products failed", {
      correlationId,
      error: message,
      statusCode,
    });

    return NextResponse.json(
      {
        message:
          statusCode === 400
            ? message
            : "Failed to retrieve products. Please try again.",
      },
      {
        status: statusCode,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}