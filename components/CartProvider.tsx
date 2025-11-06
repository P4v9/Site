"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { id: string; title: string; price: number; qty: number; image?: string };

type CartCtx = {
  items: CartItem[];
  count: number;
  add: (it: Omit<CartItem, "qty">, qty?: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("CartProvider missing");
  return v;
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ph_cart");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ph_cart", JSON.stringify(items));
    } catch {}
  }, [items]);

  const add: CartCtx["add"] = (it, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === it.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + qty };
        return copy;
      }
      return [...prev, { ...it, qty }];
    });
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

  const value = useMemo(() => ({ items, count, add, clear }), [items, count]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
