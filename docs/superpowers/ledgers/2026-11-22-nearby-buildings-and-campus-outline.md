# Execution ledger — Nearby buildings and quiet campus outline

Plan: `docs/superpowers/plans/2026-11-22-nearby-buildings-and-campus-outline.md`

## Task 1 — Demote education areas to a faint outline

- [x] Step 1 — Failing test added to `src/categories.test.ts`
- [x] Step 2 — Focused test confirmed RED (`expected 'fill' to be 'outline'`)
- [x] Step 3 — `education.style` changed to `'outline'`
- [x] Step 4 — Focused test confirmed GREEN
- [x] Step 5 — Full test suite PASS (15 files, 63 tests)
- [x] Step 6 — Committed as `a59504c`

## Task 2 — Widen the fetch box and commit nearby real buildings

- [x] Step 1 — Failing tests added to `scripts/fetch-places.test.ts`
- [x] Step 2 — Focused tests confirmed RED (missing constant, 98 buildings)
- [x] Step 3 — `PLACES_BBOX` exported and used
- [x] Step 4 — Bbox test GREEN / count test still RED
- [x] Step 5 — GeoJSON refreshed via `pnpm data --from-file` (live endpoints returned 502/504); 626 features, 481 buildings, 573 KB
- [x] Step 6 — Focused style + data tests PASS (21 tests)
- [x] Step 7 — Full gate PASS (`pnpm typecheck && pnpm test && pnpm build`; 15 files, 65 tests)
- [x] Step 8 — Chrome check PASS at 1280×800, 1440×900, 1920×1080: no scroll, overlay hidden, no console errors; campus polygon in outline/tint layers and absent from fill layer; 205 context + 43 categorised buildings visible; isolated context building has default cursor, no tooltip/card; categorised hover shows tooltip and click opens card
- [x] Step 9 — Committed as `257a1fc`

## Final whole-branch review

- [ ] Fresh reviewer subagent dispatched with spec + plan + diff
- [ ] Findings fixed and re-verified
- [ ] Completion reported to user
