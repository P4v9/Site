"use client";
import { useState } from "react";

export default function Page() {
  const [ok, setOk] = useState<null | boolean>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOk(null); setErr("");

    const form = e.currentTarget; // запазваме референция
    const fd = new FormData(form);

    // (опция) локална проверка за размер 5MB
    const f = fd.get("file") as File | null;
    if (f && f.size > 5 * 1024 * 1024) {
      setOk(false);
      setErr("Файлът е по-голям от 5MB.");
      return;
    }

    const res = await fetch("/api/send-inquiry", {
      method: "POST",
      body: fd, // multipart/form-data
    });

    if (res.ok) {
      setOk(true);
      form.reset();
    } else {
      setOk(false);
      const j = await res.json().catch(() => ({}));
      setErr(j?.error || "Грешка при изпращането.");
    }
  }

  return (
    <section className="container py-12 max-w-xl">
      <h2 className="text-3xl font-bold">Запитване</h2>
      <p className="text-muted mt-2">
        Може да прикачиш снимка/файл (до 5MB).
      </p>

      <form onSubmit={submit} encType="multipart/form-data" className="grid gap-3 mt-6">
        <input name="name" placeholder="Име" required className="h-10 rounded bg-black/30 border border-white/10 px-3" />
        <input name="email" type="email" placeholder="Имейл" required className="h-10 rounded bg-black/30 border border-white/10 px-3" />
        <input name="phone" placeholder="Телефон" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
        <select name="service" className="h-10 rounded bg-black/30 border border-white/10 px-3">
          <option value="3d">3D печат</option>
          <option value="laser">Лазерно гравиране</option>
        </select>
        <input name="dimensions" placeholder="Размери (10×10×3 см)" className="h-10 rounded bg-black/30 border border-white/10 px-3" />
        <textarea name="message" placeholder="Описание" required className="min-h-[120px] rounded bg-black/30 border border-white/10 px-3 py-2" />

       {/* Компактно поле с бутон и име на файл */}
<label className="flex items-center gap-3 cursor-pointer text-sm">
  <div className="px-3 py-1.5 rounded border border-white/10 bg-black/20 hover:bg-black/40 transition">
    Прикачи файл
  </div>
  <input
    type="file"
    name="file"
    accept=".png,.jpg,.jpeg,.svg,.pdf,.xlsx,.xls"
    className="hidden"
    onChange={(e) => {
      const span = document.getElementById("file-name");
      const file = e.target.files?.[0];
      if (span) span.textContent = file ? file.name : "Няма избран файл";
    }}
  />
  <span id="file-name" className="text-muted">Няма избран файл</span>
</label>


        <button className="btn" style={{ background: "#fff", color: "#000" }}>Изпрати</button>
        {ok === true && <div className="text-green-400 text-sm">Изпратено успешно.</div>}
        {ok === false && <div className="text-red-400 text-sm">Грешка: {err}</div>}
      </form>
    </section>
  );
}
