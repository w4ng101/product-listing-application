/**
 * GetProductByIdUseCase — Application Layer (CQRS Query)
 *
 * Retrieves a single product by ID.
 * Returns Result<Product> — no exceptions required.
 */

import type { IProductRepository } from "@/lib/contracts/IProductRepository";
import type { ILogger } from "@/lib/contracts/ILogger";
import type { Result } from "@/lib/result/Result";
import { ErrorCode, Result as R } from "@/lib/result/Result";
import type { Product } from "@/types";
import { createLogger } from "@/lib/observability/logger";

export class GetProductByIdUseCase {
  private readonly log: ILogger;

  constructor(
    private readonly productRepo: IProductRepository,
    logger?: ILogger
  ) {
    this.log = logger ?? createLogger("get-product-by-id-use-case");
  }

  async execute(
    id: number,
    correlationId?: string
  ): Promise<Result<Product>> {
    const ctx = {
      correlationId,
      useCase: "GetProductById",
      id,
    };

    if (!Number.isInteger(id) || id <= 0) {
      this.log.warn("Invalid product ID supplied", ctx);

      return R.fail({
        code: ErrorCode.INVALID_INPUT,
        message: "Product ID must be a positive integer.",
      });
    }

    this.log.debug("Fetching product by ID", ctx);

    const result = await this.productRepo.findById(id);

    if (result.ok) {
      this.log.debug("Product found", {
        ...ctx,
        title: result.value.title,
      });
    } else {
      this.log.warn("Product lookup failed", {
        ...ctx,
        error: result.error,
      });
    }

    return result;
  }
}