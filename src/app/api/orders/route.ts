import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOrderPlacedToOwner } from '@/lib/mailer'

type CartItem = {
  productId: string
  quantity: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      phone,
      email,
      addressLine1,
      addressLine2,
      landmark,
      city,
      pincode,
      deliveryNotes,
      items,
    } = body

    // ---- Validate basic fields ----
    if (typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json({ error: 'Please provide your full name (min 3 characters).' }, { status: 400 })
    }
    const phoneStr = String(phone || '').trim()
    if (!/^[6-9]\d{9}$/.test(phoneStr)) {
      return NextResponse.json({ error: 'Please provide a valid 10-digit mobile number.' }, { status: 400 })
    }
    // Email is required: the owner sends accept/reject + payment links there.
    const emailStr = String(email || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(emailStr)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address - we send your order confirmation and payment link there.' },
        { status: 400 }
      )
    }
    if (typeof addressLine1 !== 'string' || addressLine1.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a complete delivery address.' }, { status: 400 })
    }
    const pincodeStr = String(pincode || '').trim()
    const cityStr = String(city || '').trim()
    if (!/^\d{6}$/.test(pincodeStr)) {
      return NextResponse.json({ error: 'Please provide a valid 6-digit pincode.' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
    }

    // ---- Serviceable area check ----
    const area = await prisma.serviceableArea.findUnique({
      where: { pincode: pincodeStr },
    })
    if (!area) {
      return NextResponse.json(
        { error: `Sorry, we currently do not deliver to pincode ${pincodeStr}. We deliver in Mumbai, Thane & Navi Mumbai.` },
        { status: 400 }
      )
    }

    const year = new Date().getFullYear()

    // ---- Create/update order inside an interactive transaction ----
    const order = await prisma.$transaction(async (tx) => {
      // Upsert customer by phone
      const customer = await tx.customer.upsert({
        where: { phone: phoneStr },
        update: { name: name.trim(), email: emailStr },
        create: {
          name: name.trim(),
          phone: phoneStr,
          email: emailStr,
        },
      })

      // ---- Strict stock validation: collect product prices + check oversell ----
      let totalAmount = 0
      const orderItemsData = []

      const productIds = items.map((i) => i.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      })
      const productMap = new Map(products.map((p) => [p.id, p]))

      for (const item of items) {
        const product = productMap.get(item.productId)
        const qty = Math.floor(Number(item.quantity))
        if (!product) {
          throw new Error(`Product not available. Please refresh your cart.`)
        }
        if (isNaN(qty) || qty < 1 || qty > 50) {
          throw new Error(`Invalid quantity for ${product.name}.`)
        }
        // Strict oversell prevention
        if (qty > product.stockInDozens) {
          throw new Error(
            `We only have ${product.stockInDozens} dozen of ${product.name} left. Please reduce the quantity.`
          )
        }
        // Atomic stock decrement
        const updated = await tx.product.updateMany({
          where: { id: product.id, stockInDozens: { gte: qty } },
          data: { stockInDozens: { decrement: qty } },
        })
        if (updated.count === 0) {
          throw new Error(`Oops! ${product.name} just went out of stock. Please reduce the quantity.`)
        }
        const lineTotal = qty * product.price
        totalAmount += lineTotal
        orderItemsData.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitType: product.unitType,
          price: product.price,
        })
      }

      // ---- Generate human-readable order number ----
      const yearCount = await tx.order.count({ where: { orderYear: year } })
      const orderNumber = `MNG-${year}-${String(yearCount + 1).padStart(4, '0')}`

      return tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          phone: phoneStr,
          email: emailStr,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2 ? addressLine2.trim() : null,
          landmark: landmark ? landmark.trim() : null,
          city: cityStr,
          pincode: pincodeStr,
          deliveryNotes: deliveryNotes ? deliveryNotes.trim() : null,
          totalAmount: Math.round(totalAmount * 100) / 100,
          orderYear: year,
          paymentStatus: 'UNPAID',
          status: 'PENDING',
          items: { create: orderItemsData },
        },
        include: { items: true },
      })
    })

    // Tell the owner a new order arrived (awaited, but failures never block the order).
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
      })
      await sendOrderPlacedToOwner({
        orderNumber: order.orderNumber,
        name: customer?.name ?? name.trim(),
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
      })
    } catch (mailError) {
      console.error('[orders] owner notification failed:', mailError)
    }

    return NextResponse.json({ ok: true, order }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong while placing your order.'
    const status = /(stock|available|refresh|out of stock|quantity)/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
