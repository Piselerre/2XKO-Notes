import { useEffect, useState } from 'react';

import { isImageCached, preloadImage } from '@/utils/imageCache';



interface CachedImageProps {

  src: string;

  alt: string;

  className?: string;

  eager?: boolean;

  fallbackSrc?: string;

}



export function CachedImage({ src, alt, className = '', eager, fallbackSrc }: CachedImageProps) {

  const [activeSrc, setActiveSrc] = useState(src);

  const [ready, setReady] = useState(() => isImageCached(src));



  useEffect(() => {

    setActiveSrc(src);

    setReady(isImageCached(src));

  }, [src]);



  useEffect(() => {

    if (!activeSrc) return;

    if (isImageCached(activeSrc)) {

      setReady(true);

      return;

    }

    let cancelled = false;

    preloadImage(activeSrc).then(() => {

      if (!cancelled) setReady(true);

    });

    return () => { cancelled = true; };

  }, [activeSrc]);



  if (!ready) {

    return <div className={`img-skeleton ${className}`} aria-hidden />;

  }



  return (

    <img

      src={activeSrc}

      alt={alt}

      className={className}

      decoding="async"

      loading={eager ? 'eager' : 'lazy'}

      fetchPriority={eager ? 'high' : 'auto'}

      draggable={false}

      onError={() => {

        if (fallbackSrc && activeSrc !== fallbackSrc) {

          setActiveSrc(fallbackSrc);

          setReady(isImageCached(fallbackSrc));

        }

      }}

    />

  );

}


