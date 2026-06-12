Header team pair portraits (TeamPairHeader)
============================================
Use these crops for the two fighters shown centered in the app header.

Target display size (CSS): ~52px tall × ~40px wide per portrait (varies with viewport).
Recommended source file: 120 × 160 px (3:4), PNG or WebP.

Specs:
- Aspect ratio: 3:4 (width × height)
- Background: #0c0c14 (same as fighter cards)
- Subject: bust / face + upper torso, centered horizontally
- Safe zone: keep face and shoulders inside the middle 80% (skew not applied in header)
- object-fit: cover, object-position: center 24% (in CSS)

File naming (optional dedicated assets):
  img/character/header/{slug}.webp

If omitted, the app falls back to img/character/thumbs/{slug}.webp.
