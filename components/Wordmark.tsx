"use client";
import Link from "next/link";

/**
 * Продълговато лого за лентата отгоре: P | H 3D & Laser
 */
export default function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <div className="inline-flex items-center h-9 px-3 rounded-xl border border-white/20 bg-white/5 group-hover:bg-white/10 transition">
        <span className="font-extrabold tracking-widest text-lg">P</span>
        <span className="mx-2 h-5 w-[2px] bg-white/60 inline-block" aria-hidden />
        <span className="font-extrabold tracking-widest text-lg">H</span>
      </div>
      <span className="text-sm tracking-widest opacity-90">3D Print•LASER</span>
    </Link>
  );
}
