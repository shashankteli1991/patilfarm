import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/site";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${site.name} - ${site.tagline}`,
};

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main>
      {/* HERO */}
      <section className="relative isolate">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero-farm.jpg)" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone-950/80 via-stone-900/60 to-stone-900/30" />
        <div className="max-w-6xl mx-auto px-4 py-24 md:py-36 text-white">
          <span className="inline-block bg-amber-500 text-stone-900 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            Farm-Direct · Seasonal · GI Tagged
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-2xl">
            The King of Mangoes, from our Konkan orchards to your Mumbai doorstep
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/85 max-w-xl">
            Handpicked Alphonso &amp; Kesar, sun-ripened naturally and delivered fresh
            across {site.deliveryRegion}. Order in dozens, straight from the farm.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="px-7 py-3.5 rounded-xl bg-amber-500 text-stone-900 font-bold hover:bg-amber-400 transition"
            >
              Order Fresh Mangoes →
            </Link>
            <Link
              href="/#how"
              className="px-7 py-3.5 rounded-xl bg-white/15 backdrop-blur font-semibold hover:bg-white/25 transition"
            >
              How it works
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-3 max-w-md gap-4 text-center">
            {[
              ["100%", "Orchard-owned"],
              ["Next-day", "Mumbai delivery"],
              ["₹0", "Haggle-free pricing"],
            ].map(([a, b]) => (
              <div key={b} className="bg-white/10 backdrop-blur rounded-xl p-3">
                <div className="text-xl font-extrabold">{a}</div>
                <div className="text-xs text-white/75">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6 text-center md:text-left">
          {[
            ["🌱", "Grown in Konkan", "Alphonso &amp; Kesar from our own Ratnagiri &amp; Devgad orchards."],
            ["🚚", "Delivered in Mumbai", "Next-day farm-fresh delivery across Mumbai, Thane &amp; Navi Mumbai."],
            ["✅", "Freshest to market", "Picked at peak ripeness, no artificial ripening, ever."],
          ].map(([icon, title, text]) => (
            <div key={title as string} className="flex gap-3 items-start">
              <span className="text-3xl">{icon}</span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-white/70">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section id="featured" className="py-16 bg-amber-50/40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-stone-900">This Season&apos;s Pick</h2>
            <p className="mt-2 text-stone-600">
              Order in dozens — the way mangoes are meant to be shared.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/products"
              className="inline-block px-8 py-3 rounded-xl border-2 border-stone-900 font-bold hover:bg-stone-900 hover:text-white transition"
            >
              View Full Catalog
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-stone-900">Fresh Mangoes in 3 Easy Steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["1", "Check your pincode", "We deliver to select areas in Mumbai, Thane &amp; Navi Mumbai."],
              ["2", "Pick your dozens", "Choose your variety &amp; quantity. We strictly never oversell."],
              ["3", "Pay &amp; receive fresh", "Confirm your order and get farm-fresh mangoes at your door."],
            ].map(([n, t, d]) => (
              <div key={n} className="text-center p-6 rounded-2xl border border-stone-200">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-xl">
                  {n}
                </div>
                <h3 className="mt-4 text-lg font-bold">{t}</h3>
                <p className="mt-1 text-sm text-stone-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORCHARD / ABOUT */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden">
            <Image
              src="/images/hero-farm.jpg"
              alt="Our Konkan mango orchard"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold">Straight from our family orchards</h2>
            <p className="mt-4 text-white/80 leading-relaxed">
              We&apos;re a family-run mango farm from the Konkan belt. Every mango is
              hand-picked at the right moment, packed carefully, and rushed to your city so it
              arrives as fresh as from our courtyard. Buy directly from the grower — no
              middlemen, no inflated prices.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["GI-tagged Alphonso origin", "Natural sun-ripening only", "Ethically grown, small-batch"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="text-amber-400">✔</span> {t}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-amber-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Mango season won&apos;t wait. Grab yours today.
          </h2>
          <p className="mt-3 text-white/90">
            Limited seasonal stock. Order early before your favourite dozen runs out.
          </p>
          <Link
            href="/products"
            className="inline-block mt-6 px-8 py-3.5 rounded-xl bg-white text-amber-700 font-bold hover:bg-stone-100 transition"
          >
            Start Ordering
          </Link>
        </div>
      </section>
    </main>
  );
}
