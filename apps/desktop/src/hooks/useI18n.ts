import { translate, useAppStore, type Locale } from '@2xko/core';

export function useI18n() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const t = (path: string) => translate(locale, path);
  return { locale, setLocale, t };
}

export type { Locale };
