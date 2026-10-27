import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminClaims } from '@/lib/auth'
import {
  sendOrderAcceptedToCustomer,
  sendOrderRejectedToCustomer,
} from '@/lib/mailer'

/**
 * Owner Accept / Reject decision on a customer order.
 *
 * Stock model (prevents over-commitment):
 *   - `stockInDozens` holds the stock that is AVAILABLE TO SELL.
 *   - When a customer orders, stock is held (decremented) straight away, so two
 *     customers can never both claim the same last mango.
 *   - ACCEPT  -> stock stays committed. The order is real; stock is sold.
 *   - REJECT  -> stock is RETURNED to available, so the mangoes can be re-sold.
 *   `stockSettled` guards against double-settling if the owner changes a decision.
 */

export async function POST(request: Request) {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const {
      orderId,
      decision,
      paymentLink,
      rejectionReason,
      note,
    } = await request.json()

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required.' }, { status: 400 })
    }

    const action = String(decision || '').toUpperCase()
    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return NextResponse.json(
        { error: 'decision must be either ACCEPT or REJECT.' },
        { status: 400 }
      )
    }

    const link = paymentLink ? String(paymentLink).trim() : ''
    if (link) {
      // Accept only http(s) links so we never emit a javascript: URL into an email.
      if (!/^https?:\/\/\S+$/i.test(link)) {
        return NextResponse.json(
          { error: 'Payment link must be a valid http(s) URL.' },
          { status: 400 }
        )
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })

      if (!current) throw new Error('Order not found.')
      if (current.status === 'REJECTED') {
        throw new Error('This order was already rejected.')
      }
      if (current.status === 'ACCEPTED') {
        throw new Error('This order was already accepted.')
      }
      // Never let a late decision undo an order that is already on its way.
      if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(current.status)) {
        throw new Error(
          `Cannot change a ${current.status.toLowerCase()} order.`
        )
      }

      if (action === 'REJECT' && !current.stockSettled) {
        // Give the held stock back so it can be sold again.
        for (const item of current.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockInDozens: { increment: item.quantity } },
          })
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
          stockSettled: true,
          decidedAt: new Date(),
          ...(action === 'ACCEPT'
            ? { paymentLink: link || null }
            : {
                rejectionReason: rejectionReason
                  ? String(rejectionReason).trim()
                  : 'Stock unavailable',
                paymentLink: null,
              }),
        },
        include: { items: true },
      })
    })

    // ---- Notify the customer (never fails the request) ----
    let email: { sent: boolean; reason?: string }
    if (order.email) {
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
      })
      const full = {
        orderNumber: order.orderNumber,
        name: customer?.name ?? 'Customer',
        email: order.email,
        phone: order.phone,
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        landmark: order.landmark,
        city: order.city,
        pincode: order.pincode,
        deliveryNotes: order.deliveryNotes,
        totalAmount: order.totalAmount,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitType: i.unitType,
          price: i.price,
        })),
      }

      email =
        action === 'ACCEPT'
          ? await sendOrderAcceptedToCustomer(
              full,
              order.paymentLink,
              note ? String(note).trim() : null
            )
          : await sendOrderRejectedToCustomer(full, order.rejectionReason)
    } else {
      email = {
        sent: false,
        reason: 'Customer has no email address on this order',
      }
    }

    return NextResponse.json({ ok: true, order, email })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update the order.'
    const status = /not found|already|cannot change/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
