"use client";

/**
 * Голямото лого за началния екран — „кутия“ с P | H и отдолу 3D • LASER.
 * Чисто CSS/Tailwind, без изображения — идеално за гравиране/плотер.
 */
export default function LogoMark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const pad = size === "lg" ? "px-10 py-8" : "px-6 py-4";
  const radius = size === "lg" ? "rounded-[24px]" : "rounded-[16px]";
  const border = "border-2 border-white/80";
  const gap = size === "lg" ? "gap-4" : "gap-2";
  const mainText = size === "lg" ? "text-7xl" : "text-3xl";
  const subText = size === "lg" ? "text-2xl" : "text-base";

  return (
    <div
      className={`inline-flex flex-col items-center ${pad} ${radius} ${border} text-white/95 select-none`}
      aria-label="P | H 3D • LASER"
    >
      <div className={`flex items-center ${gap} tracking-widest font-extrabold`}>
        <span className={`${mainText}`}>P</span>
        <span className="h-[1em] w-[2px] bg-white/70 inline-block align-middle" aria-hidden />
        <span className={`${mainText}`}>H</span>
      </div>
      <div className={`${subText} font-semibold tracking-[0.25em] mt-2`}>
        3D&nbsp;Print•&nbsp;LASER
      </div>
    </div>
  );
}
