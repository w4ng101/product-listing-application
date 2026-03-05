/**
 * GET /api/categories
 *
 * Categories listing endpoint.
 *
 * 200: Category[]
 * 500: { message: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCategories } from "@/services/categoryService";
import {
  extractOrGenerate,
  CORRELATION_HEADER,
} from "@/lib/observability/correlationId";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("api-categories");

export async function GET(request: NextRequest) {
  const correlationId = extractOrGenerate(request.headers);

  try {
    const categories = await getCategories(correlationId);

    return NextResponse.json(categories, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=3600, stale-while-revalidate=300",
        [CORRELATION_HEADER]: correlationId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve categories.";

    log.error("GET /api/categories failed", {
      correlationId,
      message,
    });

    return NextResponse.json(
      { message },
      {
        status: 500,
        headers: {
          [CORRELATION_HEADER]: correlationId,
        },
      }
    );
  }
}