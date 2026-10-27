import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminClaims } from '@/lib/auth'

const ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'PROCESSING', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'FAILED', 'REFUNDED']

export async function GET(request: Request) {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined
  const statusParam = searchParams.get('status')
  const paymentParam = searchParams.get('payment')

  const where: Record<string, unknown> = {}
  if (year) where.orderYear = year
  if (statusParam && ORDER_STATUSES.includes(statusParam)) where.status = statusParam
  if (paymentParam && PAYMENT_STATUSES.includes(paymentParam)) where.paymentStatus = paymentParam

  const orders = await prisma.order.findMany({
    where,
    include: { items: true, customer: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      name: o.customer?.name ?? 'Customer',
      email: o.customer?.email ?? o.email,
      customer: undefined,
    })),
  })
}

export async function PATCH(request: Request) {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { orderId, status, paymentStatus } = await request.json()
    if (!orderId) return NextResponse.json({ error: 'orderId is required.' }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (status) {
      if (!ORDER_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 })
      }
      data.status = status
    }
    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 })
      }
      data.paymentStatus = paymentStatus
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data,
      include: { items: true },
    })
    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 })
  }
}
