import { Link } from 'react-router-dom';

import { CachedImage } from './CachedImage';

import { getCharacterImage, getCharacterImageFallback } from '@/data/manifest';



interface SectionCardProps {

  to?: string;

  onClick?: () => void;

  title: string;

  desc: string;

  /** Imagen de fondo personalizada (p. ej. /img/home/combos.webp). Tiene prioridad sobre bgSlug. */
  bgImage?: string;

  bgSlug?: string;

  badge?: string;

  wide?: boolean;

  num: string;

  accent?: 'lime' | 'pink' | 'cyan';

}



const ACCENT_VAR = {

  lime: 'var(--color-accent)',

  pink: 'var(--color-accent-secondary)',

  cyan: 'var(--color-accent-cyan)',

} as const;



export function SectionCard({

  to,

  onClick,

  title,

  desc,

  bgImage,

  bgSlug,

  badge,

  wide,

  num,

  accent = 'lime',

}: SectionCardProps) {

  const thumb = bgImage ?? (bgSlug ? getCharacterImage(bgSlug, 'thumb') : '');
  const thumbFallback = bgImage ? undefined : (bgSlug ? getCharacterImageFallback(bgSlug) : '');

  const style = { '--card-accent': ACCENT_VAR[accent] } as React.CSSProperties;



  const inner = (

    <>

      {thumb && <CachedImage src={thumb} fallbackSrc={thumbFallback} alt="" className="fight-card__bg" eager />}

      <div className="fight-card__shade" />

      {badge && <span className="fight-card__badge">{badge}</span>}

      <div className="fight-card__body">

        <span className="fight-card__num">{num}</span>

        <h2 className="fight-card__title">{title}</h2>

        <p className="fight-card__desc">{desc}</p>

      </div>

      <span className="fight-card__arrow">›</span>

    </>

  );



  const cls = `fight-card${wide ? ' fight-card--wide' : ''}`;



  if (onClick) {

    return (

      <button type="button" onClick={onClick} className={cls} style={style}>

        {inner}

      </button>

    );

  }



  return (

    <Link to={to ?? '/'} className={cls} style={style}>

      {inner}

    </Link>

  );

}


