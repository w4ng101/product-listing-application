import type { Metadata } from "next";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "Products | ShopNext",
  description:
    "Browse our full product catalogue. Filter by category, price, rating and sort by your preference.",
};

export default function ProductsPage() {
  return <ProductsClient />;
}
