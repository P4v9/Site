export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="container py-8 text-sm text-gray-400 flex flex-col sm:flex-row gap-3 justify-between">
        <div>© {new Date().getFullYear()} PH 3D-Laser</div>
        <div className="flex gap-4">
          <a href="/za-nas" className="hover:underline">За нас</a>
          <a href="/terms" className="hover:underline">Условия</a>
          <a href="/privacy" className="hover:underline">Поверителност</a>
        </div>
      </div>
    </footer>
  );
}
