import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Fresh Mangoes",
};

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex-1">
      <div className="bg-amber-50 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600">
            {site.originRegion}
          </span>
          <h1 className="mt-1 text-3xl md:text-4xl font-extrabold text-stone-900">
            Order Fresh Mangoes in Dozens
          </h1>
          <p className="mt-2 text-stone-600 max-w-2xl">
            Each &ldquo;dozen&rdquo; is one crate of farm-fresh mangoes. Delivery across{" "}
            {site.deliveryRegion}. We never oversell — the stock you see is exactly what&apos;s
            available.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {products.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <p className="text-2xl">🌴</p>
            <p className="mt-2">New stock is on its way. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <div className="mt-14 bg-stone-900 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to check out?</h2>
          <p className="mt-2 text-white/80">
            Review your cart, confirm your delivery pincode and place your order.
          </p>
          <Link
            href="/checkout"
            className="inline-block mt-5 px-7 py-3 rounded-xl bg-amber-500 text-stone-900 font-bold hover:bg-amber-400 transition"
          >
            Go to Checkout →
          </Link>
        </div>
      </div>
    </main>
  );
}
