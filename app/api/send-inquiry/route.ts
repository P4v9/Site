import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const MAX_MB = 5;
const MAX_SIZE = MAX_MB * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
]);

export async function POST(req: Request) {
  try {
    // приемаме multipart/form-data
    const form = await req.formData();
    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const phone = String(form.get("phone") || "");
    const service = String(form.get("service") || "");
    const dimensions = String(form.get("dimensions") || "");
    const message = String(form.get("message") || "");

    if (!name || !email || !service || !message) {
      return NextResponse.json({ ok: false, error: "Липсват задължителни полета." }, { status: 400 });
    }

    let attachments: { filename: string; content: string }[] | undefined;

    const file = form.get("file") as File | null;
if (file && file.size > 0) {
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: `Файлът е над ${MAX_MB}MB.` }, { status: 400 });
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, error: "Неподдържан тип файл." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  attachments = [{
    filename: file.name || "attachment",
    content: base64,
    contentType: file.type || undefined,   // <= добавено
  }];
}


    const html = `
      <h2>Ново запитване</h2>
      <p><b>Име:</b> ${name}</p>
      <p><b>Имейл:</b> ${email}</p>
      <p><b>Телефон:</b> ${phone || "—"}</p>
      <p><b>Услуга:</b> ${service}</p>
      <p><b>Размери:</b> ${dimensions || "—"}</p>
      <p><b>Съобщение:</b><br/>${message.replace(/\n/g,"<br/>")}</p>
      <p><b>Прикачен файл:</b> ${attachments ? "Да" : "Не"}</p>
    `;

    const text = `Ново запитване
Име: ${name}
Имейл: ${email}
Телефон: ${phone || "—"}
Услуга: ${service}
Размери: ${dimensions || "—"}
Съобщение:
${message}
Прикачен файл: ${attachments ? "Да" : "Не"}
`;

    await sendEmail({
      to: process.env.RECEIVER_EMAIL!,
      from: process.env.SENDER_EMAIL || "onboarding@resend.dev",
      subject: `PH 3D-Laser — запитване (${service})`,
      html,
      text,
      replyTo: email,
      attachments, // <-- важно
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("send-inquiry error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
