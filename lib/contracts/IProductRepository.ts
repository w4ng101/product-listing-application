/**
 * IProductRepository — Data-Access Port (SOA / Hexagonal Architecture)
 *
 * Defines the contract that the Application layer uses to retrieve products.
 * The Infrastructure layer provides concrete adapters (e.g. DummyJsonProductRepository).
 *
 * Consumers (Use Cases) depend only on this interface, never on a concrete
 * implementation — satisfying the Dependency Inversion Principle.
 */

import type { Product } from '@/types';
import type { Result } from '@/lib/result/Result';

export interface IProductRepository {
  /**
   * Return the full product catalogue.
   * Implementations should cache aggressively — this is a read-heavy operation.
   */
  findAll(): Promise<Result<Product[]>>;

  /**
   * Return all products belonging to the given category slug.
   */
  findByCategory(category: string): Promise<Result<Product[]>>;

  /**
   * Full-text product search.
   * Implementations may delegate to an upstream search endpoint.
   */
  findBySearchQuery(query: string): Promise<Result<Product[]>>;

  /**
   * Return a single product by its primary key.
   * Returns Result.fail({ code: NOT_FOUND }) when the product does not exist.
   */
  findById(id: number): Promise<Result<Product>>;
}
