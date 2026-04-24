# Word bank: Doubao / gap merge

## Source of truth

- Runtime import: `lib/word-bank.ts` → `data/words-list-base.json`
- Manual bilingual overrides are merged from block-format `.txt` files under the repo parent `data/` folder (paths are relative to `sat-voca-fun-web/` in npm scripts).

## Merge format (each lemma)

```text
lemma: word
enDef: ...
enExampleSat: ...
cnDef: ...
zhExampleSat: ...

```

Blank line between entries. Later files **overwrite** the same `lemma` (see `package.json` → `apply:doubao` order).

## Commands

| Command | Purpose |
|--------|---------|
| `npm run apply:doubao` | Merge all configured `sample fm DOUBAO*.txt` and `gap*.txt` into `data/words-list-base.json` (five fields only). Writes `data/imports/doubao-merge-report.txt`. |
| `npm run verify:doubao` | Assert JSON matches the merged txt set field-for-field; exits non-zero if drift or if any row still uses the generic SAT phrase `appears frequently in SAT-style academic contexts`. |
| `npm run check:examples` | Quality report → `data/example-quality-report.json`. Use `-- --input data/words-list-base.json --strict-theme` only for content QA scenarios that still require themed EN lines. End-user Study UI currently renders SAT examples only. |

## Operational notes

- After editing overrides, run **`npm run apply:doubao`** and commit **`data/words-list-base.json`** so the app does not load a stale copy from another branch or machine.
- Run **`npm run verify:doubao`** before release if the word bank was touched.
