"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { site } from "@/lib/site";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-stone-100 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-3xl">🥭</span>
          <h1 className="mt-2 text-2xl font-extrabold text-stone-900">Farm Owner Portal</h1>
          <p className="text-sm text-stone-500">Sign in to {site.name}</p>
        </div>
        <form
          onSubmit={submit}
          className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@patilfarm.com"
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 font-medium bg-red-50 rounded-lg p-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-700 disabled:bg-stone-400 transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-stone-500">
          Default credentials: admin@patilfarm.com / admin123
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-sm text-amber-700 hover:underline">
            ← Back to store
          </Link>
        </p>
      </div>
    </main>
  );
}
