import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminClaims, toNumber } from '@/lib/auth'

export async function GET() {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ products })
}

export async function PATCH(request: Request) {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, stockInDozens, price, isActive, imageUrl } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (typeof imageUrl === 'string' && imageUrl.trim()) {
      if (!imageUrl.startsWith('/')) {
        return NextResponse.json({ error: 'imageUrl must be a local path.' }, { status: 400 })
      }
      data.imageUrl = imageUrl
    }
    const stock = toNumber(stockInDozens)
    if (stock !== null) {
      if (stock < 0) return NextResponse.json({ error: 'Stock cannot be negative.' }, { status: 400 })
      data.stockInDozens = Math.floor(stock)
    }
    const pr = toNumber(price)
    if (pr !== null) {
      if (pr <= 0) return NextResponse.json({ error: 'Price must be positive.' }, { status: 400 })
      data.price = pr
    }
    if (typeof isActive === 'boolean') data.isActive = isActive

    const product = await prisma.product.update({ where: { id }, data })
    return NextResponse.json({ product })
  } catch {
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const claims = await getAdminClaims()
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, variety, origin, description, unitType, price, stockInDozens, imageUrl, tag } =
      await request.json()

    if (!name || !variety || !price) {
      return NextResponse.json({ error: 'name, variety and price are required.' }, { status: 400 })
    }
    const product = await prisma.product.create({
      data: {
        name: String(name),
        variety: String(variety),
        origin: String(origin || 'Konkan'),
        description: String(description || ''),
        unitType: String(unitType || 'Dozen'),
        price: Number(price),
        stockInDozens: Math.max(0, Math.floor(Number(stockInDozens) || 0)),
        imageUrl: String(imageUrl || '/images/kesar-mango.jpg'),
        tag: tag ? String(tag) : null,
        isActive: true,
      },
    })
    return NextResponse.json({ product }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 })
  }
}
