import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmed",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Accept either the internal id or the human order number (MNG-2026-0001),
  // so emailed links like /order/MNG-2026-0001 resolve correctly.
  const order =
    (await prisma.order.findUnique({ where: { id }, include: { items: true, customer: true } })) ??
    (await prisma.order.findUnique({
      where: { orderNumber: id },
      include: { items: true, customer: true },
    }));

  if (!order) notFound();

  const statusMeta = order.paymentStatus === "PAID" ? "paid" : "pending payment";

  // The order only becomes final once the owner accepts it.
  const rejected = order.status === "REJECTED";
  const accepted = order.status === "ACCEPTED" || order.status === "PROCESSING" || order.status === "IN_PROGRESS" || order.status === "SHIPPED" || order.status === "DELIVERED";
  const awaitingDecision = order.status === "PENDING";

  const hero = rejected
    ? { icon: "🚫", ring: "bg-rose-100", title: "Order Not Accepted", body: <>Sorry, we could not fulfil this order.</> }
    : accepted
    ? { icon: "✅", ring: "bg-emerald-100", title: "Order Accepted!", body: <>Thank you, <strong>{order.customer.name}</strong>. Your farm-fresh mangoes are being prepared.</> }
    : { icon: "⏳", ring: "bg-amber-100", title: "Order Received", body: <>Thank you, <strong>{order.customer.name}</strong>. We are confirming your order and will email you shortly.</> };

  return (
    <main className="flex-1 bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-14">
        <div className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-full ${hero.ring} flex items-center justify-center text-3xl`}>
            {hero.icon}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-stone-900">{hero.title}</h1>
          <p className="mt-2 text-stone-600">{hero.body}</p>
          <p className="mt-1 inline-block bg-stone-900 text-white text-sm font-bold px-4 py-1.5 rounded-full">
            Order ID: {order.orderNumber}
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Status: {order.status} · Payment: {statusMeta}
          </p>
        </div>

        {awaitingDecision && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            <p className="font-bold">Waiting for confirmation</p>
            <p className="mt-1">
              The farm owner is reviewing this order. Stock is held for you in the
              meantime. You will receive an email as soon as it is accepted, including
              the payment link.
            </p>
          </div>
        )}

        {accepted && order.paymentLink && order.paymentStatus !== "PAID" && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="font-bold text-emerald-900">Complete your payment</p>
            <p className="mt-1 text-sm text-emerald-800">
              Pay ₹{order.totalAmount} to confirm your order.
            </p>
            <a
              href={order.paymentLink}
              className="mt-3 inline-block px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
            >
              Pay now
            </a>
          </div>
        )}

        {rejected && order.rejectionReason && (
          <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-900">
            <p className="font-bold">Reason</p>
            <p className="mt-1">{order.rejectionReason}</p>
          </div>
        )}

        <div className="mt-8 bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-lg text-stone-900">Order Summary</h2>
          <ul className="mt-4 divide-y divide-stone-100">
            {order.items.map((it) => (
              <li key={it.id} className="py-3 flex justify-between">
                <span>
                  {it.productName}
                  <span className="text-stone-500 text-sm">
                    {" "}
                    × {it.quantity} dozen
                  </span>
                </span>
                <span className="font-semibold">₹{it.price * it.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4 mt-2 border-t border-stone-200 flex justify-between font-extrabold text-lg">
            <span>Total</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-lg text-stone-900">Delivery Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-stone-500">Deliver to</dt>
              <dd className="font-medium">
                {order.addressLine1}
                {order.addressLine2 ? `, ${order.addressLine2}` : ""}
                {order.landmark ? ` (${order.landmark})` : ""}, {order.city} - {order.pincode}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Contact</dt>
              <dd className="font-medium">
                {order.customer.name} · {order.phone}
                {order.email ? ` · ${order.email}` : ""}
              </dd>
            </div>
            {order.deliveryNotes && (
              <div>
                <dt className="text-stone-500">Delivery notes</dt>
                <dd className="font-medium">{order.deliveryNotes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/products"
            className="inline-block px-7 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
