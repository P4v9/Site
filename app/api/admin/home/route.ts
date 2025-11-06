import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const DATA = path.join(process.cwd(), "data", "home.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "home");

type HomeImage = {
  id: string;
  title?: string;
  src: string;      // /home/....
  order?: number;
  active?: boolean;
  isHero?: boolean; // 👈 флаг за фон
  createdAt?: string;
};

async function ensureAuth() {
  const store = await cookies();
  const c = store.get("ph_admin");
  if (!c || c.value !== "1") throw new Error("unauthorized");
}

function readAll(): HomeImage[] {
  try {
    if (!fs.existsSync(DATA)) return [];
    return JSON.parse(fs.readFileSync(DATA, "utf8") || "[]");
  } catch { return []; }
}
function writeAll(arr: HomeImage[]) {
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

// POST (multipart)
export async function POST(req: Request) {
  try {
    await ensureAuth();
    const form = await req.formData();
    const file = form.get("image") as File | null;
    const title = String(form.get("title") || "").trim();
    const orderRaw = form.get("order");
    const order = orderRaw ? Number(orderRaw) : undefined;

    if (!file || file.size === 0) {
      return NextResponse.json({ ok:false, error:"missing_file" }, { status:400 });
    }

    const okTypes = new Set(["image/jpeg","image/png","image/webp","image/avif","image/svg+xml"]);
    if (file.type && !okTypes.has(file.type)) {
      return NextResponse.json({ ok:false, error:"bad_type" }, { status:400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const id = String(Date.now());
    const filename = `home-${id}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);

    const item: HomeImage = {
      id,
      title: title || undefined,
      src: `/home/${filename}`,
      order,
      active: true,
      isHero: false,
      createdAt: new Date().toISOString(),
    };

    const items = readAll();
    items.push(item);
    writeAll(items);

    return NextResponse.json({ ok:true, item });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/home POST error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}

// PATCH JSON: { id, active?, title?, order?, isHero? }
export async function PATCH(req: Request) {
  try {
    await ensureAuth();
    const body = await req.json().catch(()=> ({}));
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ ok:false, error:"invalid_id" }, { status:400 });

    const items = readAll();
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

    // ако isHero: true → премахни isHero от всички други
    if (body.isHero === true) {
      for (const it of items) it.isHero = false;
    }

    const cur = items[idx];
    const next = { ...cur } as HomeImage;
    if (body.title !== undefined) next.title = String(body.title);
    if (body.active !== undefined) next.active = !!body.active;
    if (body.order !== undefined) next.order = Number(body.order);
    if (body.isHero !== undefined) next.isHero = !!body.isHero;

    items[idx] = next;
    writeAll(items);

    return NextResponse.json({ ok:true, item: next });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/home PATCH error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}

// DELETE ?id=...
export async function DELETE(req: Request) {
  try {
    await ensureAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok:false, error:"invalid_id" }, { status:400 });

    const items = readAll();
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

    const rel = items[idx].src?.replace(/^\//,"") || "";
    const p = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }

    items.splice(idx, 1);
    writeAll(items);

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    if (String(e?.message).includes("unauthorized")) {
      return NextResponse.json({ ok:false }, { status: 401 });
    }
    console.error("admin/home DELETE error:", e);
    return NextResponse.json({ ok:false, error:"internal" }, { status:500 });
  }
}
