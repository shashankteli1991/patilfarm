"use client";

import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

type Product = {
  id: string;
  name: string;
  variety: string;
  origin: string;
  description: string;
  unitType: string;
  price: number;
  stockInDozens: number;
  isActive: boolean;
  imageUrl: string;
  tag?: string | null;
};

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const outOfStock = product.stockInDozens <= 0;
  const lowStock = !outOfStock && product.stockInDozens <= 5;

  const handleAdd = () => {
    add({
      productId: product.id,
      name: product.name,
      variety: product.variety,
      unitType: product.unitType,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: qty,
      stockInDozens: product.stockInDozens,
      stockHeld: qty,
    });
    setQty(1);
  };

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition">
      <div className="relative h-56 overflow-hidden bg-stone-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover group-hover:scale-105 transition duration-500"
        />
        {product.tag && (
          <span className="absolute top-3 left-3 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            {product.tag}
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-white font-bold text-lg">
            Out of Stock
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            {product.variety}
          </span>
          <span className="text-xs text-stone-400">{product.origin}</span>
        </div>
        <h3 className="mt-1 text-lg font-bold text-stone-900">{product.name}</h3>
        <p className="mt-1 text-sm text-stone-500 line-clamp-2 flex-1">{product.description}</p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-xl font-extrabold text-stone-900">₹{product.price}</span>
            <span className="text-sm text-stone-500"> / {product.unitType.toLowerCase()}</span>
          </div>
          {lowStock && !outOfStock && (
            <span className="text-xs font-semibold text-red-600">
              Only {product.stockInDozens} left!
            </span>
          )}
          {!lowStock && !outOfStock && (
            <span className="text-xs text-emerald-600 font-medium">
              {product.stockInDozens} dozen in stock
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 text-lg font-bold text-stone-600 hover:bg-stone-100"
              disabled={outOfStock}
            >
              −
            </button>
            <span className="w-10 text-center font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="w-9 h-9 text-lg font-bold text-stone-600 hover:bg-stone-100"
              disabled={outOfStock}
            >
              +
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="flex-1 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition"
          >
            {outOfStock ? "Sold Out" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
