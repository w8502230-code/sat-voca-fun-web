---
name: sat-wordbank-pipeline-qa
description: Runs this project's SAT wordbank pipeline checks (Doubao apply/verify and example quality validation) and reports merge readiness. Use when wordbank JSON or content scripts change.
---
# SAT Wordbank Pipeline QA

## Scope

Project-specific content QA flow for `data/words-list-base.json` and related import artifacts.

## Workflow

1. If source batches changed, run:
   - `npm run apply:doubao`
2. Validate merge integrity:
   - `npm run verify:doubao`
3. Validate sentence/example quality:
   - `npm run check:examples`
4. Review generated reports under `data/imports/`.
5. Confirm the final `data/words-list-base.json` is the committed source of truth.

## Output

- command pass/fail summary
- report files created/updated
- ready-to-merge decision

## Guardrail

Do not ship content changes when verify/check scripts fail.
