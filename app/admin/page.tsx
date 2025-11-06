"use client";
import { useEffect, useState } from "react";

// Типове
type Product = {
  id: string; title: string; slug: string; desc: string;
  dimensions?: string; price: number; currency?: string;
  promoPercent?: number; promoUntil?: string; buyUrl?: string; image?: string;
  active?: boolean;
};
type HomeImage = {
  id: string; title?: string; src: string; order?: number; active?: boolean; isHero?: boolean; createdAt?: string;
};

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // ТАБ: "products" | "home"
  const [tab, setTab] = useState<"products" | "home">("products");

  // Данни – продукти
  const [items, setItems] = useState<Product[]>([]);
  // Данни – начални снимки
  const [home, setHome] = useState<HomeImage[]>([]);

  // Режим редакция за продукт
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState("лв");
  const [promoPercent, setPromoPercent] = useState<string>("");
  const [promoUntil, setPromoUntil] = useState("");
  const [buyUrl, setBuyUrl] = useState("");

  async function login() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass })
    });
    setBusy(false);
    if (r.ok) { setAuthed(true); await Promise.all([loadProducts(), loadHome()]); }
    else setMsg("Грешна парола.");
  }

  async function loadProducts() {
    const r = await fetch("/api/admin/products");
    if (r.ok) {
      const j = await r.json();
      setItems(j.items || []);
    }
  }
  async function loadHome() {
    const r = await fetch("/api/admin/home");
    if (r.ok) {
      const j = await r.json();
      setHome(j.items || []);
    }
  }

  // ---------------- ПРОДУКТИ ----------------
  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (editId) return;
    setBusy(true); setMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const r = await fetch("/api/admin/products", { method: "POST", body: fd });
      if (r.ok) {
        setMsg("Записано.");
        form.reset();
        const span = document.getElementById("admin-file");
        if (span) span.textContent = "Няма файл";
        await loadProducts();
      } else {
        const j = await r.json().catch(() => ({}));
        setMsg("Грешка: " + (j?.error || r.status));
      }
    } catch (err: any) {
      setMsg("Грешка: " + (err?.message || "unknown"));
    } finally { setBusy(false); }
  }
  function startEdit(p: Product) {
    setEditId(p.id);
    setTitle(p.title || ""); setSlug(p.slug || ""); setDesc(p.desc || "");
    setDimensions(p.dimensions || ""); setPrice(String(p.price ?? ""));
    setCurrency(p.currency || "лв"); setPromoPercent(p.promoPercent != null ? String(p.promoPercent) : "");
    setPromoUntil(p.promoUntil || ""); setBuyUrl(p.buyUrl || ""); setMsg("Режим: редакция");
  }
  async function saveEdit() {
    if (!editId) return;
    setBusy(true); setMsg("");
    const payload = {
      id: editId, title, slug, desc, dimensions,
      price: price ? Number(price) : undefined,
      currency, promoPercent: promoPercent ? Number(promoPercent) : undefined,
      promoUntil: promoUntil || undefined, buyUrl: buyUrl || undefined
    };
    const r = await fetch("/api/admin/products", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    setBusy(false);
    if (r.ok) { setMsg("Промените са записани."); setEditId(null); await loadProducts(); }
    else { const j = await r.json().catch(() => ({})); setMsg("Грешка при запис: " + (j?.error || r.status)); }
  }
  function cancelEdit() { setEditId(null); setMsg(""); }

  // ---------------- НАЧАЛНА СТР. СНИМКИ ----------------
  async function addHome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const r = await fetch("/api/admin/home", { method: "POST", body: fd });
      if (r.ok) {
        setMsg("Снимката е добавена.");
        form.reset();
        const span = document.getElementById("home-file"); if (span) span.textContent = "Няма файл";
        await loadHome();
      } else {
        const j = await r.json().catch(() => ({}));
        setMsg("Грешка: " + (j?.error || r.status));
      }
    } catch (err: any) {
      setMsg("Грешка: " + (err?.message || "unknown"));
    } finally { setBusy(false); }
  }

  useEffect(() => { Promise.all([loadProducts(), loadHome()]); }, []);

  // ---------------- UI ----------------
  if (!authed && items.length === 0 && home.length === 0) {
    return (
      <section className="container py-10 max-w-sm">
        <h2 className="text-2xl font-bold">Админ вход</h2>
        <div className="mt-4 grid gap-2">
          <input type="password" value={pass} onChange={e => setPass(e.target.value)}
            placeholder="Парола" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
          <button onClick={login} disabled={busy} className="h-10 rounded bg-white text-black">
            {busy ? "..." : "Вход"}
          </button>
          {msg && <div className="text-sm text-red-400">{msg}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <h2 className="text-2xl font-bold">Админ панел</h2>

      {/* ТАБОВЕ */}
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("products")}
          className={`h-10 px-4 rounded border ${tab === "products" ? "bg-white text-black" : "border-white/10"}`}>
          Продукти
        </button>
        <button onClick={() => setTab("home")}
          className={`h-10 px-4 rounded border ${tab === "home" ? "bg-white text-black" : "border-white/10"}`}>
          Снимки (начален екран)
        </button>
      </div>

      {msg && <div className="mt-3 text-sm text-muted">{msg}</div>}

      {/* --------- ТАБ: ПРОДУКТИ --------- */}
      {tab === "products" && (
        <>
          {/* Форма за добавяне */}
          <form onSubmit={addProduct} className="grid gap-3 mt-6 max-w-2xl" encType="multipart/form-data">
            <div className="grid sm:grid-cols-2 gap-3">
              <input name="title" placeholder="Заглавие" required className="h-10 rounded bg-black/30 border border-white/10 px-3" />
              <input name="slug" placeholder="slug (латиница, без интервали)" required className="h-10 rounded bg-black/30 border border-white/10 px-3" />
            </div>
            <textarea name="desc" placeholder="Описание" className="min-h-[80px] rounded bg-black/30 border border-white/10 px-3 py-2" />
            <input name="dimensions" placeholder="Размери (напр. 30×20×2 см)" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
            <div className="grid sm:grid-cols-3 gap-3">
              <input name="price" type="number" step="0.01" placeholder="Цена" required className="h-10 rounded bg-black/30 border border-white/10 px-3" />
              <input name="currency" placeholder="лв" className="h-10 rounded bg-black/30 border border-white/10 px-3" defaultValue="лв" />
              <input name="buyUrl" placeholder="Линк Купи (по желание)" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input name="promoPercent" type="number" step="1" placeholder="% Промо (по желание)" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
              <input name="promoUntil" type="date" placeholder="Край на промо" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <div className="px-3 py-1.5 rounded border border-white/10 bg-black/20 hover:bg-black/40 transition">Прикачи снимка</div>
              <input type="file" name="image" accept=".jpg,.jpeg,.png,.svg" className="hidden"
                onChange={(e) => { const s = document.getElementById("admin-file"); const f = e.target.files?.[0]; if (s) s.textContent = f ? f.name : "Няма файл"; }} />
              <span id="admin-file" className="text-muted">Няма файл</span>
            </label>
            <button type="submit" disabled={busy || !!editId} className="h-10 rounded bg-white text-black">
              {busy ? "Записвам..." : "Запиши продукт"}
            </button>
            {editId && <div className="text-xs text-muted">В режим „Редакция“: бутонът за добавяне е изключен</div>}
          </form>

          {/* Редактор за продукт */}
          {editId && (
            <div className="card p-4 mt-8 max-w-2xl">
              <h3 className="font-semibold mb-3">Редакция на продукт</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заглавие" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
                <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
              </div>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание" className="min-h-[80px] mt-3 rounded bg-black/30 border border-white/10 px-3 py-2" />
              <input value={dimensions} onChange={e => setDimensions(e.target.value)} placeholder="Размери" className="h-10 mt-3 rounded bg-black/30 border border-white/10 px-3" />
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" placeholder="Цена" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
                <input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="Валута" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
                <input value={buyUrl} onChange={e => setBuyUrl(e.target.value)} placeholder="Линк Купи" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <input value={promoPercent} onChange={e => setPromoPercent(e.target.value)} type="number" step="1" placeholder="% Промо" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
                <input value={promoUntil} onChange={e => setPromoUntil(e.target.value)} type="date" placeholder="Край на промо" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={saveEdit} disabled={busy} className="h-10 rounded bg-white text-black px-4">Запази промените</button>
                <button onClick={cancelEdit} className="h-10 rounded border border-white/10 px-4">Откажи</button>
              </div>
            </div>
          )}

          {/* Списък продукти */}
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(p => (
              <div key={p.id} className="card overflow-hidden">
                <div className="h-40 bg-black/20 flex items-center justify-center">
                  {p.image ? <img src={p.image} className="h-full w-full object-cover" /> : <span className="text-muted">Без снимка</span>}
                </div>
                <div className="p-4">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-muted text-sm">{p.dimensions}</div>
                  <div className="mt-2">{p.price} {p.currency || "лв"}</div>
                  {p.promoPercent && p.promoUntil && <div className="text-xs text-green-400">-{p.promoPercent}% до {p.promoUntil}</div>}
                  <div className="flex gap-2 mt-4">
                    <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={() => startEdit(p)}>Редактирай</button>
                    <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                      setBusy(true); setMsg("");
                      const r = await fetch("/api/admin/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, active: !(p.active ?? true) }) });
                      setBusy(false); if (r.ok) { setMsg("Обновено."); await loadProducts(); } else setMsg("Грешка при архивиране.");
                    }}>{(p.active ?? true) ? "Архивирай" : "Възстанови"}</button>
                    <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                      if (!confirm(`Да изтрия ли "${p.title}"?`)) return;
                      setBusy(true); setMsg("");
                      const r = await fetch(`/api/admin/products?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
                      setBusy(false); if (r.ok) { setMsg("Изтрито."); await loadProducts(); } else setMsg("Грешка при изтриване.");
                    }}>Изтрий</button>
                  </div>
                  <div className="text-xs text-muted mt-2">Статус: {(p.active ?? true) ? "активен" : "архив"}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --------- ТАБ: СНИМКИ (НАЧАЛЕН ЕКРАН) --------- */}
      {tab === "home" && (
        <>
          {/* Форма за качване */}
          <form onSubmit={addHome} className="grid gap-3 mt-6 max-w-xl" encType="multipart/form-data">
            <input name="title" placeholder="Заглавие/описание (по желание)" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
            <input name="order" type="number" step="1" placeholder="Позиция (по желание, по-малко = по-напред)" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <div className="px-3 py-1.5 rounded border border-white/10 bg-black/20 hover:bg-black/40 transition">Прикачи снимка</div>
              <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.avif,.svg" className="hidden"
                onChange={(e) => { const s = document.getElementById("home-file"); const f = e.target.files?.[0]; if (s) s.textContent = f ? f.name : "Няма файл"; }} />
              <span id="home-file" className="text-muted">Няма файл</span>
            </label>
            <button type="submit" disabled={busy} className="h-10 rounded bg-white text-black">
              {busy ? "Качвам..." : "Качи снимка"}
            </button>
          </form>

          {/* Списък/управление */}
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {home
              .slice()
              .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.createdAt || "").localeCompare(b.createdAt || ""))
              .map(h => (
                <div key={h.id} className="card overflow-hidden">
                  <div className="h-40 bg-black/20 flex items-center justify-center">
                    <img src={h.src} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="text-sm">{h.title || <span className="text-muted">(без заглавие)</span>}</div>
                    <div className="text-xs text-muted">order: {h.order ?? "-"}</div>

                    <div className="flex gap-2 flex-wrap">
                      {/* Задай като фон */}
                      <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                        setBusy(true); setMsg("");
                        const r = await fetch("/api/admin/home", {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: h.id, isHero: true })
                        });
                        setBusy(false);
                        if (r.ok) { setMsg("Зададено като фон."); await loadHome(); }
                        else setMsg("Грешка при задаване на фон.");
                      }}>
                        {(h.isHero ?? false) ? "✅ Фон" : "Задай като фон"}
                      </button>

                      {/* Позиция */}
                      <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                        const val = prompt("Нова позиция (число):", String(h.order ?? ""));
                        if (val === null) return;
                        setBusy(true); setMsg("");
                        const r = await fetch("/api/admin/home", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id, order: Number(val) }) });
                        setBusy(false); if (r.ok) { setMsg("Обновено."); await loadHome(); } else setMsg("Грешка при обновяване.");
                      }}>Позиция</button>

                      {/* Заглавие */}
                      <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                        const val = prompt("Ново заглавие (празно за изчистване):", h.title || "");
                        if (val === null) return;
                        setBusy(true); setMsg("");
                        const r = await fetch("/api/admin/home", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id, title: val }) });
                        setBusy(false); if (r.ok) { setMsg("Обновено."); await loadHome(); } else setMsg("Грешка при обновяване.");
                      }}>Заглавие</button>

                      {/* Архивирай / Възстанови */}
                      <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                        setBusy(true); setMsg("");
                        const r = await fetch("/api/admin/home", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id, active: !(h.active ?? true) }) });
                        setBusy(false); if (r.ok) { setMsg("Обновено."); await loadHome(); } else setMsg("Грешка при архивиране.");
                      }}>{(h.active ?? true) ? "Архивирай" : "Възстанови"}</button>

                      {/* Изтрий */}
                      <button className="px-3 h-9 rounded border border-white/10 text-sm" onClick={async () => {
                        if (!confirm("Да изтрия ли снимката?")) return;
                        setBusy(true); setMsg("");
                        const r = await fetch(`/api/admin/home?id=${encodeURIComponent(h.id)}`, { method: "DELETE" });
                        setBusy(false); if (r.ok) { setMsg("Изтрито."); await loadHome(); } else setMsg("Грешка при изтриване.");
                      }}>Изтрий</button>
                    </div>

                    <div className="text-xs text-muted">
                      Статус: {(h.active ?? true) ? "активна" : "архив"} {h.isHero ? " • фон" : ""}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
