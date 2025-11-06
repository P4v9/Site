import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data", "products.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

type Product = {
  id: string;
  title: string;
  slug: string;
  desc: string;
  dimensions?: string;
  price: number;
  currency?: string;
  promoPercent?: number;
  promoUntil?: string;
  buyUrl?: string;
  image?: string;   // /uploads/...
  active?: boolean; // true=видим, false=архив
};

async function ensureAuth() {
  const store = await cookies();
  const c = store.get("ph_admin");
  if (!c || c.value !== "1") throw new Error("unauthorized");
}

function readAll(): Product[] {
  try {
    if (!fs.existsSync(DATA)) return [];
    return JSON.parse(fs.readFileSync(DATA, "utf8") || "[]");
  } catch { return []; }
}

function writeAll(arr: Product[]) {
  fs.writeFileSync(DATA, JSON.stringify(arr, null, 2), "utf8");
}

export async function GET() {
  try {
    await ensureAuth();
    return NextResponse.json({ ok: true, items: readAll() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureAuth();

    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const slug = String(form.get("slug") || "").trim();
    const desc = String(form.get("desc") || "");
    const dimensions = String(form.get("dimensions") || "");
    const price = Number(form.get("price") || 0);
    const currency = String(form.get("currency") || "лв");
    const promoPercentRaw = form.get("promoPercent");
    const promoUntilRaw = String(form.get("promoUntil") || "");
    const buyUrlRaw = String(form.get("buyUrl") || "");

    if (!title || !slug || !price) {
      return NextResponse.json({ ok:false, error:"Липсват задължителни полета." }, { status:400 });
    }

    const p: Product = {
      id: String(Date.now()),
      title, slug, desc, dimensions,
      price, currency,
      promoPercent: promoPercentRaw ? Number(promoPercentRaw) : undefined,
      promoUntil: promoUntilRaw || undefined,
      buyUrl: buyUrlRaw || undefined,
      image: undefined,
      active: true,
    };

    // качване на снимка (по желание)
    const file = form.get("image") as File | null;
    if (file && file.size > 0) {
      const okTypes = new Set([
        "image/jpeg","image/png","image/svg+xml","application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ]);
      if (file.type && !okTypes.has(file.type)) {
        return NextResponse.json({ ok:false, error:"Неподдържан тип файл." }, { status:400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const filename = `${slug}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
      p.image = `/uploads/${filename}`;
    }

    // UPSERT по slug
    const items = readAll();
    const idx = items.findIndex(x => x.slug === p.slug);
    if (idx >= 0) {
      const prev = items[idx];
      items[idx] = { ...prev, ...p, id: prev.id, active: prev.active ?? true };
    } else {
      items.push(p);
    }

    writeAll(items);
    return NextResponse.json({ ok:true, item: p });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/products POST error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}

// РЕДАКЦИЯ: PUT { id, ...fields }  (без снимка тук)
export async function PUT(req: Request) {
  try {
    await ensureAuth();
    const body = await req.json().catch(() => ({}));

    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ ok:false, error:"invalid_id" }, { status:400 });

    const items = readAll();
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

    // позволяваме редакция на тези полета
    const fields: (keyof Product)[] = [
      "title","slug","desc","dimensions","price","currency","promoPercent","promoUntil","buyUrl","active"
    ];

    const cur = items[idx];
    const next = { ...cur } as Product;

    for (const k of fields) {
      if (body[k] !== undefined && body[k] !== null) {
        (next as any)[k] = k === "price" ? Number(body[k]) : body[k];
      }
    }

    // ако slug се промени и има снимка, оставяме картинката както е
    items[idx] = next;
    writeAll(items);

    return NextResponse.json({ ok:true, item: next });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/products PUT error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}

// Архивирай/възстанови: PATCH { id, active: boolean }
export async function PATCH(req: Request) {
  try {
    await ensureAuth();
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    const active = body?.active;

    if (!id || typeof active !== "boolean") {
      return NextResponse.json({ ok:false, error:"invalid" }, { status:400 });
    }

    const items = readAll();
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

    items[idx].active = active;
    writeAll(items);
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/products PATCH error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}

// Изтрий: DELETE ?id=...
export async function DELETE(req: Request) {
  try {
    await ensureAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok:false, error:"invalid" }, { status:400 });

    const items = readAll();
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

    // (по желание) изтрий файла:
    // if (items[idx].image) {
    //   const p = path.join(process.cwd(), "public", items[idx].image.replace(/^\//,""));
    //   if (fs.existsSync(p)) fs.unlinkSync(p);
    // }

    items.splice(idx, 1);
    writeAll(items);
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/products DELETE error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}
