/**
 * GetCategoriesUseCase — Application Layer (CQRS Query)
 *
 * Retrieves product categories and enriches each with a display label.
 *
 * Business rule:
 *  - slug -> label transformation lives in the domain
 */

import type { ICategoryRepository } from "@/lib/contracts/ICategoryRepository";
import type { ILogger } from "@/lib/contracts/ILogger";
import { Result } from "@/lib/result/Result";
import { createLogger } from "@/lib/observability/logger";

export interface CategoryDto {
  slug: string;
  label: string;
}

export class GetCategoriesUseCase {
  private readonly log: ILogger;

  constructor(
    private readonly categoryRepo: ICategoryRepository,
    logger?: ILogger
  ) {
    this.log = logger ?? createLogger("get-categories-use-case");
  }

  async execute(correlationId?: string): Promise<Result<CategoryDto[]>> {
    const ctx = {
      correlationId,
      useCase: "GetCategories",
    };

    this.log.debug("Executing GetCategories", ctx);

    const result = await this.categoryRepo.findAll();

    if (!result.ok) {
      this.log.warn("GetCategories failed", {
        ...ctx,
        error: result.error,
      });

      return result;
    }

    const categories = result.value
      .map((slug) => ({
        slug,
        label: slugToLabel(slug),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    this.log.info("GetCategories succeeded", {
      ...ctx,
      count: categories.length,
    });

    return Result.ok(categories);
  }
}

// ─── Domain Logic (Slug → Label) ───────────────────────────────────────────────

function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}