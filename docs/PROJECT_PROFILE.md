# Project Profile - SAT Voca Fun Web

This file is the project-specific parameter sheet used by reusable workflows (deploy SOP, smoke checks, theme asset lock checks, and future skills).

## 1) Project identity

- Project name: `sat-voca-fun-web`
- Product type: SAT vocabulary learning web app
- Main branch: `main`
- Production domain: `https://sat-voca-fun-web.vercel.app`

## 2) Theme setup (current)

- Theme IDs:
  - `hp_slytherin`
  - `reverse_1999`
- Theme rotation: 5-day cycle (see `lib/theme.ts`)
- Canonical Study theme assets (locked):
  - `hp_slytherin -> /themes/slytherin-crest.png`
  - `reverse_1999 -> /themes/reverse-1999.jpg`
- Mapping source of truth: `lib/theme-assets.ts`
- Asset folder: `public/themes/`

## 3) Runtime/env profile

- Required env vars:
  - `APP_SECRET`
  - `NEXT_PUBLIC_APP_SECRET` (must equal `APP_SECRET`)
  - `HOUSEHOLD_CODE`
  - `LEARNER_ID`
  - `ROTATION_START_DATE`
  - `SERVER_TIMEZONE`
- Current household model:
  - `HOUSEHOLD_CODE=Luna0208`
  - `LEARNER_ID=luna`

## 4) Quality gates

- Pre-release checks:
  - `npm run lint`
  - `npm run smoke`
- Release SOP:
  - `docs/DEPLOY-SOP.md`

## 5) Smoke coverage profile

- Core pages:
  - `/`
  - `/study`
  - `/result`
  - `/review`
  - `/quiz?scope=wrong`
  - `/ops`
- Core APIs:
  - `/api/theme/current`
  - `/api/daily-plan`
  - `/api/progress/summary`
  - `/api/review/due`
  - `/api/quiz?scope=wrong`
  - `/api/study/mark` (POST)
- Smoke script:
  - `scripts/smoke.mjs`

## 6) Content pipeline profile

- Core data source:
  - `data/words-list-base.json`
- Pipeline commands:
  - `npm run apply:doubao`
  - `npm run verify:doubao`
  - `npm run check:examples`
- Reference docs:
  - `docs/WORD-BANK-PIPELINE.md`

## 7) Git/network notes

- If corporate proxy blocks push:
  - `git -c http.proxy= -c https.proxy= push`
- Always run from repo root:
  - `c:\work folder\AI builder\SAT Vocabulary for FUN\sat-voca-fun-web`

## 8) Re-theme template (for future projects)

When cloning this app into a new theme (e.g., another game IP), keep engine/release workflow and replace:

- Theme IDs and text tone
- Canonical theme assets in `public/themes/`
- `lib/theme-assets.ts` mapping
- Theme-specific content generation rules
- Production domain/env values
# Project Profile - SAT Voca Fun Web

This file is the project-specific parameter sheet used by reusable workflows (deploy SOP, smoke checks, theme asset lock checks, and future skills).

## 1) Project identity

- Project name: `sat-voca-fun-web`
- Product type: SAT vocabulary learning web app
- Main branch: `main`
- Production domain: `https://sat-voca-fun-web.vercel.app`

## 2) Theme setup (current)

- Theme IDs:
  - `hp_slytherin`
  - `reverse_1999`
- Theme rotation: 5-day cycle (see `lib/theme.ts`)
- Canonical Study theme assets (locked):
  - `hp_slytherin -> /themes/slytherin-crest.png`
  - `reverse_1999 -> /themes/reverse-1999.jpg`
- Mapping source of truth: `lib/theme-assets.ts`
- Asset folder: `public/themes/`

## 3) Runtime/env profile

- Required env vars:
  - `APP_SECRET`
  - `NEXT_PUBLIC_APP_SECRET` (must equal `APP_SECRET`)
  - `HOUSEHOLD_CODE`
  - `LEARNER_ID`
  - `ROTATION_START_DATE`
  - `SERVER_TIMEZONE`
- Current household model:
  - `HOUSEHOLD_CODE=Luna0208`
  - `LEARNER_ID=luna`

## 4) Quality gates

- Pre-release checks:
  - `npm run lint`
  - `npm run smoke`
- Release SOP:
  - `docs/DEPLOY-SOP.md`

## 5) Smoke coverage profile

- Core pages:
  - `/`
  - `/study`
  - `/result`
  - `/review`
  - `/quiz?scope=wrong`
  - `/ops`
- Core APIs:
  - `/api/theme/current`
  - `/api/daily-plan`
  - `/api/progress/summary`
  - `/api/review/due`
  - `/api/quiz?scope=wrong`
  - `/api/study/mark` (POST)
- Smoke script:
  - `scripts/smoke.mjs`

## 6) Content pipeline profile

- Core data source:
  - `data/words-list-base.json`
- Pipeline commands:
  - `npm run apply:doubao`
  - `npm run verify:doubao`
  - `npm run check:examples`
- Reference docs:
  - `docs/WORD-BANK-PIPELINE.md`

## 7) Git/network notes

- If corporate proxy blocks push:
  - `git -c http.proxy= -c https.proxy= push`
- Always run from repo root:
  - `c:\work folder\AI builder\SAT Vocabulary for FUN\sat-voca-fun-web`

## 8) Re-theme template (for future projects)

When cloning this app into a new theme (e.g., another game IP), keep engine/release workflow and replace:

- Theme IDs and text tone
- Canonical theme assets in `public/themes/`
- `lib/theme-assets.ts` mapping
- Theme-specific content generation rules
- Production domain/env values
