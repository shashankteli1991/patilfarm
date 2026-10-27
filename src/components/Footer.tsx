import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-300">
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <span className="text-2xl">🥭</span>
          <h3 className="mt-2 font-extrabold text-white">{site.name}</h3>
          <p className="mt-2 text-sm text-stone-400">{site.tagline}</p>
        </div>
        <div>
          <h4 className="font-bold text-white">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-white">
                Shop Mangoes
              </Link>
            </li>
            <li>
              <Link href="/checkout" className="hover:text-white">
                Checkout
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-white">
                Farm Owner Login
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white">Contact &amp; Delivery</h4>
          <ul className="mt-3 space-y-2 text-sm text-stone-400">
            <li>Delivery: {site.deliveryRegion}</li>
            <li>Origin: {site.originRegion}</li>
            <li>Phone: {site.phone}</li>
            <li>Email: {site.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-800">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-stone-500 flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
          <span>Farm-fresh &amp; seasonal.</span>
        </div>
      </div>
    </footer>
  );
}
