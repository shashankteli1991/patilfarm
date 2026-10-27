import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAdminToken, setAdminCookie, clearAdminCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(String(password), user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const token = await signAdminToken({ id: user.id, email: user.email, name: user.name })
    await setAdminCookie(token)

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (e) {
    console.error('[admin/login] failed:', e)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }}

export async function DELETE() {
  await clearAdminCookie()
  return NextResponse.json({ ok: true })
}
