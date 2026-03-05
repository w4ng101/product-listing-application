"use client";

import type { Product } from "@/types";
import ProductCard from "./ProductCard";
import { PackageSearch } from "lucide-react";
import { useFavorites } from "@/lib/useFavorites";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500">
        <PackageSearch className="mb-4 h-14 w-14 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700">
          No products found
        </h3>
        <p className="mt-1 text-sm">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={isFavorite(product.id)}
          onFavoriteToggle={toggleFavorite}
        />
      ))}
    </div>
  );
}
