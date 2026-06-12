const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

export function isImageCached(src: string): boolean {
  return loaded.has(src);
}

export function preloadImage(src: string): Promise<void> {
  if (!src) return Promise.resolve();
  if (loaded.has(src)) return Promise.resolve();
  const existing = pending.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    const done = () => {
      loaded.add(src);
      pending.delete(src);
      resolve();
    };
    img.onload = done;
    img.onerror = done;
    img.src = src;
  });

  pending.set(src, promise);
  return promise;
}

export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(urls.map(preloadImage));
}

export function clearImageCache(): void {
  loaded.clear();
  pending.clear();
}
