/**
 * GET /api/products/[id]
 *
 * Single product resource.
 *
 * 200: Product
 * 400: { message: string }
 * 404: { message: string }
 * 500: { message: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchProductById } from "@/services/productService";
import {
  extractOrGenerate,
  CORRELATION_HEADER,
} from "@/lib/observability/correlationId";
import { createLogger } from "@/lib/observability/logger";

const log = createLogger("api-product-detail");

type Params = {
  id: string;
};

function toProductId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const correlationId = extractOrGenerate(request.headers);
  const { id: idParam } = await params;

  const productId = toProductId(idParam);

  if (productId === null) {
    return NextResponse.json(
      { message: "Invalid product ID. Must be a positive integer." },
      {
        status: 400,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }

  try {
    const product = await fetchProductById(productId, correlationId);

    return NextResponse.json(product, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=60",
        [CORRELATION_HEADER]: correlationId,
      },
    });
  } catch (error) {
    const statusCode =
      (error as { statusCode?: number })?.statusCode ?? 500;

    const message =
      error instanceof Error ? error.message : "Unknown product error";

    log.error("GET /api/products/[id] failed", {
      correlationId,
      productId,
      statusCode,
      message,
    });

    return NextResponse.json(
      {
        message:
          statusCode === 404
            ? `Product with ID ${productId} was not found.`
            : "Failed to retrieve the product. Please try again.",
      },
      {
        status: statusCode,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}