"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";

export default function AddToCartButton(props: { id: string; title: string; price: number; image?: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    add({ id: props.id, title: props.title, price: props.price, image: props.image }, 1);
    setAdded(true);
    // кратка визуална обратна връзка
    await new Promise(r => setTimeout(r, 900));
    setAdded(false);
    setBusy(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`h-10 px-4 rounded bg-white text-black font-medium transition 
                  ${added ? "bg-green-400" : "hover:bg-white/90"}`}
      aria-label="Добави в кошницата"
    >
      {added ? "Добавено ✓" : "Купи"}
    </button>
  );
}
