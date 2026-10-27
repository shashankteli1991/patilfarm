import { CartLine } from "@/lib/cart";

export function cartLineToItems(cart: CartLine[]) {
  return cart.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));
}
