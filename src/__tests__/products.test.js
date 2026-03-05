import { describe, it, expect } from 'vitest';
import { products, categories } from '../data/products';

describe('products data', () => {
  it('has at least one product', () => {
    expect(products.length).toBeGreaterThan(0);
  });

  it('every product has required fields', () => {
    for (const p of products) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('price');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('description');
      expect(p).toHaveProperty('image');
      expect(p).toHaveProperty('rating');
    }
  });

  it('all product prices are positive', () => {
    for (const p of products) {
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('all ratings are between 0 and 5', () => {
    for (const p of products) {
      expect(p.rating).toBeGreaterThanOrEqual(0);
      expect(p.rating).toBeLessThanOrEqual(5);
    }
  });

  it('product ids are unique', () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('categories list includes "All"', () => {
    expect(categories).toContain('All');
  });

  it('categories list contains all product categories', () => {
    const productCategories = new Set(products.map((p) => p.category));
    for (const cat of productCategories) {
      expect(categories).toContain(cat);
    }
  });
});
