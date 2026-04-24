---
name: sat-theme-asset-lock
description: Enforces canonical Study theme image mapping for this SAT project and prevents fallback to legacy assets. Use when updating theme images, fixing theme mismatch, or preparing releases.
---
# SAT Theme Asset Lock

## Project-specific canonical assets

- `hp_slytherin -> /themes/slytherin-crest.png`
- `reverse_1999 -> /themes/reverse-1999.jpg`

Source of truth:
- `lib/theme-assets.ts`

Asset directory:
- `public/themes/`

## Required checks

1. Verify mapping in `lib/theme-assets.ts` points to the two canonical files above.
2. Ensure no references to legacy files remain:
   - `slytherin-crest.svg`
   - `slytherin-crest.jpg`
   - `reverse-1999-sigil.svg`
3. Confirm files exist in `public/themes/`.
4. Run:
   - `npm run lint`
   - `npm run smoke`

## Release gate

Do not release if any old theme asset reference exists or canonical files are missing.
