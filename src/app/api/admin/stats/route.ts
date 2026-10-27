import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminClaims } from '@/lib/auth'

export async function GET(request: Request) {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : new Date().getFullYear()

  const orders = await prisma.order.findMany({
    where: { orderYear: year },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  const totalOrders = orders.length
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((s, o) => s + o.totalAmount, 0)

  const totalOrderValue = orders.reduce((s, o) => s + o.totalAmount, 0)

  const statusBreakdown: Record<string, number> = {}
  const paymentBreakdown: Record<string, { count: number; amount: number }> = {}
  const monthly: Record<number, { orders: number; revenue: number; orderValue: number }> = {}

  for (const o of orders) {
    const month = o.createdAt.getMonth() + 1
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1
    if (!paymentBreakdown[o.paymentStatus]) {
      paymentBreakdown[o.paymentStatus] = { count: 0, amount: 0 }
    }
    paymentBreakdown[o.paymentStatus].count += 1
    paymentBreakdown[o.paymentStatus].amount += o.totalAmount

    if (!monthly[month]) monthly[month] = { orders: 0, revenue: 0, orderValue: 0 }
    monthly[month].orders += 1
    monthly[month].orderValue += o.totalAmount
    if (o.paymentStatus === 'PAID') monthly[month].revenue += o.totalAmount
  }

  // Available years
  const yearRows = await prisma.order.groupBy({
    by: ['orderYear'],
    _count: { _all: true },
    orderBy: { orderYear: 'desc' },
  })
  const availableYears = yearRows.map((r) => r.orderYear)

  return NextResponse.json({
    year,
    availableYears,
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrderValue: Math.round(totalOrderValue * 100) / 100,
    paidOrders: paymentBreakdown['PAID']?.count || 0,
    unpaidOrders: paymentBreakdown['UNPAID']?.count || 0,
    statusBreakdown,
    paymentBreakdown,
    monthly,
  })
}
