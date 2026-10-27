import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const SECRET = process.env.JWT_SECRET || 'patil-farm-super-secret-change-in-production'

export type AdminClaims = {
  id: string
  email: string
  name: string
  role: 'ADMIN'
}

const COOKIE_NAME = 'patilfarm_admin'

export async function signAdminToken(payload: Omit<AdminClaims, 'role'>) {
  return jwt.sign({ ...payload, role: 'ADMIN' }, SECRET, { expiresIn: '12h' })
}

export async function setAdminCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
}

export async function clearAdminCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getAdminClaims(): Promise<AdminClaims | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, SECRET) as AdminClaims
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch {
    return null
  }
}

export function toNumber(n: unknown): number | null {
  if (typeof n === 'number' && isFinite(n)) return n
  if (typeof n === 'string' && n.trim() !== '' && isFinite(Number(n))) return Number(n)
  return null
}
