# Deploy SOP

This SOP standardizes release steps for `sat-voca-fun-web` to reduce regressions from env drift, theme asset mismatch, and incomplete verification.

## 1) Preconditions

- Branch is up to date with `main`.
- Vercel env vars are configured for Production:
  - `APP_SECRET`
  - `NEXT_PUBLIC_APP_SECRET` (must be identical to `APP_SECRET`)
  - `HOUSEHOLD_CODE`
  - `LEARNER_ID`
  - `ROTATION_START_DATE`
  - `SERVER_TIMEZONE`

## 2) Local validation

Run in `sat-voca-fun-web`:

```bash
npm run lint
npm run smoke
```

Release only when both pass.

## 3) Theme asset lock check

Study theme images must remain canonical:

- `public/themes/slytherin-crest.png`
- `public/themes/reverse-1999.jpg`

And `lib/theme-assets.ts` must map `hp_slytherin` and `reverse_1999` to those exact paths.

## 4) Commit and push

```bash
git status
git add .
git commit -m "your message"
git push
```

If corporate proxy blocks push, use one-shot bypass:

```bash
git -c http.proxy= -c https.proxy= push
```

## 5) Verify Vercel deployment

- Check latest production deployment is `Ready`.
- Confirm commit SHA matches pushed commit.
- Open production domain and run a quick manual flow:
  - `/study` mark action works
  - `/result` loads
  - `/review` loads
  - both theme images render correctly

## 6) Optional production smoke from local

```bash
SMOKE_BASE_URL=https://<your-domain> SMOKE_APP_SECRET=<APP_SECRET> npm run smoke
```

On Windows PowerShell:

```powershell
$env:SMOKE_BASE_URL="https://<your-domain>"
$env:SMOKE_APP_SECRET="<APP_SECRET>"
npm run smoke
```

## 7) Rollback guideline

If a blocking issue appears after deploy:

1. Roll back from Vercel to previous stable deployment.
2. Create hotfix on `main`.
3. Re-run this SOP before re-release.
