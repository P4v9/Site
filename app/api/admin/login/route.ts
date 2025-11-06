import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const input = String(body?.password ?? "").trim();
  const expected = String(process.env.ADMIN_PASSWORD ?? "").trim();

  if (!expected) {
    return NextResponse.json({ ok:false, error:"ADMIN_PASSWORD not set" }, { status:500 });
  }
  if (input !== expected) {
    return NextResponse.json({ ok:false }, { status:401 });
  }

  const res = NextResponse.json({ ok:true });
  res.cookies.set("ph_admin", "1", {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8
  });
  return res;
}
