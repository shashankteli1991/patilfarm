"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { site } from "@/lib/site";

type Tab = "sales" | "inventory" | "orders";
type AdminUser = { id: string; email: string; name: string; role: string };

type Stats = {
  year: number;
  availableYears: number[];
  totalOrders: number;
  totalRevenue: number;
  totalOrderValue: number;
  paidOrders: number;
  unpaidOrders: number;
  statusBreakdown: Record<string, number>;
  paymentBreakdown: Record<string, { count: number; amount: number }>;
  monthly: Record<number, { orders: number; revenue: number; orderValue: number }>;
};

type Product = {
  id: string;
  name: string;
  variety: string;
  origin: string;
  unitType: string;
  price: number;
  stockInDozens: number;
  isActive: boolean;
  imageUrl: string;
  tag?: string | null;
};

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitType: string;
  price: number;
};

type Order = {
  id: string;
  orderNumber: string;
  name: string;
  email: string | null;
  phone: string;
  addressLine1: string;
  city: string;
  pincode: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentLink: string | null;
  rejectionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  items: OrderItem[];
};

const ORDER_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "PROCESSING", "IN_PROGRESS", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAYMENT_STATUSES = ["UNPAID", "PAID", "FAILED", "REFUNDED"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};
const payColor: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  UNPAID: "bg-stone-200 text-stone-700",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-stone-200 text-stone-700",
};

export default function AdminDashboard({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sales");

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsYear, setStatsYear] = useState<number>(new Date().getFullYear());

  const [products, setProducts] = useState<Product[]>([]);
  const [uploadingProduct, setUploadingProduct] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderYear, setOrderYear] = useState<number>(new Date().getFullYear());
  const [orderFilter, setOrderFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

  // Accept / Reject modal state
  const [decisionFor, setDecisionFor] = useState<Order | null>(null);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState("");
  const [decisionInfo, setDecisionInfo] = useState("");
  const [decisionLink, setDecisionLink] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  };

  const loadStats = useCallback(async (year: number) => {
    try {
      const res = await fetch(`/api/admin/stats?year=${year}`);
      if (res.status === 401) return router.push("/admin/login");
      const data = await res.json();
      setStats(data);
    } catch {
      /* ignore */
    }
  }, [router]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.status === 401) return router.push("/admin/login");
      const data = await res.json();
      setProducts(data.products);
    } catch {
      /* ignore */
    }
  }, [router]);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orderYear) params.set("year", String(orderYear));
      if (orderFilter !== "ALL") params.set("status", orderFilter);
      if (paymentFilter !== "ALL") params.set("payment", paymentFilter);
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.status === 401) return router.push("/admin/login");
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      /* ignore */
    }
  }, [router, orderYear, orderFilter, paymentFilter]);

  useEffect(() => {
    if (tab === "sales") loadStats(statsYear);
    if (tab === "inventory") loadProducts();
    if (tab === "orders") loadOrders();
  }, [tab, statsYear, orderYear, orderFilter, paymentFilter, loadStats, loadProducts, loadOrders]);

  const updateProduct = async (id: string, data: Record<string, unknown>) => {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    loadProducts();
  };

  const updateOrder = async (id: string, data: Record<string, unknown>) => {
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, ...data }),
    });
    loadOrders();
    if (tab === "sales") loadStats(getEffectiveYear());
  };

  // ---- Accept / Reject a customer order (emails the customer automatically) ----
const decideOrder = async (
    orderId: string,
    decision: "ACCEPT" | "REJECT",
    paymentLink: string,
    note: string
  ) => {
    setDecisionBusy(orderId);
    setDecisionError("");
    try {
      const res = await fetch("/api/admin/orders/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, decision, paymentLink, note }),
      });
      const data = await res.json();
      if (res.status === 401) return router.push("/admin/login");
      if (!res.ok) {
        setDecisionError(data.error || "Could not update the order.");
        return;
      }
      setDecisionFor(null);
      setDecisionLink("");
      setDecisionNote("");
      setDecisionInfo(
        data.email?.sent
          ? `Order ${data.order.orderNumber} ${decision === "ACCEPT" ? "accepted" : "rejected"} - customer emailed.`
          : `Order ${data.order.orderNumber} updated, but the customer email was NOT sent (${data.email?.reason || "mail not configured"}). Tell them by phone instead.`
      );
      loadOrders();
      loadProducts();
      loadStats(getEffectiveYear());
    } catch {
      setDecisionError("Network error while updating the order.");
    } finally {
      setDecisionBusy(null);
    }
  };

  // Upload a new photo for a product (upload file, then point the product at it)
  const uploadImage = async (productId: string, file: File) => {
    setUploadError("");
    setUploadingProduct(productId);
    try {
      if (!file.type.startsWith("image/")) {
        setUploadError("Please choose an image file.");
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed.");
        return;
      }
      await updateProduct(productId, { imageUrl: data.url });
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploadingProduct(null);
    }
  };

  // Ensure sales year tab uses the right year variable
  function getEffectiveYear() {
    return statsYear;
  }

  const today = new Date();
  const currentYear = today.getFullYear();

  // Build year list for selectors (available years + current year)
  const yearOptions = Array.from(
    new Set([currentYear, ...(stats?.availableYears || [...Array(5)].map((_, i) => currentYear - i))])
  ).sort((a, b) => b - a);

  const maxRevenue = Math.max(1, ...(stats?.monthly ? Object.values(stats.monthly).map((m) => m.orderValue) : [1]));

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
        tab === t ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Admin header */}
      <header className="bg-stone-900 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥭</span>
            <span className="font-extrabold">{site.name} · Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 hidden sm:block">
              {user.name} ({user.email})
            </span>
            <a href="/" className="text-sm text-white/70 hover:text-white">
              View store
            </a>
            <button
              onClick={logout}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          {tabBtn("sales", "📈 Sales")}
          {tabBtn("inventory", "📦 Inventory")}
          {tabBtn("orders", "🧾 Orders")}
        </div>
      </header>

<main className="max-w-6xl mx-auto px-4 py-8">
        {decisionInfo && (
          <p className="mb-4 text-sm font-medium bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-4 py-3">
            {decisionInfo}
          </p>
        )}

        {/* ---------------- SALES ---------------- */}
        {tab === "sales" && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold">Yearly Sales</h2>
              <select
                value={statsYear}
                onChange={(e) => setStatsYear(Number(e.target.value))}
                className="px-4 py-2 border border-stone-300 rounded-xl bg-white font-semibold"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {!stats ? (
              <p className="mt-8 text-stone-500">Loading…</p>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Total Orders" value={String(stats.totalOrders)} accent="bg-stone-900" />
                  <StatCard
                    label="Revenue (Paid)"
                    value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
                    accent="bg-emerald-600"
                  />
                  <StatCard
                    label="Order Value"
                    value={`₹${stats.totalOrderValue.toLocaleString("en-IN")}`}
                    accent="bg-amber-600"
                  />
                  <StatCard
                    label="Paid / Unpaid"
                    value={`${stats.paidOrders} / ${stats.unpaidOrders}`}
                    accent="bg-blue-600"
                  />
                </div>

                {/* Monthly bar chart */}
                <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-6">
                  <h3 className="font-bold text-stone-900 mb-4">Monthly Order Value ({stats.year})</h3>
                  <div className="flex items-end gap-2 h-48">
                    {MONTHS.map((m, i) => {
                      const mData = stats.monthly[i + 1];
                      const height = mData ? Math.max(6, (mData.orderValue / maxRevenue) * 100) : 4;
                      return (
                        <div key={m} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex justify-center">
                            {mData && (
                              <span className="text-[10px] text-stone-500">
                                {Math.round(mData.orderValue)}k
                              </span>
                            )}
                          </div>
                          <div
                            className="w-full rounded-t-lg bg-amber-500 hover:bg-amber-600 transition"
                            style={{ height: `${height * 1.6}px` }}
                            title={`${m}: ${mData?.orders || 0} orders`}
                          />
                          <span className="text-[10px] text-stone-500">{m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-stone-200 p-6">
                    <h3 className="font-bold text-stone-900 mb-3">Orders by Status</h3>
                    <div className="space-y-2">
                      {ORDER_STATUSES.map((s) => {
                        const c = stats.statusBreakdown[s] || 0;
                        const pct = stats.totalOrders ? Math.round((c / stats.totalOrders) * 100) : 0;
                        return (
                          <div key={s}>
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-600">{s}</span>
                              <span className="font-semibold">{c}</span>
                            </div>
                            <div className="mt-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-stone-700 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 p-6">
                    <h3 className="font-bold text-stone-900 mb-3">Orders by Payment</h3>
                    <div className="space-y-2">
                      {PAYMENT_STATUSES.map((s) => {
                        const c = stats.paymentBreakdown?.[s]?.count || 0;
                        return (
                          <div
                            key={s}
                            className="flex justify-between items-center border border-stone-200 rounded-xl px-4 py-2.5"
                          >
                            <span className="text-sm text-stone-600">{s}</span>
                            <span className="font-bold">{c}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------------- INVENTORY ---------------- */}
        {tab === "inventory" && (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-extrabold">Inventory &amp; Stock</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Update available stock (in dozens), price per demand, seasonal visibility, or upload a
              fruit photo for each category.
            </p>

            {uploadError && (
              <p className="mt-3 text-sm text-red-600 font-medium bg-red-50 rounded-lg p-3">{uploadError}</p>
            )}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] bg-white rounded-2xl border border-stone-200 text-sm">
                <thead>
                  <tr className="text-left text-stone-500 border-b border-stone-200">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Photo</th>
                    <th className="px-4 py-3">Price / Dozen</th>
                    <th className="px-4 py-3">Stock (dozens)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            <Image src={p.imageUrl} alt={p.name} fill sizes="48px" className="object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-stone-500">
                              {p.variety} · {p.origin}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="relative inline-flex items-center gap-2 cursor-pointer">
                            <span className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold hover:bg-stone-100">
                              {uploadingProduct === p.id ? "Uploading…" : "Upload photo"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingProduct === p.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadImage(p.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <span className="text-[10px] text-stone-400 truncate max-w-[150px]" title={p.imageUrl}>
                            {p.imageUrl}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          defaultValue={p.price}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v > 0 && v !== p.price) updateProduct(p.id, { price: v });
                          }}
                          className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          defaultValue={p.stockInDozens}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v !== p.stockInDozens)
                              updateProduct(p.id, { stockInDozens: Math.floor(v) });
                          }}
                          className="w-24 px-2 py-1.5 border border-stone-300 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {p.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateProduct(p.id, { isActive: !p.isActive })}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 font-semibold hover:bg-stone-100"
                        >
                          {p.isActive ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------- ORDERS ---------------- */}
        {tab === "orders" && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold">Orders</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={orderYear}
                  onChange={(e) => setOrderYear(Number(e.target.value))}
                  className="px-3 py-2 border border-stone-300 rounded-xl bg-white text-sm font-semibold"
                >
                  <option value={0}>All years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="px-3 py-2 border border-stone-300 rounded-xl bg-white text-sm font-semibold"
                >
                  <option value="ALL">All statuses</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 border border-stone-300 rounded-xl bg-white text-sm font-semibold"
                >
                  <option value="ALL">All payments</option>
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="mt-8 text-stone-500">No orders match this filter.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          {o.orderNumber}
                          <span className="ml-2 text-sm font-normal text-stone-500">
                            {new Date(o.createdAt).toLocaleString("en-IN")}
                          </span>
                        </p>
                        <p className="text-sm text-stone-600 mt-1">
                          {o.name} · {o.phone} · {o.city} · {o.pincode}
                        </p>
                        <p className="text-xs text-stone-500">
                          {o.addressLine1} · Email:{" "}
                          {o.email ? (
                            <a href={`mailto:${o.email}`} className="underline">
                              {o.email}
                            </a>
                          ) : (
                            "none on file"
                          )}
                        </p>
                        <ul className="mt-1 text-sm text-stone-600">
                          {o.items.map((it) => (
                            <li key={it.id}>
                              {it.productName} × {it.quantity} dozen
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 font-extrabold">₹{o.totalAmount}</p>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[200px]">
                        {o.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setDecisionFor(o);
                                setDecisionError("");
                                setDecisionLink("");
                                setDecisionNote("");
                              }}
                              className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                setDecisionFor(o);
                                setDecisionError("");
                                setDecisionLink("");
                                setDecisionNote("");
                              }}
                              className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500">
                            {o.status === "REJECTED"
                              ? "Rejected - stock returned to available."
                              : o.status === "ACCEPTED"
                              ? `Accepted${o.decidedAt ? ` on ${new Date(o.decidedAt).toLocaleString("en-IN")}` : ""}. Stock committed.`
                              : "Decision made - manage status below."}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <select
                            value={o.status}
                            onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                            className="flex-1 px-2 py-1.5 border border-stone-300 rounded-lg text-sm"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor[o.status] || ""}`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={o.paymentStatus}
                            onChange={(e) => updateOrder(o.id, { paymentStatus: e.target.value })}
                            className="flex-1 px-2 py-1.5 border border-stone-300 rounded-lg text-sm"
                          >
                            {PAYMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${payColor[o.paymentStatus] || ""}`}>
                            {o.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {o.status === "REJECTED" && o.rejectionReason && (
                      <p className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        Reason sent to customer: {o.rejectionReason}
                      </p>
                    )}
                    {o.status === "ACCEPTED" && o.paymentLink && (
                      <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        Payment link emailed:{" "}
                        <a href={o.paymentLink} className="underline break-all">
                          {o.paymentLink}
                        </a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ---------- Accept / Reject modal ---------- */}
      {decisionFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">
                  Order {decisionFor.orderNumber}
                </h3>
                <p className="text-sm text-stone-600">
                  {decisionFor.name} · {decisionFor.email || "no email on file"}
                </p>
              </div>
              <button
                onClick={() => setDecisionFor(null)}
                className="text-stone-400 hover:text-stone-700 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <ul className="mt-3 text-sm text-stone-700 border-y border-stone-200 py-3 space-y-1">
              {decisionFor.items.map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span>
                    {it.productName} × {it.quantity} dozen
                  </span>
                  <span className="font-bold">
                    ₹{it.quantity * it.price}
                  </span>
                </li>
              ))}
              <li className="flex justify-between pt-2 border-t border-stone-200 font-extrabold">
                <span>Total</span>
                <span>₹{decisionFor.totalAmount}</span>
              </li>
            </ul>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Payment link (optional)
                </label>
                <input
                  type="url"
                  value={decisionLink}
                  onChange={(e) => setDecisionLink(e.target.value)}
                  placeholder="https://razorpay.com/l/xxxx or your UPI link"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Emailed to the customer when you accept. Leave blank to confirm
                  without a link.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Note to customer (optional)
                </label>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Freshly harvested on Monday, arriving Thursday."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {decisionError && (
              <p className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {decisionError}
              </p>
            )}

            <p className="mt-4 text-xs text-stone-500">
              Accepting commits the reserved stock to this order. Rejecting returns
              the stock so it can be sold again. The customer is emailed automatically.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                disabled={decisionBusy === decisionFor.id}
                onClick={() =>
                  decideOrder(
                    decisionFor.id,
                    "ACCEPT",
                    decisionLink,
                    decisionNote
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold"
              >
                {decisionBusy === decisionFor.id ? "Saving..." : "Accept & email customer"}
              </button>
              <button
                disabled={decisionBusy === decisionFor.id}
onClick={() =>
                  decideOrder(decisionFor.id, "REJECT", "", decisionNote)
                }
                className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${accent === "bg-amber-600" ? "text-amber-600" : accent === "bg-emerald-600" ? "text-emerald-600" : accent === "bg-blue-600" ? "text-blue-600" : "text-stone-900"}`}>
        {value}
      </p>
    </div>
  );
}
