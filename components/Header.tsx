"use client";
import Link from "next/link";
import CartButton from "@/components/CartButton";
import Wordmark from "@/components/Wordmark";

export default function Header() {
  return (
    <header className="border-b border-white/10">
      <div className="container h-14 flex items-center justify-between">
        {/* Лого вляво */}
        <Wordmark />

        {/* Меню + кошница вдясно */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/uslugi">Услуги</Link>
            <Link href="/produkti">Продукти</Link>
            <Link href="/ceni">Цени</Link>
            <Link href="/faq">ЧЗВ</Link>
            <Link href="/zapitvane">Запитване</Link>
            <Link href="/kontakt">Контакт</Link>
          </nav>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
