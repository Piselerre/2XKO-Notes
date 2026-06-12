export function SupportBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-bg-elevated via-bg-card to-bg-elevated p-5 glow-accent">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <p className="text-sm leading-relaxed text-text-primary">
        Este proyecto tiene coste de desarrollo y mantenimiento. Si te resulta útil, considera
        apoyarlo — cualquier aportación ayuda a seguir mejorándolo.
      </p>
      <a
        href="https://ko-fi.com/PixelR"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff5e5b] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] hover:brightness-110"
      >
        <span className="text-lg">☕</span>
        Apoyar en Ko-fi
      </a>
    </div>
  );
}
