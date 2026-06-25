# Session Handoff — skills-lector

**Remote main = 43823c8 · Local main = 19ccf5f (3 unpushed commits, NOT skip-ci) · 0 of my PRs (10 open dependabot) · working tree clean · 2026-06-25**

> Single anchor: 3 build-green commits are merged into LOCAL main but **not pushed** to origin. Pushing is the owed close-out (needs OK — outward-facing).

---

## 1. What just shipped (local main, unpushed)

Code-smell review of the whole repo, then three fix batches. Build green (`npm run build`, "✓ Compiled successfully") after every batch. No test suite — build is the type-check.

| SHA | Commit | Net |
|-----|--------|-----|
| `30d2ca3` | `refactor: extract shared helpers, kill duplication cluster` | −136 lines |
| `872f470` | `fix(presets): stop timeout leak and silent fetch failure in activate flow` | 2 real smells |
| `19ccf5f` | `refactor: clear remaining medium smells` | 4 MEDIUM smells |

Merge to local main was **fast-forward** (`43823c8..19ccf5f`). Feature branches `refactor/shared-helper-sweep` and `feat/cheats-only-new-default` were both confirmed merged and **deleted**. Only `main` remains.

**Review provenance:** 78-agent workflow fan-out + 1 adversarial verifier per finding → 66 confirmed findings (1 false positive filtered), **0 critical/high** (all duplication/maintainability). Full output: `/private/tmp/claude-501/-Users-xemoe-workspaces-claude-skills-lector/6b64c290-9df1-415f-bfa3-ca20a7932bde/tasks/wxyb5u38z.output` (ephemeral — may be gone next session; backlog below is the durable copy).

### New shared helpers (do NOT recreate local copies)
- `packages/core/src/cache.ts` — `makeCache<T>()` + `CACHE_TTL_MS` (4 scanners use it; `discover.ts` shares only the const — its cache also tracks `manifestMtime`, intentionally NOT on the factory)
- `packages/core/src/scanner.ts` — `findPluginRoots` now lives + is exported here
- `packages/presets/src/util.ts` — `itemKey(kind, id)`, `nowIso()`
- `apps/web/lib/item-key.ts` — `itemKey(item)` ; `apps/web/lib/json-fetch.ts` — `jsonFetch<T>()` ; `apps/web/components/meta-row.tsx` — `MetaRow` ; `basename` added to `apps/web/lib/utils.ts`
- Route id parsing reuses existing `parsePresetId` (`apps/web/lib/preset-query.ts`)

---

## 2. ⭐ Recommendation

**⭐ Push the 3 commits to `origin/main`.** They are merged locally, build-green, and self-contained — close out before adding more churn. *Gated:* outward-facing → needs explicit OK (sign-off Q1). Verify whether `main` is protected.

**Strongest no-gate alternative: Tier-3 safe extractions** (`StatCardGrid`, `usePagination`, `ItemSidebar<T>`). Mechanical, build-verifiable dedup; no external decision needed.

---

## 3. Options at a glance

| # | Option | Effort | Value | Gate? |
|---|--------|--------|-------|-------|
| 1 ⭐ | Push the 3 unpushed commits to origin/main | XS | High (close-out) | **Yes** — outward, needs OK; verify branch protection |
| 2 | Tier-3 safe extractions: StatCardGrid, usePagination, ItemSidebar<T> | M | High | No |
| 3 | Tier-3 big splits: Skills/Commands explorer dedup, CheatsExplorer split, buildAnalytics split | L | High | Soft — behavior-preserving, wants a visual/runtime check (not just build) |
| 4 | Over-engineering: trim i18n (drop th.ts?), delete ~15 unused icons | M | Med | **Yes** — keep Thai or not? (sign-off Q2) |
| 5 | LOW tail: preset SELECT-cols const, double statSync, dead `borderByType`, commented CardHeader, magic numbers | S | Low | No |
| 6 | Triage 10 open dependabot PRs (lucide-react 0→1, typescript 5→6, @types/node 22→26 are majors) | M | Med | **Yes** — majors may break; user calls which to merge |

---

## 4. Sign-off questions (answer before coding gated items)

1. **OK to `git push` the 3 commits to `origin/main`?** Is `main` protected / does CI run on push?
2. **i18n:** keep Thai (`th.ts`, 722 lines) or drop it? Gates Option 4 — if dropped, the whole i18n layer collapses to plain constants.
3. **Dependabot majors** (lucide-react 1.x, typescript 6.x, @types/node 26): merge, hold, or skip?

---

## 5. Backlog — code-smell findings NOT yet addressed

Durable copy of the review (ephemeral output file may vanish). Severity from the verified review.

### Tier-3 component extractions (behavior-preserving)
- **StatCardGrid** — `stat-cards.tsx`, `command-stat-cards.tsx`, `hook-stat-cards.tsx`, `cheat-stat-cards.tsx` (+ inline in `analytics-explorer.tsx`): 4× pixel-identical grid. [MED]
- **usePagination<T> + single PAGE_SIZE** — `skills/commands/hooks/cheats-explorer.tsx`: math copied 4×. [MED]
- **ItemSidebar<T>** — `skill-sidebar.tsx` ≡ `command-sidebar.tsx` (141 lines each). [MED]
- **Skills/Commands explorer dedup** — `useExplorerFilterState` + shared `FilterToolbar` / `CatalogExplorer`. [MED, larger]
- **CheatsExplorer split** — 584-line monolith, 2 inline render branches → `CheatTableView` + `CheatCardView`. [MED]
- **buildAnalytics split** — 284-line, ~15-branch event loop → `resolvePresetFilter/aggregateEvents/buildHeatmap/classifyCatalogGaps`. [MED]
- **RelationGraphScene** — 200-line mount effect → hoist helpers / `useForceGraph3D`. [MED]
- **PresetItemCard** — 9 consecutive `kind==='skill'` ternaries → normalize union once. [MED]

### Over-engineering
- i18n stack (en 746 + th 722 + context/server/config) in single-user tool. [MED] (Q2)
- ~15 unused SVG icons in `icons.tsx` from a starter template. [MED]

### Duplication (LOW tail)
- preset `SELECT` col-list ×3 in `presets.ts` (mirror `cheats.ts` `COLS`); `dayKey` vs `utils.formatDate`; `~/.claude.json` read 2×/scan (`usage.ts`); author-normalize ×2 (`scanner.ts`/`marketplace.ts`); 3 scanner API routes identical → `createScanRoute()`; pin archive/unarchive route clones; `PresetsExplorer` grid dup; code-block+CopyButton ×8 → `copyable-code.tsx`; scan-error `<details>` ×3; `initialPresetId` validation ×3; preset-items load block (`analytics.ts`≡`relations.ts`); migration runner (`db.ts`≡`import-cheats.mjs`); parser skeleton (`skill-parser`≡`command-parser`); clipboard copy state (`copy-button`≡`skill-md-viewer`) → `useCopy`; gradient interp (`lowpoly-background`≡`wave-spinner`) → `lib/color.ts`.

### LOW smells
`durationMs` recomputed in `applyPreset`; single-slot caches evict on param change (`analytics`/`relations`); `wave-spinner` 16-case switch → lookup; `LowPolyBackground` 110-line effect; `resolveSource` 3× `git rev-parse`; `writeLog` O(n·m) `.find`; session-events OR chain (`hook-stat-cards`); manual BOM strip (`skills/[id]`); dead `borderByType` (`preset-item-card`); commented `CardHeader` (`model-invocation-examples`); `node-pipeline` magic-number height.

---

## 6. Owed close-out (need explicit OK — not pre-done)

- **Push** `30d2ca3 872f470 19ccf5f` → `origin/main` (Q1).
- Optionally delete stale `HANDOFF.md` once consumed (this file).
- No issues created/closed this session.

---

## 7. Reusable lessons (also in memory — see `[[skills-lector-codesmell-refactor]]`)

- **No test suite.** `npm run build` IS the type-check + the gate. Success marker: `✓ Compiled successfully`. exit 0.
- **Build output is huge** (~2MB with Turbopack route table). Don't `tail` a combined grep+build dump — run build alone, grep for `Compiled successfully` / `error TS`.
- **exFAT:** build must stay `--turbopack` (already in scripts); never `pkill -f` broadly (kills other dev servers) — kill by exact port/PID. Restart dev with `dev:portless`.
- **`use-preset-queries` mutations now inherit `cache:"no-store"`** (were browser default) via shared `jsonFetch` — intended for `/api/*`, not a regression.
- **discover.ts cache is deliberately not on `makeCache`** (manifestMtime invalidation). Don't "finish the job" by forcing it onto the factory.
- **Review pattern that worked:** Workflow fan-out by subsystem + cross-cutting dimensions, then one adversarial verifier per finding (default isReal=false). Caught 1 false positive (`lenientField` slice claim). Repeat for Tier-3 verification.

---

## 8. Mechanics (carry forward)

```bash
# from repo root (delegates into apps/web)
npm run build          # Turbopack; type-check + gate; look for "✓ Compiled successfully"
npm run dev:portless   # the normal dev server here (HTTPS .local, LAN mode)

# branch off main, build-green per batch, ff-merge back:
git checkout -b <branch> && ...edits... && npm run build
git checkout main && git merge --ff-only <branch> && git branch -d <branch>

# disjoint-file mechanical edits → workflow with parallel() editor agents (no worktree
#   needed when file sets don't overlap). Author shared helper FILES yourself first,
#   then fan out call-site replacements.
```

- Attribution disabled globally → **no `Co-Authored-By` trailer** in commits.
- Commit style: conventional (`refactor:`, `fix(scope):`).
- After clone: `npm run install:all` (plain `npm install` only covers the no-dep root orchestrator).
