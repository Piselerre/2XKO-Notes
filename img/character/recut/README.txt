Custom roster crops for 2XKO Notes
==================================

Place one PNG per fighter here, named by slug (lowercase):
  ahri.png, akali.png, blitzcrank.png, etc.

Photoshop export spec
---------------------
  Size:     900 x 1200 px  (3:4 ratio)
  DPI:      72 or 144
  Format:   PNG-24
  Background: solid #0c0c14  (or very close — matches the card)

Framing
-------
  - Character centered, full pose visible (head to feet or waist-up with arms)
  - Leave ~12% empty margin on ALL sides (skewed cards eat the corners)
  - Do not crop hands, weapons, or tails at the image edge

After adding files, regenerate thumbs from the project root:
  pnpm img:thumbs

Thumbs are written to img/character/thumbs/{slug}.webp
