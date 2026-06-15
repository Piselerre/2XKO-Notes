import { useI18n } from '@/hooks/useI18n';
import { openExternal } from '@/utils/openExternal';

/** Banner opcional de apoyo a la escena (Ko-fi). */
export function SupportBanner() {
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-bg-elevated via-bg-card to-bg-elevated p-5 glow-accent">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <p className="text-sm leading-relaxed text-text-primary">{t('startup.kofiBody')}</p>
      <button
        type="button"
        onClick={() => openExternal('https://ko-fi.com/PixelR')}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff5e5b] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] hover:brightness-110"
      >
        <span className="text-lg" aria-hidden>
          ☕
        </span>
        {t('startup.kofiCta')}
      </button>
    </div>
  );
}
