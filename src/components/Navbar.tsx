"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { site } from "@/lib/site";

export default function Navbar() {
  const { count } = useCart();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return null;

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
          active ? "bg-amber-100 text-amber-800" : "text-stone-700 hover:bg-amber-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🥭</span>
          <span className="font-extrabold text-lg text-amber-700">{site.name}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/", "Home")}
          {navLink("/products", "Shop Mangoes")}
          <Link
            href="/checkout"
            className="ml-2 relative flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition"
          >
            <span>🛒</span>
            Cart
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
