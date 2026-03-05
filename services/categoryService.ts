/**
 * CategoryService — Server-Side Facade (SOA)
 *
 * Thin adapter between API layer and GetCategoriesUseCase.
 * Business logic resides in the domain use case.
 */

import { getContainer } from "@/lib/di/container";
import type { CategoryDto } from "@/domain/categories/GetCategoriesUseCase";

export type { CategoryDto as Category };

/**
 * Retrieve categories with slug and display label.
 *
 * Throws only on unexpected infrastructure failures.
 */
export async function getCategories(
  correlationId?: string
): Promise<CategoryDto[]> {
  const { getCategories: useCase } = getContainer();

  const result = await useCase.execute(correlationId);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.value;
}