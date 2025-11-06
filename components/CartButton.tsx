"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { useEffect, useState } from "react";

export default function CartButton() {
  const { count } = useCart();
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (count <= 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 350);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <Link
      href="/cart"
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 hover:border-white/30 transition ${bump ? "cart-bump" : ""}`}
      aria-label="Кошница"
      title="Кошница"
    >
      {/* Икона кошница (SVG) */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           className="w-6 h-6" fill="currentColor">
        <path d="M7 4h10l1 3h3v2h-1l-1.6 8.1A3 3 0 0 1 15.5 20h-7a3 3 0 0 1-2.9-2.4L4 9H3V7h3l1-3Zm1.2 3h7.7l-.4-1H8.6l-.4 1ZM6.1 9l1.4 7.2a1.5 1.5 0 0 0 1.5 1.2h7a1.5 1.5 0 0 0 1.5-1.2L19 9H6.1Z"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
