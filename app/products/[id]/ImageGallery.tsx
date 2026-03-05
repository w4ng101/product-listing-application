"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  function markError(idx: number) {
    setImgErrors((prev) => new Set([...prev, idx]));
  }

  const validImages = images.filter((_, i) => !imgErrors.has(i));

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
        {!imgErrors.has(active) ? (
          <Image
            src={images[active]}
            alt={`${title} — image ${active + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
            onError={() => markError(active)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400 text-sm">
            Image unavailable
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => {
            if (imgErrors.has(i)) return null;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                  active === i
                    ? "border-indigo-500"
                    : "border-transparent hover:border-gray-300"
                )}
              >
                <Image
                  src={src}
                  alt={`${title} thumbnail ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                  onError={() => markError(i)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
