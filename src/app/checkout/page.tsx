"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/components/CartProvider";
import { cartLineToItems } from "@/lib/orderItems";

type Area = { city: string; pincode: string };

export default function CheckoutPage() {
  const { cart, setQuantity, remove, subtotal, clear } = useCart();
  const router = useRouter();

  const [areas, setAreas] = useState<Area[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [pincode, setPincode] = useState("");
  const [serviceable, setServiceable] = useState<boolean | null>(null);
  const [serviceCity, setServiceCity] = useState("");
  const [checkError, setCheckError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    deliveryNotes: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [stockCheck, setStockCheck] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/serviceable");
        const data = await res.json();
        setAreas(data.areas || []);
        setCities(data.cities || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Re-validate stock against the live catalog
  useEffect(() => {
    (async () => {
      if (cart.length === 0) return;
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        const products: { id: string; stockInDozens: number }[] = data.products || [];
        const map = new Map(products.map((p) => [p.id, p]));
        const err: Record<string, string> = {};
        cart.forEach((line) => {
          const p = map.get(line.productId) as
            | { id: string; stockInDozens: number }
            | undefined;
          if (!p) err[line.productId] = "No longer available";
          else if (line.quantity > p.stockInDozens)
            err[line.productId] = `Only ${p.stockInDozens} dozen left`;
        });
        setStockCheck(err);
      } catch {
        /* ignore */
      }
    })();
  }, [cart]);

  const checkPincode = () => {
    setCheckError("");
    if (!/^\d{6}$/.test(pincode)) {
      setCheckError("Enter a valid 6-digit pincode.");
      setServiceable(null);
      setServiceCity("");
      return;
    }
    const area = areas.find((a) => a.pincode === pincode);
    if (area) {
      setServiceable(true);
      setServiceCity(area.city);
      setForm((f) => ({ ...f, city: area.city }));
    } else {
      setServiceable(false);
      setServiceCity("");
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = "Please enter your full name (min 3 characters).";
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = "Enter a valid 10-digit mobile number.";
    if (!form.email.trim()) e.email = "Email is required - we send your order confirmation and payment link here.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (!form.addressLine1.trim() || form.addressLine1.trim().length < 5)
      e.addressLine1 = "Enter your complete street address.";
    if (!form.city.trim()) e.city = "City is required.";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setSubmitError("");
    if (serviceable !== true) {
      setSubmitError("Please confirm your delivery pincode is serviceable first.");
      return;
    }
    if (!validate()) {
      setSubmitError("Please fix the highlighted fields.");
      return;
    }
    if (cart.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }
    if (Object.keys(stockCheck).length > 0) {
      setSubmitError("Some items are out of stock. Please reduce quantities and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || undefined,
          landmark: form.landmark.trim() || undefined,
          city: serviceCity || form.city.trim(),
          pincode,
          deliveryNotes: form.deliveryNotes.trim() || undefined,
          items: cartLineToItems(cart),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to place order.");
        return;
      }
      const orderId = data.order.id;
      clear();
      router.push(`/order/${orderId}`);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-stone-900">Checkout</h1>

        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* LEFT: form + serviceability */}
          <div className="space-y-6">
            {/* Serviceability */}
            <section className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="font-bold text-lg text-stone-900">1. Verify your delivery area</h2>
              <p className="text-sm text-stone-500 mt-1">
                We deliver in {["Mumbai, Thane, Navi Mumbai"].join(", ")}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter your 6-digit pincode"
                  className="flex-1 min-w-48 px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={checkPincode}
                  className="px-6 py-3 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-700"
                >
                  Check
                </button>
              </div>
              {checkError && <p className="mt-2 text-sm text-red-600">{checkError}</p>}
              {serviceable === true && (
                <p className="mt-3 text-sm text-emerald-600 font-medium">
                  ✓ Great! We deliver to pincode {pincode} ({serviceCity}).
                </p>
              )}
              {serviceable === false && (
                <p className="mt-3 text-sm text-red-600 font-medium">
                  ✗ Sorry, we don&apos;t currently deliver to pincode {pincode}. We cover{" "}
                  {["Mumbai, Thane, Navi Mumbai"].join(", ")}.
                </p>
              )}
            </section>

            {/* Delivery details */}
            <section className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="font-bold text-lg text-stone-900">2. Delivery details</h2>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <Field label="Full Name *" error={fieldErrors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Rohan Mehta"
                    className={inputCls(!!fieldErrors.name)}
                  />
                </Field>
                <Field label="Mobile Number *" error={fieldErrors.phone}>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                    className={inputCls(!!fieldErrors.phone)}
                  />
                </Field>
                <Field
                  label="Email * (order confirmation & payment link)"
                  error={fieldErrors.email}
                >
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls(!!fieldErrors.email)}
                  />
                </Field>
                <Field label="Landmark (optional)">
                  <input
                    value={form.landmark}
                    onChange={(e) => updateField("landmark", e.target.value)}
                    placeholder="e.g. Near XYZ hospital"
                    className={inputCls(false)}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Street Address *" error={fieldErrors.addressLine1}>
                  <input
                    value={form.addressLine1}
                    onChange={(e) => updateField("addressLine1", e.target.value)}
                    placeholder="Flat / building / street address"
                    className={inputCls(!!fieldErrors.addressLine1)}
                  />
                </Field>
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Address Line 2 (optional)</label>
                  <input
                    value={form.addressLine2}
                    onChange={(e) => updateField("addressLine2", e.target.value)}
                    placeholder="Area / locality"
                    className={inputCls(false)}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">City *</label>
                    <select
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className={`${inputCls(!!fieldErrors.city)} bg-white`}
                    >
                      <option value="">Select city</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Pincode</label>
                    <input
                      value={pincode}
                      readOnly
                      placeholder="—"
                      className={`${inputCls(false)} bg-stone-100`}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Field label="Delivery Notes (optional)">
                  <textarea
                    value={form.deliveryNotes}
                    onChange={(e) => updateField("deliveryNotes", e.target.value)}
                    placeholder="Gate instructions, preferred delivery timing, etc."
                    rows={2}
                    className={`${inputCls(false)} resize-none`}
                  />
                </Field>
              </div>
            </section>
          </div>

          {/* RIGHT: order summary */}
          <aside className="bg-white rounded-2xl border border-stone-200 p-6 lg:sticky lg:top-20">
            <h2 className="font-bold text-lg text-stone-900">3. Order Summary</h2>
            {cart.length === 0 ? (
              <p className="mt-4 text-stone-500">Your cart is empty.</p>
            ) : (
              <ul className="mt-4 space-y-4 max-h-80 overflow-auto">
                {cart.map((line) => {
                  const err = stockCheck[line.productId];
                  return (
                    <li key={line.productId} className="flex gap-3">
                      <div className="w-14 h-14 relative rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        <Image
                          src={line.imageUrl}
                          alt={line.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{line.name}</p>
                        <p className="text-xs text-stone-500">
                          ₹{line.price} × {line.quantity} dozen
                        </p>
                        {err ? (
                          <p className="text-xs text-red-600 font-medium">{err}</p>
                        ) : (
                          <p className="text-xs text-emerald-600 font-medium">In stock</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-sm">
                          ₹{line.price * line.quantity}
                        </span>
                        <div className="flex items-center border border-stone-300 rounded-lg">
                          <button
                            onClick={() => setQuantity(line.productId, line.quantity - 1)}
                            className="w-6 h-6 text-stone-600 hover:bg-stone-100"
                          >
                            −
                          </button>
                          <span className="px-1 text-sm">{line.quantity}</span>
                          <button
                            onClick={() => setQuantity(line.productId, line.quantity + 1)}
                            className="w-6 h-6 text-stone-600 hover:bg-stone-100"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(line.productId)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-5 pt-4 border-t border-stone-200 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{subtotal}</span>
            </div>

            <button
              onClick={submit}
              disabled={submitting || cart.length === 0}
              className="mt-5 w-full px-6 py-3.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Placing order..." : "Place Order"}
            </button>

            {submitError && (
              <p className="mt-3 text-sm text-red-600 font-medium bg-red-50 rounded-lg p-3">
                {submitError}
              </p>
            )}

            <p className="mt-3 text-xs text-stone-500 text-center">
              Payment (UPI / Cards) will be added here. Your order is confirmed once placed.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${
    hasError ? "border-red-500" : "border-stone-300"
  }`;
}
