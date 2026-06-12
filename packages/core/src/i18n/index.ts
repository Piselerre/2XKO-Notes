import type { Locale } from '../types';
import { en, type TranslationTree } from './locales/en';
import { es } from './locales/es';

const locales: Record<Locale, TranslationTree> = { en, es };

export function translate(locale: Locale, path: string): string {
  const parts = path.split('.');
  let node: unknown = locales[locale];
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return path;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : path;
}

export { en, es };
