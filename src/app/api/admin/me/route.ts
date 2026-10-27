import { NextResponse } from 'next/server'
import { getAdminClaims } from '@/lib/auth'

export async function GET() {
  const claims = await getAdminClaims()
  if (!claims) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({ authenticated: true, user: claims })
}
