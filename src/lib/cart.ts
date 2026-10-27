export type CartLine = {
  productId: string
  name: string
  variety: string
  unitType: string
  price: number
  imageUrl: string
  quantity: number // in dozens
  stockInDozens: number
  stockHeld: number
}

export const CART_KEY = 'kkf_cart'

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeCart(cart: CartLine[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function clearCart() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CART_KEY)
}
