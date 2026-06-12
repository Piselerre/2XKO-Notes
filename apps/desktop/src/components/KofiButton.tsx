import { openExternal } from '@/utils/openExternal';

const KOFI_URL = 'https://ko-fi.com/PixelR';

/** Botón flotante Ko-fi (esquina inferior derecha). */
export function KofiButton() {
  return (
    <button
      type="button"
      className="kofi-float"
      onClick={() => openExternal(KOFI_URL)}
      title="Buy me a coffee on Ko-fi"
      aria-label="Support me on Ko-fi"
    >
      <img
        src="https://storage.ko-fi.com/cdn/cup-border.png"
        alt=""
        className="kofi-float__cup"
        draggable={false}
      />
      <span className="kofi-float__text">Buy me a coffee</span>
    </button>
  );
}
