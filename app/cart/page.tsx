"use client";
import { useCart } from "@/components/CartProvider";

export default function CartPage() {
  const { items, count, clear } = useCart();
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);

  return (
    <section className="container py-10 max-w-2xl">
      <h2 className="text-3xl font-bold">Кошница</h2>
      {count === 0 ? (
        <p className="text-muted mt-3">Кошницата е празна.</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            {items.map((it) => (
              <div key={it.id} className="card p-3 flex items-center gap-3">
                {it.image ? <img src={it.image} className="w-16 h-16 object-cover rounded" /> : null}
                <div className="flex-1">
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-sm text-muted">x{it.qty} • {it.price.toFixed(2)} лв</div>
                </div>
                <div className="text-right font-bold">{(it.price * it.qty).toFixed(2)} лв</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="text-lg">Общо: <b>{total.toFixed(2)} лв</b></div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={clear}>Изчисти</button>
              <a href="/zapitvane" className="btn bg-white text-black">Поръчай</a>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
