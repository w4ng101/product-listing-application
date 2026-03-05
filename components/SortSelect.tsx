"use client";

import { ArrowUpDown } from "lucide-react";
import type { SortField, SortOrder } from "@/types";
import { cn } from "@/lib/utils";

export interface SortState {
  sortBy: SortField;
  sortOrder: SortOrder;
}

interface SortSelectProps {
  value: SortState;
  onChange: (value: SortState) => void;
  className?: string;
  disabled?: boolean;
}

const SORT_OPTIONS: { label: string; sortBy: SortField; sortOrder: SortOrder }[] =
  [
    { label: "Name: A → Z", sortBy: "title", sortOrder: "asc" },
    { label: "Name: Z → A", sortBy: "title", sortOrder: "desc" },
    { label: "Price: Low → High", sortBy: "price", sortOrder: "asc" },
    { label: "Price: High → Low", sortBy: "price", sortOrder: "desc" },
    { label: "Rating: Best first", sortBy: "rating", sortOrder: "desc" },
    { label: "Rating: Worst first", sortBy: "rating", sortOrder: "asc" },
    { label: "Discount: Highest first", sortBy: "discountPercentage", sortOrder: "desc" },
  ];

function buildValue(sortBy: SortField, sortOrder: SortOrder) {
  return `${sortBy}-${sortOrder}`;
}

export default function SortSelect({
  value,
  onChange,
  className,
  disabled = false,
}: SortSelectProps) {
  const current = buildValue(value.sortBy, value.sortOrder);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = SORT_OPTIONS.find(
      (o) => buildValue(o.sortBy, o.sortOrder) === e.target.value
    );
    if (selected) {
      onChange({ sortBy: selected.sortBy, sortOrder: selected.sortOrder });
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ArrowUpDown
        className="h-4 w-4 flex-shrink-0 text-gray-400"
        aria-hidden="true"
      />
      <select
        value={current}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Sort products"
        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                   focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200
                   disabled:opacity-50 transition-colors cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={buildValue(opt.sortBy, opt.sortOrder)} value={buildValue(opt.sortBy, opt.sortOrder)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
