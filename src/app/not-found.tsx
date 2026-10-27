import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center bg-stone-50 px-4 py-24">
      <div className="text-center">
        <span className="text-6xl">🥭</span>
        <h1 className="mt-4 text-4xl font-extrabold text-stone-900">Page not found</h1>
        <p className="mt-2 text-stone-600">
          We couldn&apos;t find the page you&apos;re looking for. This mango season&apos;s
          best picks are just a click away.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-7 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
