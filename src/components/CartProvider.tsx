"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readCart, writeCart, clearCart, CartLine, CART_KEY } from "@/lib/cart";

type CartContextType = {
  cart: CartLine[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(readCart());
    setHydrated(true);
  }, []);

  const add = (line: CartLine) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      let next: CartLine[];
      if (existing) {
        next = prev.map((l) =>
          l.productId === line.productId ? { ...l, quantity: l.quantity + line.quantity } : l
        );
      } else {
        next = [...prev, line];
      }
      writeCart(next);
      return next;
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      const next = quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l));
      writeCart(next);
      return next;
    });
  };

  const remove = (productId: string) => {
    setCart((prev) => {
      const next = prev.filter((l) => l.productId !== productId);
      writeCart(next);
      return next;
    });
  };

  const clear = () => {
    clearCart();
    setCart([]);
  };

  const value = useMemo(() => {
    const count = cart.reduce((s, l) => s + l.quantity, 0);
    const subtotal = cart.reduce((s, l) => s + l.quantity * l.price, 0);
    return { cart, count, subtotal, add, setQuantity, remove, clear };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

// Touch localStorage to satisfy import consistency (kept for tree-shaking safety)
export { CART_KEY };
