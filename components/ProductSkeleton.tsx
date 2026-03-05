import { cn } from "@/lib/utils";

interface ProductSkeletonProps {
  className?: string;
}

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
      aria-hidden="true"
    />
  );
}

export default function ProductSkeleton({ className }: ProductSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm",
        className
      )}
      aria-label="Loading product"
    >
      {/* Image placeholder */}
      <Bone className="aspect-square w-full rounded-none" />

      {/* Content placeholders */}
      <div className="flex flex-col gap-3 p-4">
        <Bone className="h-3 w-1/3" />
        <Bone className="h-4 w-4/5" />
        <Bone className="h-3 w-1/2" />
        <div className="mt-2 flex gap-2">
          <Bone className="h-5 w-1/3" />
          <Bone className="h-4 w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function ProductSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
