import { characters, getCharacterImage, getCharacterPortraitFallback, getCharacterPortraitSrc } from '@/data/manifest';

import { preloadImages } from './imageCache';



const BUTTON_GLYPHS = [
  'Glyph-up_back.svg',
  'Glyph-up.svg',
  'Glyph-up_forward.svg',
  'Glyph-back.svg',
  'Glyph-forward.svg',
  'Glyph-down_back.svg',
  'Glyph-down.svg',
  'Glyph-down_forward.svg',
  'Glyph-L.svg',
  'Glyph-M.svg',
  'Glyph-H.svg',
  'Glyph-parry.svg',
  'Glyph-S1.svg',
  'Glyph-S2.svg',
  'Glyph-T.svg',
  'Glyph-plus.svg',
  'Glyph-chain.svg',
  'Glyph-Dash.svg',
];



const HOME_THUMBS = ['vi', 'yasuo', 'ekko', 'braum', 'ahri'];



export function preloadAppImages(): void {

  const thumbs = characters.map((c) => getCharacterPortraitSrc(c.slug));

  const home = HOME_THUMBS.map((s) => getCharacterImage(s, 'thumb'));



  void preloadImages([

    '/img/logo/LogoApp.png',

    '/img/background/Background.png',

    ...BUTTON_GLYPHS.map((f) => `/img/buttons/${f}`),

    ...thumbs,

    ...home,

  ]);



  // Full-res en idle para cuando hagan falta

  if ('requestIdleCallback' in window) {

    requestIdleCallback(() => {

      void preloadImages(characters.map((c) => getCharacterPortraitFallback(c.slug)));

    });

  }

}



export const glyphUrl = (file: string) => `/img/buttons/${file}`;


