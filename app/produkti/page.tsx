import fs from "fs";
import path from "path";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readProducts() {
  const p = path.join(process.cwd(), "data", "products.json");
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}

export default function Produkti() {
  const all = readProducts() as any[];
  const products = all.filter((p) => p.active !== false);

  return (
    <section className="container py-10">
      <h2 className="text-3xl font-bold">Продукти</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mt-6">
        {products.map((p: any) => (
          <div key={p.id} className="card overflow-hidden">
            <div className="h-48 bg-black/20">
              {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="p-4 space-y-2">
              <div className="font-semibold text-lg">{p.title}</div>
              {p.dimensions && <div className="text-muted text-sm">Размери: {p.dimensions}</div>}
              <p className="text-muted text-sm">{p.desc}</p>
              <div className="text-xl font-bold">{p.price} {p.currency || "лв"}</div>

              {/* Бутон Купи */}
              <div className="pt-2">
                <AddToCartButton id={p.id} title={p.title} price={p.price} image={p.image} />
              </div>

              {p.promoPercent && p.promoUntil && (
                <div className="text-xs text-green-400">-{p.promoPercent}% до {p.promoUntil}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
