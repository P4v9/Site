import React, { useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Calculator, ShoppingCart, Mail, Phone, CheckCircle2, Ruler } from "lucide-react";

/**
 * Еднофайлов React сайт — 3D печат & лазерно гравиране
 *
 * ✔ Клиентът въвежда САМО примерни размери и избира принтер (FDM/Resin)
 * ✔ Resin е по-скъп (часова ставка + post-processing + по-висок минимум)
 * ✔ Лазер — цена = setup + cm² × коеф. сложност
 * ✔ Mailto обобщение + изтегляне на оферта
 * ✔ Самотестове за формули/ограничения
 */

// --- БИЗНЕС НАСТРОЙКИ ---
const BUSINESS_EMAIL = "pharshev@gmail.com";
// URL към Google Apps Script Web App (ще запише в Google Sheet и ще качи файлове в Drive)
const RAW_FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || ""; // взима от .env.local
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbxx-jLpcWWu9vmxyNzrGBzzJjPUamLUEsOtZ0x4aLHIA7cMf-3ZHwCAex7ojL6sQbSiXg/exec";
// --- ПРИНТЕРИ ---
const PRINTERS = {
  FDM_Ender3Pro: {
    name: "Ender‑3 Pro (FDM)",
    volume: { x: 220, y: 220, z: 250 },
    machineRatePerHour: 8.0, // BGN/час
    gramsPerHour: 12,        // типичен дебит
    defaultMaterial: "PLA",
    defaults: { infill: 20 }, // вътрешно, клиентът не го вижда
    minPrice: 10,
  },
  Resin_PhotonMono: {
    name: "Anycubic Photon Mono (Resin)",
    volume: { x: 130, y: 80, z: 165 },
    machineRatePerHour: 14.0,
    defaultMaterial: "RESIN_ABS",
    postFeeBase: 6.0, // измиване/UV
    minPrice: 18,
  },
} as const;

// --- МАТЕРИАЛИ ---
const MATERIALS = {
  PLA: { name: "PLA (стандарт)", density: 1.24, pricePerGram: 0.03 },
  PETG: { name: "PETG (устойчив)", density: 1.27, pricePerGram: 0.035 },
  ABS: { name: "ABS (здрав)", density: 1.05, pricePerGram: 0.04 },
  RESIN_ABS: { name: "Смола ABS-like (детайл)", density: 1.10, pricePerGram: 0.049 },
} as const;

// --- ЛАЗЕРНИ ПОВЪРХНОСТИ ---
const ENGRAVE_SURFACES = {
  wood: { name: "Дърво", pricePerCm2: 0.10, setup: 6 },
  steel: { name: "Неръждаема стомана", pricePerCm2: 0.25, setup: 12 },
  stone: { name: "Камък/гранит", pricePerCm2: 0.20, setup: 10 },
  glass: { name: "Стъкло", pricePerCm2: 0.22, setup: 10 },
  leather: { name: "Кожа", pricePerCm2: 0.16, setup: 8 },
  acrylic: { name: "Плексиглас", pricePerCm2: 0.14, setup: 7 },
} as const;

type PrinterKey = keyof typeof PRINTERS;
type SurfaceKey = keyof typeof ENGRAVE_SURFACES;

const DISCOUNTS = [
  { threshold: 200, factor: 0.95 },
  { threshold: 400, factor: 0.92 },
  { threshold: 800, factor: 0.88 },
] as const;

function applyDiscount(total: number){
  let t = total;
  for (const d of DISCOUNTS) if (t >= d.threshold) t *= d.factor; // прогресивно
  return t;
}

function downloadText(filename: string, text: string){
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function money(n: number){
  return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "BGN" }).format(n);
}

// --- ЛОГО SVG ---
function PHLogo({ className = "" }){
  return (
    <svg className={className} viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" aria-label="P.H logo">
      <defs>
        <linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="#8b8b8b"/><stop offset="1" stopColor="#ffffff"/></linearGradient>
      </defs>
      <rect x="2" y="2" width="196" height="56" rx="14" fill="none" stroke="url(#g)" strokeWidth="3"/>
      <g fill="#e5e7eb" fontFamily="'SF Pro Display', system-ui, -apple-system, Segoe UI, Roboto" fontWeight="700">
        <text x="20" y="40" fontSize="28">P</text>
        <rect x="48" y="18" width="4" height="24" rx="2" fill="#e5e7eb"/>
        <text x="64" y="40" fontSize="28">H</text>
        <text x="118" y="40" fontSize="12" fill="#9ca3af">PRINT · LASER</text>
      </g>
    </svg>
  );
}

// --- ВСПОМОГАТЕЛНИ ---
const clamp = (n: number, min: number, max: number)=> Math.max(min, Math.min(max, n));

function estimateFDMGrams(volumeCm3: number, density: number, infillPct: number){
  // Грубо: реалният материал е част от bbox обема — стени + инфил
  const inf = clamp(infillPct, 0, 100) / 100; // 0..1
  const shellFactor = 0.25; // ~25% стени/дъна при дребни детайли
  const effective = shellFactor + inf * 0.6; // 25%..85%
  return volumeCm3 * effective * density; // грамове
}

function estimateFDMHours(grams: number, gramsPerHour: number){
  return gramsPerHour > 0 ? grams / gramsPerHour : 0;
}

function estimateResinGrams(volumeCm3: number, density: number){
  return volumeCm3 * density * 0.9; // 90% ефективност (кухини/поддръжки)
}

function estimateResinHours(heightMm: number){
  const mmPerHour = 30; // зависи от експозиция/слой; 30mm/h е консервативно
  return heightMm / mmPerHour;
}

// --- САМОТЕСТОВЕ ---
function runSelfTests(){
  const tests: {name:string; pass:boolean; details?:any}[] = [];
  // (1) Размери в/извън обем
  const within = (dims:any, vol:any)=> dims.x<=vol.x && dims.y<=vol.y && dims.z<=vol.z;
  tests.push({ name: "Dims within Ender-3", pass: within({x:100,y:100,z:50}, PRINTERS.FDM_Ender3Pro.volume) });
  tests.push({ name: "Dims exceed Photon", pass: !within({x:200,y:100,z:180}, PRINTERS.Resin_PhotonMono.volume) });
  // (2) FDM грамове растат с инфил
  const g20 = estimateFDMGrams(100, MATERIALS.PLA.density, 20);
  const g60 = estimateFDMGrams(100, MATERIALS.PLA.density, 60);
  tests.push({ name: "FDM grams increases with infill", pass: g60>g20, details: { g20, g60 } });
  // (3) Resin време расте с височина
  tests.push({ name: "Resin hours scales", pass: estimateResinHours(100)>estimateResinHours(50) });
  // (4) Минимална цена се прилага
  const perItemFDM = (()=>{
    const mat = MATERIALS[PRINTERS.FDM_Ender3Pro.defaultMaterial as keyof typeof MATERIALS];
    const grams = estimateFDMGrams(1, mat.density, PRINTERS.FDM_Ender3Pro.defaults.infill);
    const hours = estimateFDMHours(grams, PRINTERS.FDM_Ender3Pro.gramsPerHour);
    const raw = grams*mat.pricePerGram + hours*PRINTERS.FDM_Ender3Pro.machineRatePerHour + 3; // + труд
    const withMarkup = raw * 1.3; // 30%
    return Math.max(withMarkup, PRINTERS.FDM_Ender3Pro.minPrice);
  })();
  tests.push({ name: "Min price enforced FDM", pass: perItemFDM >= PRINTERS.FDM_Ender3Pro.minPrice, details: { perItemFDM } });
  // (5) Resin по-скъп от FDM за еднакви размери (в общия случай)
  const compareSameDims = (x:number,y:number,z:number)=>{
    const vol = (x*y*z)/1000;
    const fdmMat = MATERIALS[PRINTERS.FDM_Ender3Pro.defaultMaterial as keyof typeof MATERIALS];
    const fdmG = estimateFDMGrams(vol, fdmMat.density, PRINTERS.FDM_Ender3Pro.defaults.infill);
    const fdmH = estimateFDMHours(fdmG, PRINTERS.FDM_Ender3Pro.gramsPerHour);
    const fdmCost = Math.max((fdmG*fdmMat.pricePerGram + fdmH*PRINTERS.FDM_Ender3Pro.machineRatePerHour + 3)*1.3, PRINTERS.FDM_Ender3Pro.minPrice);

    const rMat = MATERIALS[PRINTERS.Resin_PhotonMono.defaultMaterial as keyof typeof MATERIALS];
    const rG = estimateResinGrams(vol, rMat.density);
    const rH = estimateResinHours(z);
    const rCost = Math.max((rG*rMat.pricePerGram + rH*PRINTERS.Resin_PhotonMono.machineRatePerHour + 6 + 3)*1.3, PRINTERS.Resin_PhotonMono.minPrice);
    return rCost > fdmCost;
  };
  tests.push({ name: "Resin more expensive (typical)", pass: compareSameDims(100,80,40) });
  // (6) Лазер — по-голяма площ => по-висока цена
  const s = ENGRAVE_SURFACES.wood;
  const small = s.setup + 50*s.pricePerCm2;
  const big = s.setup + 200*s.pricePerCm2;
  tests.push({ name: "Engrave scales with area", pass: big>small, details: { small, big } });
  // (7) Отстъпка се прилага при прагове
  const disc = applyDiscount(500);
  tests.push({ name: "Discount applied for 500", pass: disc < 500, details: { after: disc } });
  // (8) Невалидни размери се отхвърлят
  const invalidDims = {x: 500, y: 500, z: 500};
  tests.push({ name: "Invalid dims exceed FDM volume", pass: !(invalidDims.x<=PRINTERS.FDM_Ender3Pro.volume.x && invalidDims.y<=PRINTERS.FDM_Ender3Pro.volume.y && invalidDims.z<=PRINTERS.FDM_Ender3Pro.volume.z) });
  return tests;
}

export default function Site3DandLaser(){
  const [tab, setTab] = useState("catalog");

  // Кошница
  const [cart, setCart] = useState<any[]>([]);

  // 3D печат — клиентски вход
  const [printer, setPrinter] = useState<PrinterKey>("FDM_Ender3Pro");
  const [dims, setDims] = useState({ x: 100, y: 80, z: 40 }); // mm
  const [qtyPrint, setQtyPrint] = useState(1);

  // Вътрешни параметри (скрити)
  const markupPct = 30; // % надценка
  const laborFee  = 3;  // фиксиран труд

  // Лазерно гравиране — клиентски вход
  const [surface, setSurface] = useState<SurfaceKey>("wood");
  const [area, setArea] = useState(60); // cm²
  const [complexity, setComplexity] = useState(5); // 1..10
  const [engraveText, setEngraveText] = useState("Честит рожден ден, Иван!");
  const [qtyEngrave, setQtyEngrave] = useState(1);

  // Контакт
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Тестове
  const [tests, setTests] = useState<any[]>([]);

  const uploadRef = useRef<HTMLInputElement|null>(null);

  // Проверка на формения endpoint (GAS Web App)
  const endpointStatus = useMemo(()=>{
    const u = FORM_ENDPOINT;
    if(!u) return 'missing' as const;
    const ok = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(u.trim());
    return ok ? ('ok' as const) : ('bad' as const);
  }, []);

  // Деривации
  const printerCfg = PRINTERS[printer];
  const isResin = printer === "Resin_PhotonMono";
  const material = MATERIALS[printerCfg.defaultMaterial as keyof typeof MATERIALS];

  const dimsValid = useMemo(()=>{
    const v = printerCfg.volume;
    return dims.x>0 && dims.y>0 && dims.z>0 && dims.x<=v.x && dims.y<=v.y && dims.z<=v.z;
  }, [dims, printerCfg]);

  const printPrice = useMemo(()=>{
    const volumeCm3 = (dims.x * dims.y * dims.z) / 1000; // bbox cm³
    let grams = 0, hours = 0;
    if (isResin){
      grams = estimateResinGrams(volumeCm3, material.density);
      hours = estimateResinHours(dims.z);
    } else {
      grams = estimateFDMGrams(volumeCm3, material.density, PRINTERS.FDM_Ender3Pro.defaults.infill);
      hours = estimateFDMHours(grams, PRINTERS.FDM_Ender3Pro.gramsPerHour);
    }
    const materialCost = grams * material.pricePerGram;
    let subtotal = materialCost + hours * printerCfg.machineRatePerHour + laborFee;
    if (isResin) subtotal += PRINTERS.Resin_PhotonMono.postFeeBase;
    const withMarkup = subtotal * (1 + markupPct/100);
    const perItem = Math.max(withMarkup, printerCfg.minPrice || 8);
    let total = perItem * qtyPrint;
    total = applyDiscount(total);
    return { perItem, total };
  }, [dims, qtyPrint, printer, printerCfg, isResin, material]);

  const engravePrice = useMemo(()=>{
    const s = ENGRAVE_SURFACES[surface];
    const complexityFactor = 1 + (complexity - 5) * 0.06; // +/-30%
    const perItem = Math.max(s.setup + area * s.pricePerCm2 * complexityFactor, 12);
    let total = perItem * qtyEngrave;
    total = applyDiscount(total);
    return { perItem, total };
  }, [surface, area, complexity, qtyEngrave]);

  function addPrintToCart(){
    if (!dimsValid){ alert("Размерите надвишават обема на избрания принтер или не са валидни."); return; }
    const item = {
      type: "print", printer, dims, qty: qtyPrint,
      name, email, phone, notes,
      total: Number(printPrice.total.toFixed(2)),
    };
    setCart(c=>[...c, item]);
  }

  function addEngraveToCart(){
    const item = {
      type: "engrave", surface, area, complexity, engraveText, qty: qtyEngrave,
      name, email, phone, notes, total: Number(engravePrice.total.toFixed(2)),
    };
    setCart(c=>[...c, item]);
  }

  const cartTotal = useMemo(()=> cart.reduce((s,i)=> s + i.total, 0), [cart]);

  function buildEmailBody(){
    const lines = cart.map((it, idx)=>{
      if(it.type==="print"){
        const p = PRINTERS[it.printer as PrinterKey];
        return `#${idx+1} 3D ПЕЧАТ | Принтер: ${p.name} | Размери: ${it.dims.x}×${it.dims.y}×${it.dims.z} mm | Брой: ${it.qty} | Цена: ${it.total} лв.`;
      } else if (it.type === "engrave"){
        return `#${idx+1} ГРАВИРАНЕ | Повърхност: ${ENGRAVE_SURFACES[it.surface as SurfaceKey].name} | Площ: ${it.area} cm2 | Сложност: ${it.complexity}/10 | Текст: ${it.engraveText || "-"} | Брой: ${it.qty} | Цена: ${it.total} лв.`;
      } else {
        return `#${idx+1} КАТАЛОГ | ${it.title} | Цена: ${it.total} лв. | Брой: ${it.qty}`;
      }
    }).join("%0D%0A");

    const contactRaw = `Име: ${name}\nИмейл: ${email}\nТелефон: ${phone}\nЗабележки: ${notes}`;
    const contact = contactRaw.replace(/\n/g, "%0D%0A");
    const subject = encodeURIComponent("Запитване/Поръчка – 3D печат и лазерно гравиране");
    const body = `${lines}%0D%0A%0D%0A${contact}`;
    return `mailto:${BUSINESS_EMAIL}?subject=${subject}&body=${body}`;
  }

  const sampleProducts = [
    { id: "p1", title: "Персонализиран ключодържател", price: 14, tag: "PLA", desc: "3D печат, име/лого по избор." },
    { id: "p2", title: "Табела за врата", price: 39, tag: "Лазер/Дърво", desc: "Дъска от бук с лазерно гравиране." },
    { id: "p3", title: "Стойка за телефон", price: 22, tag: "PETG", desc: "Устойчива стойка, цвят по избор." },
    { id: "p4", title: "Гравирана чаша", price: 32, tag: "Стъкло", desc: "Лазерно матиране/рисунка." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur bg-zinc-900/60 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PHLogo className="h-8 w-auto"/>
            <Badge variant="secondary" className="ml-2">Made to order</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#services" className="hover:underline">Услуги</a>
            <a href="#catalog" className="hover:underline">Каталог</a>
            <a href="#custom" className="hover:underline">Индивидуална поръчка</a>
            <a href="#contact" className="hover:underline">Контакт</a>
          </nav>
          <div className="flex items-center gap-2">
            <Badge>{cart.length} артикула</Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary"><ShoppingCart className="h-4 w-4 mr-1"/>Кошница</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Кошница</DialogTitle></DialogHeader>
                <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                  {cart.length === 0 && <p className="text-sm text-zinc-400">Празна е.</p>}
                  {cart.map((it, i)=> (
                    <Card key={i} className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>{it.type === "print" ? "3D печат" : it.type === "engrave" ? "Лазерно гравиране" : "Каталог"}</CardTitle>
                        <CardDescription className="text-xs">
                          {it.type === "print"
                            ? `${PRINTERS[it.printer as PrinterKey].name}, ${it.dims.x}×${it.dims.y}×${it.dims.z} mm`
                            : it.type === "engrave"
                              ? `${ENGRAVE_SURFACES[it.surface as SurfaceKey].name}, ${it.area} cm², сложн. ${it.complexity}/10, текст: ${it.engraveText || "-"}`
                              : it.title}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="justify-between pt-0">
                        <span className="text-sm">Брой: {it.qty}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{money(it.total)}</span>
                          <Button size="sm" variant="ghost" onClick={()=> setCart(cart.filter((_,idx)=> idx!==i))}>Премахни</Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                <DialogFooter className="justify-between sm:justify-between gap-4">
                  <div className="text-sm">Общо: <span className="font-semibold">{money(cartTotal)}</span></div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={()=> downloadText(`kalkulacia-${Date.now()}.txt`, JSON.stringify({ name, email, phone, notes, cart, total: cartTotal }, null, 2))}><Download className="h-4 w-4 mr-1"/>Изтегли оферта</Button>
                    <a href={buildEmailBody()}><Button><Mail className="h-4 w-4 mr-1"/>Изпрати по имейл</Button></a>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold leading-tight">3D печат и лазерно гравиране <span className="text-zinc-400">по поръчка</span></h1>
            <p className="mt-4 text-zinc-300">Избери принтер (FDM/Resin), въведи размери и виж ориентировъчна цена. Финална оферта давам след преглед на файла.</p>
            <div className="mt-6 flex gap-3">
              <a href="#custom"><Button size="lg"><Calculator className="h-4 w-4 mr-2"/>Бърза калкулация</Button></a>
              <a href="#catalog"><Button size="lg" variant="secondary">Готови продукти</Button></a>
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl border border-zinc-800"><div className="font-semibold">Макс. размер (FDM)</div><div className="text-zinc-400">{PRINTERS.FDM_Ender3Pro.volume.x}×{PRINTERS.FDM_Ender3Pro.volume.y}×{PRINTERS.FDM_Ender3Pro.volume.z} mm</div></div>
              <div className="p-4 rounded-xl border border-zinc-800"><div className="font-semibold">Макс. размер (Resin)</div><div className="text-zinc-400">{PRINTERS.Resin_PhotonMono.volume.x}×{PRINTERS.Resin_PhotonMono.volume.y}×{PRINTERS.Resin_PhotonMono.volume.z} mm</div></div>
              <div className="p-4 rounded-xl border border-zinc-800"><div className="font-semibold">Материали</div><div className="text-zinc-400">PLA, PETG, ABS, ABS-like Resin</div></div>
              <div className="p-4 rounded-xl border border-zinc-800"><div className="font-semibold">Срок</div><div className="text-zinc-400">Обикн. 1–3 дни според сложност</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section id="portfolio" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Портфолио</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {["FDM детайли","FDM функционални","Resin миниатюри","Resin висока детайлност","Лазер върху дърво","Лазер върху стомана","Лазер върху камък","Лазер върху стъкло"].map((t,i)=> (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2"><CardTitle className="text-base">{t}</CardTitle></CardHeader>
              <CardContent><div className="aspect-video rounded-lg bg-zinc-800/60 border border-zinc-700 flex items-center justify-center">Снимка</div></CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICE EXAMPLES */}
      <section id="prices" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Примерни цени</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Card className="bg-zinc-900 border-zinc-800"><CardHeader><CardTitle className="text-base">3D печат (FDM vs Resin)</CardTitle><CardDescription>Ориентировъчно при стандартни настройки.</CardDescription></CardHeader><CardContent>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>Ключодържател 50×20×5 mm — FDM ~ 10–15 лв., Resin ~ 18–25 лв.</li>
              <li>Стойка за телефон 120×70×60 mm — FDM ~ 18–28 лв., Resin ~ 28–45 лв.</li>
              <li>Фигурка 90×50×50 mm — FDM ~ 16–24 лв., Resin ~ 26–40 лв.</li>
            </ul>
          </CardContent></Card>
          <Card className="bg-zinc-900 border-zinc-800"><CardHeader><CardTitle className="text-base">Лазерно гравиране</CardTitle><CardDescription>Setup + цена/см² + сложност.</CardDescription></CardHeader><CardContent>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>Дъска от бук 200×300 mm (600 см²) — ~ {money(6 + 600*0.10)}</li>
              <li>Неръжд. табелка 50×200 mm (100 см²) — ~ {money(12 + 100*0.25)}</li>
              <li>Гранитна плоча 100×100 mm (100 см²) — ~ {money(10 + 100*0.20)}</li>
            </ul>
          </CardContent></Card>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Услуги</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "3D печат по файл", desc: "Приемам .STL, .OBJ, .3MF, .STEP. Помагам с настройки и оптимизация.", tag: "FDM / Resin" },
            { title: "Лазерно гравиране", desc: "Текст/лого върху дърво, неръждавейка, камък, стъкло, кожа, плексиглас.", tag: "CO2 / Fiber" },
            { title: "Проектиране", desc: "Мога да изработя модел по идея/скица. Часова ставка и фиксирани оферти.", tag: "CAD" },
          ].map((s, i)=> (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">{s.title}</CardTitle>
                <CardDescription>{s.tag}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-300">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CUSTOM ORDER & CALCULATOR */}
      <section id="custom" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Индивидуална поръчка и калкулатор</h2>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="print">3D печат</TabsTrigger>
            <TabsTrigger value="engrave">Гравиране</TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Оферта за 3D печат</CardTitle>
                <CardDescription>Клиентът въвежда само примерни размери. Цената е ориентировъчна (като в Cura).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Принтер</Label>
                    <Select value={printer} onValueChange={(v)=> setPrinter(v as PrinterKey)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={printerCfg.name}/></SelectTrigger>
                      <SelectContent>
                        {Object.keys(PRINTERS).map(k=> (<SelectItem key={k} value={k}>{PRINTERS[k as PrinterKey].name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Размер X (mm)</Label><Input inputMode="decimal" value={dims.x} onChange={e=> setDims({...dims, x: Number(e.target.value)||0})} className="mt-1"/></div>
                  <div><Label>Размер Y (mm)</Label><Input inputMode="decimal" value={dims.y} onChange={e=> setDims({...dims, y: Number(e.target.value)||0})} className="mt-1"/></div>
                  <div><Label>Размер Z (mm)</Label><Input inputMode="decimal" value={dims.z} onChange={e=> setDims({...dims, z: Number(e.target.value)||0})} className="mt-1"/></div>
                  <div><Label>Брой</Label><Input inputMode="numeric" value={qtyPrint} onChange={e=> setQtyPrint(Number(e.target.value)||1)} className="mt-1"/></div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm">
                  {!dimsValid && (<div className="text-red-400 mb-2">Размерите надвишават обема на {printerCfg.name}: {printerCfg.volume.x}×{printerCfg.volume.y}×{printerCfg.volume.z} mm</div>)}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>Принтер: <span className="font-medium">{printerCfg.name}</span></div>
                    <div>Макс. обем: <span className="font-medium">{printerCfg.volume.x}×{printerCfg.volume.y}×{printerCfg.volume.z} mm</span></div>
                    <div>Цена/бр.: <span className="font-semibold">{money(printPrice.perItem)}</span></div>
                  </div>
                  <div className="mt-2">Общо: <span className="font-semibold">{money(printPrice.total)}</span></div>
                </div>
                <Button onClick={addPrintToCart} disabled={!dimsValid}><ShoppingCart className="h-4 w-4 mr-2"/>Добави в кошницата</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engrave" className="mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg">Оферта за лазерно гравиране</CardTitle>
                <CardDescription>Избери повърхност, площ и сложност. Текстът е примерен.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Повърхност</Label>
                    <Select value={surface} onValueChange={(v)=> setSurface(v as SurfaceKey)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={ENGRAVE_SURFACES[surface].name}/></SelectTrigger>
                      <SelectContent>
                        {Object.keys(ENGRAVE_SURFACES).map(k=> (<SelectItem key={k} value={k}>{ENGRAVE_SURFACES[k as SurfaceKey].name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Площ (cm²)</Label><Input inputMode="decimal" value={area} onChange={e=> setArea(Number(e.target.value)||0)} className="mt-1"/></div>
                  <div><Label>Брой</Label><Input inputMode="numeric" value={qtyEngrave} onChange={e=> setQtyEngrave(Number(e.target.value)||1)} className="mt-1"/></div>
                  <div className="md:col-span-3">
                    <Label>Сложност (1=просто лого, 10=фина снимка)</Label>
                    <div className="mt-2"><Slider value={[complexity]} min={1} max={10} step={1} onValueChange={(v)=> setComplexity(v[0])}/></div>
                  </div>
                  <div className="md:col-span-3"><Label>Текст за гравиране</Label><Input value={engraveText} onChange={e=> setEngraveText(e.target.value)} className="mt-1" placeholder={'Пример: "Може ли да ми гравирате дъска за рожден ден?"'}/></div>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>Повърхност: <span className="font-medium">{ENGRAVE_SURFACES[surface].name}</span></div>
                    <div>Цена/бр.: <span className="font-semibold">{money(engravePrice.perItem)}</span></div>
                    <div>Общо: <span className="font-semibold">{money(engravePrice.total)}</span></div>
                  </div>
                </div>
                <Button onClick={addEngraveToCart}><ShoppingCart className="h-4 w-4 mr-2"/>Добави в кошницата</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Контакт и данни за клиента</h2>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Остави данни и изпрати запитване</CardTitle>
                        {endpointStatus!=='ok' && (
              <div className="mt-2 text-yellow-400 text-sm">
                {endpointStatus==='missing'
                  ? '⚠ Липсва FORM_ENDPOINT. Създай .env.local и добави NEXT_PUBLIC_FORM_ENDPOINT=https://script.google.com/macros/s/…/exec, после рестартирай dev.'
                  : '⚠ FORM_ENDPOINT изглежда грешен. Трябва да е https://script.google.com/macros/s/…/exec и Web app достъп: Anyone.'}
              </div>
            )}
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div><Label>Име</Label><Input value={name} onChange={e=> setName(e.target.value)} className="mt-1" placeholder="Пълно име"/></div>
            <div><Label>Имейл</Label><Input type="email" value={email} onChange={e=> setEmail(e.target.value)} className="mt-1" placeholder="you@example.com"/></div>
            <div><Label>Телефон</Label><Input value={phone} onChange={e=> setPhone(e.target.value)} className="mt-1" placeholder="08xx xxx xxx"/></div>
            <div className="md:col-span-3"><Label>Забележки към поръчката</Label><Textarea value={notes} onChange={e=> setNotes(e.target.value)} className="mt-1" placeholder="Цвят, срок, референции, линкове…"/></div>
            <div className="md:col-span-3">
              <Label>Файлове към запитването (.stl, .obj, .step, .3mf, .pdf, .jpg, .png)</Label>
              <Input ref={uploadRef} type="file" multiple accept=".stl,.obj,.step,.3mf,.pdf,.jpg,.jpeg,.png" className="mt-1"/>
              <p className="text-xs text-zinc-400 mt-1">Можеш да прикачиш няколко файла. Максимумът зависи от настройката на сървъра.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-sm">Текуща сума: <span className="font-semibold">{money(cartTotal)}</span> ({cart.length} артикула)</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=> downloadText(`kalkulacia-${Date.now()}.txt`, JSON.stringify({ name, email, phone, notes, cart, total: cartTotal }, null, 2))}><Download className="h-4 w-4 mr-1"/>Изтегли оферта</Button>
              <a href={buildEmailBody()}><Button><Mail className="h-4 w-4 mr-1"/>Изпрати по имейл</Button></a>
              <Button variant="secondary" onClick={async ()=>{
                if(!FORM_ENDPOINT){ alert('Няма настроен FORM_ENDPOINT (Web App /exec).'); return; }
                const isValid = FORM_ENDPOINT.startsWith('https://script.google.com/macros/s/') && FORM_ENDPOINT.endsWith('/exec');
                if(!isValid){ alert('FORM_ENDPOINT трябва да завършва на /exec'); return; }
                try{
                  const body = new URLSearchParams({
                    when: new Date().toISOString(),
                    name, email, phone, notes,
                    total: String(cartTotal),
                    cart: JSON.stringify(cart)
                  });
                  await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, mode: 'no-cors' });
                  alert('Изпратено (без файлове). Провери Google Sheet таба.');
                }catch(err){
                  alert(`Грешка при изпращане: ${String(err)}`);
                }
              }}>Изпрати (без файлове)</Button>
              <Button asChild variant="secondary"><a href="tel:+359879146134"><Button asChild={false} variant="secondary"><span className="flex items-center"><span className="mr-1"><Phone className="h-4 w-4"/></span>Обади се</span></Button></a></Button>
            </div>
          </CardFooter>
        </Card>
      </section>

      {/* SELF-TESTS */}
      <section className="max-w-6xl mx-auto px-4 pb-2">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Самопроверка (тестове)</CardTitle>
            <CardDescription>Проверка на ограниченията и формулите.</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button size="sm" onClick={()=> setTests(runSelfTests())}>Пусни тестовете</Button>
            {tests.length>0 && <span className="text-sm">Резултати: {tests.filter(t=>t.pass).length}/{tests.length} PASS</span>}
          </CardFooter>
          {tests.length>0 && (
            <CardContent>
              <div className="grid md:grid-cols-3 gap-2 text-xs">
                {tests.map((t, idx)=> (
                  <div key={idx} className="p-2 rounded border border-zinc-800">
                    <div className={"font-medium " + (t.pass ? "text-green-400" : "text-red-400")}>{t.pass ? "PASS" : "FAIL"} — {t.name}</div>
                    <pre className="mt-1 whitespace-pre-wrap text-zinc-300">{JSON.stringify(t.details || {}, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Често задавани въпроси</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Card className="bg-zinc-900 border-zinc-700"><CardHeader><CardTitle className="text-base text-white">Колко бързо?</CardTitle></CardHeader><CardContent className="text-zinc-200">Единични изделия обикновено за 1–3 работни дни според сложността.</CardContent></Card>
          <Card className="bg-zinc-900 border-zinc-700"><CardHeader><CardTitle className="text-base text-white">Мога ли да дам собствен файл?</CardTitle></CardHeader><CardContent className="text-zinc-200">Да. Поддържам .STL, .OBJ, .STEP, .3MF. При нужда коригирам модела.</CardContent></Card>
          <Card className="bg-зinc-900 border-zinc-700"><CardHeader><CardTitle className="text-base text-white">Гравиране на чужди артикули?</CardTitle></CardHeader><CardContent className="text-zinc-200">Да, след оглед. За метали е нужна неръждавейка или подходяща сплав.</CardContent></Card>
          <Card className="bg-zinc-900 border-zinc-700"><CardHeader><CardTitle className="text-base text-white">Фактура?</CardTitle></CardHeader><CardContent className="text-zinc-200">Издавам касова бележка/фактура. Отстъпки за количества.</CardContent></Card>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-sm text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} 3D • LASER • BG — Изработка по поръчка
            <div className="mt-1">Имейл за поръчки: <span className="underline">{BUSINESS_EMAIL}</span></div>
            <div>Локация: Плевен/Пордим — изпращам с куриер в цялата страна</div>
          </div>
          <div className="flex items-center gap-2"><Ruler className="h-4 w-4"/><span>Политика за лични данни & условия (линкове за добавяне)</span></div>
        </div>
      </footer>
    </div>
  );
}
