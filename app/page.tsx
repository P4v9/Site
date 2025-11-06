import fs from "fs";
import path from "path";
import LogoMark from "@/components/LogoMark";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeImage = {
  id: string;
  title?: string;
  src: string;
  order?: number;
  active?: boolean;
  isHero?: boolean;
  createdAt?: string;
};

function readHome(): HomeImage[] {
  const p = path.join(process.cwd(), "data", "home.json");
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}

export default function Home() {
  const all = readHome().filter((x) => x.active !== false);
  const hero = all.find((x) => x.isHero) || all[0];
  const gallery = all.filter((x) => x && hero && x.id !== hero.id);

  return (
    <main>
      {/* ХЕРО: черен фон + голямото лого в „кутия“ (без снимка за фон) */}
      <section className="relative h-72 md:h-96 border-b border-white/10 bg-black">
        <div className="absolute inset-0 flex items-center justify-center">
          <LogoMark size="lg" />
        </div>
      </section>

      {/* Галерия под херото – използва снимките от админа */}
      <section className="container py-10">
        <h2 className="text-2xl font-bold">Наши реализации</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {gallery.map((it) => (
            <div key={it.id} className="card overflow-hidden">
              <div className="relative aspect-[4/3]">
                <img src={it.src} alt={it.title || "Снимка"} className="w-full h-full object-cover" />
              </div>
              {it.title && <div className="p-2 text-sm text-muted">{it.title}</div>}
            </div>
          ))}
          {gallery.length === 0 && (
            <div className="text-muted">Добави снимки през Админ → Снимки (начален екран).</div>
          )}
        </div>
      </section>
    </main>
  );
}
