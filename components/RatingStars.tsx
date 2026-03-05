import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export default function RatingStars({
  rating,
  maxRating = 5,
  size = "sm",
  showValue = false,
  className,
}: RatingStarsProps) {
  const filled = Math.round(rating);

  const sizeClass = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < filled
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          )}
        />
      ))}
      {showValue && (
        <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
