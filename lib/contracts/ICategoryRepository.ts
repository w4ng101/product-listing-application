/**
 * ICategoryRepository — Data-Access Port (SOA / Hexagonal Architecture)
 *
 * Decouples the Application layer from the concrete category data source.
 */

import type { Result } from '@/lib/result/Result';

export interface ICategoryRepository {
  /**
   * Return all available category slugs.
   */
  findAll(): Promise<Result<string[]>>;
}
