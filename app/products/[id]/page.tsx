import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, Package, Star, Truck, RotateCcw, ShieldCheck } from "lucide-react";

import { fetchProductById } from "@/services/productService";
import { formatPrice, getDiscountedPrice } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";
import ImageGallery from "./ImageGallery";

// ─── Metadata ─────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await fetchProductById(Number(id));
    return {
      title: `${product.title} | ShopNext`,
      description: product.description,
      openGraph: {
        images: [product.thumbnail],
      },
    };
  } catch {
    return { title: "Product | ShopNext" };
  }
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);

  if (isNaN(numId) || numId <= 0) notFound();

  let product;
  try {
    product = await fetchProductById(numId);
  } catch {
    notFound();
  }

  const discountedPrice = getDiscountedPrice(
    product.price,
    product.discountPercentage
  );
  const hasDiscount = product.discountPercentage > 0;
  const savingsAmount = product.price - discountedPrice;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <Link
            href="/products"
            className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Products
          </Link>
          <span>/</span>
          <span className="capitalize text-gray-400">{product.category}</span>
          <span>/</span>
          <span className="truncate max-w-[200px] text-gray-700 font-medium">
            {product.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Left: Image Gallery */}
          <ImageGallery images={product.images} title={product.title} />

          {/* Right: Product Info */}
          <div className="flex flex-col gap-5">
            {/* Category / Brand */}
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
                {product.category}
              </span>
              {product.brand && (
                <span className="text-gray-500">by {product.brand}</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <RatingStars rating={product.rating} size="md" />
              <span className="text-sm font-medium text-gray-700">
                {product.rating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">
                ({product.reviews.length} review
                {product.reviews.length !== 1 ? "s" : ""})
              </span>
            </div>

            {/* Price */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(discountedPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-sm font-semibold text-rose-600">
                      -{Math.round(product.discountPercentage)}%
                    </span>
                  </>
                )}
              </div>
              {hasDiscount && (
                <p className="mt-1 text-sm text-emerald-600 font-medium">
                  You save {formatPrice(savingsAmount)}
                </p>
              )}
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed text-gray-600">
              {product.description}
            </p>

            {/* Stock & Availability */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span
                className={
                  product.stock > 10
                    ? "text-sm text-emerald-600 font-medium"
                    : product.stock > 0
                    ? "text-sm text-amber-600 font-medium"
                    : "text-sm text-rose-600 font-medium"
                }
              >
                {product.availabilityStatus}
                {product.stock > 0 && product.stock <= 10
                  ? ` — Only ${product.stock} left`
                  : ""}
              </span>
            </div>

            {/* Purchase Info */}
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 sm:grid-cols-3 text-sm">
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Shipping</p>
                  <p className="text-gray-500">{product.shippingInformation}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RotateCcw className="mt-0.5 h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Returns</p>
                  <p className="text-gray-500">{product.returnPolicy}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">Warranty</p>
                  <p className="text-gray-500">{product.warrantyInformation}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* SKU + Weight */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <span>SKU: {product.sku}</span>
              <span>Weight: {product.weight}g</span>
              <span>Min order: {product.minimumOrderQuantity}</span>
              <span>
                Dimensions: {product.dimensions.width}×{product.dimensions.height}×{product.dimensions.depth} cm
              </span>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {product.reviews.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-xl font-bold text-gray-900">
              Customer Reviews
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.reviews.map((review, i) => (
                <article
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {review.reviewerName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(review.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {review.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
