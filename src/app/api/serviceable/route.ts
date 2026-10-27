import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const areas = await prisma.serviceableArea.findMany({
    orderBy: { city: 'asc' },
  })
  const cities = [...new Set(areas.map((a) => a.city))]
  return NextResponse.json({ areas, cities })
}
