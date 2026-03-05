"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Tag, Heart } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice, getDiscountedPrice, truncate } from "@/lib/utils";
import RatingStars from "./RatingStars";

interface ProductCardProps {
  product: Product;
  /** Whether this product is in the user's favourites list */
  isFavorite?: boolean;
  /** Called when the heart button is clicked */
  onFavoriteToggle?: (id: number) => void;
}

export default function ProductCard({
  product,
  isFavorite = false,
  onFavoriteToggle,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  // §6.1: synthetic perf-mode items carry an offset id — resolve back to
  // the original real product id so the detail link doesn't 404.
  const detailId = product._synthetic ? product.id % 1000 : product.id;

  const discountedPrice = getDiscountedPrice(
    product.price,
    product.discountPercentage
  );
  const hasDiscount = product.discountPercentage > 0;

  return (
    <Link
      href={`/products/${detailId}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
      aria-label={`View details for ${product.title}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        {!imgError ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            // Performance: use placeholder blur on skeleton
            placeholder="empty"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            <Tag className="h-10 w-10" />
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
            -{Math.round(product.discountPercentage)}%
          </span>
        )}

        {/* Low-Stock Badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            Only {product.stock} left
          </span>
        )}

        {product.stock === 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}

        {/* Favourite button */}
        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle(product.id);
            }}
            className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition-colors
              ${
                isFavorite
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-white/80 text-gray-400 hover:bg-white hover:text-red-400"
              }`}
            aria-label={
              isFavorite ? "Remove from favourites" : "Add to favourites"
            }
            aria-pressed={isFavorite}
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorite ? "currentColor" : "none"}
              strokeWidth={isFavorite ? 0 : 2}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 gap-2">
        {/* Category */}
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-500">
          {product.category}
        </span>

        {/* Title */}
        <h2 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">
          {truncate(product.title, 60)}
        </h2>

        {/* Rating */}
        <RatingStars rating={product.rating} showValue />

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(discountedPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
