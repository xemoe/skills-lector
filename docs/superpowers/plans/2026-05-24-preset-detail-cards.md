# Preset detail card view + explorer Preset filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare-identifier list on the preset detail page with explorer-style cards, add a "Preset" filter dropdown to the Skills and Commands explorers (with URL sync), and add a "Back to preset … in explorer" link on the skill/command detail pages so preset context survives a click-through.

**Architecture:** Server-side enrichment in `packages/presets` (`enrichPresetItems` joins preset items with `scanSkills()`/`scanCommands()`; `loadPresetMembership` loads a JSON-serializable membership map for the explorers). Client components consume enriched data and a `presetFilter` prop. URL state for the explorer filter is synced via `useRouter` + `useSearchParams` from `next/navigation`. Skill/command detail pages read `?preset=N` from `searchParams` and render an optional back link.

**Tech Stack:** Next.js App Router (Server Components + Client Components), React Query (already wired for preset queries), shadcn/ui primitives (`Card`, `Select`, `Badge`, `Button`), Tailwind CSS v4, TypeScript strict mode, `better-sqlite3` (sync) for preset storage. **No test framework** — gate per task is `npm run build` for type-correctness plus targeted browser verification (`npm run dev` at `http://localhost:4317`).

**Reference spec:** [docs/superpowers/specs/2026-05-24-preset-detail-cards-design.md](docs/superpowers/specs/2026-05-24-preset-detail-cards-design.md).

---

## File map

**New files:**
- `apps/web/lib/preset-query.ts` — `parsePresetId(value)` shared parser.
- `packages/presets/src/enrich.ts` — `enrichPresetItems()` + `EnrichedPresetItem` type.
- `packages/presets/src/membership.ts` — `loadPresetMembership()` + `PresetMembership` type.
- `apps/web/components/presets/preset-item-card.tsx` — card component (present + missing variants).

**Modified files:**
- `apps/web/lib/i18n/dictionaries/en.ts` — add 6 new keys.
- `apps/web/lib/i18n/dictionaries/th.ts` — add Thai equivalents.
- `apps/web/app/api/presets/[id]/route.ts` — GET enriches items before returning.
- `apps/web/app/presets/[id]/page.tsx` — enrich before hydrating React Query cache.
- `apps/web/components/presets/use-preset-queries.ts` — `usePreset` return type narrows to `EnrichedPresetItem[]`.
- `apps/web/components/presets/preset-detail-client.tsx` — replace local `ItemList` with `PresetItemGrid` of `PresetItemCard`s.
- `apps/web/app/page.tsx` — accept `searchParams`, call `loadPresetMembership()`, pass `presetFilter` prop.
- `apps/web/app/commands/page.tsx` — same.
- `apps/web/components/skills-explorer.tsx` — Preset `<Select>`, URL sync, membership filter.
- `apps/web/components/commands-explorer.tsx` — same.
- `apps/web/app/skills/[id]/page.tsx` — read `?preset`, render back link.
- `apps/web/app/commands/[id]/page.tsx` — same.

---

## Task 1: Add i18n keys (en + th)

**Files:**
- Modify: `apps/web/lib/i18n/dictionaries/en.ts:373-416` (explorer namespace) and `:592-634` (detail namespace) and `:162-173` (presetsPage.detail namespace)
- Modify: `apps/web/lib/i18n/dictionaries/th.ts` (same namespaces)

The English dictionary is the canonical shape (`Dictionary = typeof en`). Thai must match exactly or TypeScript fails. Note: `presetsPage.detail.missingBadge` already exists — reuse it, do not duplicate.

- [ ] **Step 1: Add 3 keys to `presetsPage.detail` in `en.ts`**

In `apps/web/lib/i18n/dictionaries/en.ts`, inside the existing `presetsPage.detail` object (which starts at line 162), add after the existing `missingBadge: "missing on disk",` line:

```ts
        detail: {
            edit: "Edit",
            activate: "Activate",
            archive: "Archive",
            unarchive: "Unarchive",
            addItem: "Add from catalog",
            skills: "Skills",
            commands: "Commands",
            recentActivations: "Recent activations",
            archivedBanner: "This preset is archived — read-only. Unarchive to edit or activate.",
            missingBadge: "missing on disk",
            removeItem: "Remove from preset",
            openSkill: "Open skill",
            openCommand: "Open command",
        },
```

- [ ] **Step 2: Add 2 keys to `explorer` in `en.ts`**

In `apps/web/lib/i18n/dictionaries/en.ts`, inside the `explorer` object (line 373-416), add at the end (right before the closing `},`):

```ts
        filterPreset: "Filter by preset",
        presetAll: "All presets",
```

- [ ] **Step 3: Add 1 key to `detail` in `en.ts`**

In `apps/web/lib/i18n/dictionaries/en.ts`, inside the `detail` object (line 592-634), add at the end (right before the closing `},`):

```ts
        backToPreset: (name: string) => `Back to preset "${name}" in explorer`,
```

- [ ] **Step 4: Mirror the new keys in `th.ts`**

In `apps/web/lib/i18n/dictionaries/th.ts`, add the same three keys to `presetsPage.detail`:

```ts
            removeItem: "ลบออกจาก preset",
            openSkill: "เปิด skill",
            openCommand: "เปิด command",
```

To `explorer`:

```ts
        filterPreset: "กรองตาม preset",
        presetAll: "ทุก preset",
```

To `detail`:

```ts
        backToPreset: (name) => `กลับไปยัง preset "${name}" ใน explorer`,
```

(Thai dictionary omits parameter type annotations on functions — match the existing style, e.g. line 52: `page: (current, total) => …`.)

- [ ] **Step 5: Type-check**

Run from repo root:

```bash
npm run build
```

Expected: build completes with no TypeScript errors. If Thai dictionary is missing a key, TypeScript fails with "Property 'X' is missing in type 'Dictionary'". Fix by adding the missing key.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/i18n/dictionaries/en.ts apps/web/lib/i18n/dictionaries/th.ts
git commit -m "$(cat <<'EOF'
i18n: add preset card + explorer filter strings

Adds six dictionary entries used by the new preset detail cards and the
Preset filter on the Skills/Commands explorers: presetsPage.detail.{removeItem,
openSkill, openCommand}, explorer.{filterPreset, presetAll}, and
detail.backToPreset(name).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `parsePresetId` shared helper

**Files:**
- Create: `apps/web/lib/preset-query.ts`

Tiny shared parser so SSR pages and the explorer client agree on what `?preset=` accepts.

- [ ] **Step 1: Create the file**

Create `apps/web/lib/preset-query.ts`:

```ts
/**
 * Parse the `?preset=` query value used to filter explorers and to carry
 * preset context across the preset detail → skill/command detail navigation.
 * Returns null for empty, non-string, non-integer, or non-positive input.
 */
export function parsePresetId(value: string | string[] | undefined): number | null {
    if (typeof value !== "string" || value.length === 0) return null;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build completes cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/preset-query.ts
git commit -m "$(cat <<'EOF'
feat(web): add parsePresetId shared query parser

Single source of truth for parsing ?preset= values, used next by the
explorer pages, the explorer clients, and the skill/command detail pages.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `enrichPresetItems` helper

**Files:**
- Create: `packages/presets/src/enrich.ts`

Joins raw `PresetItem[]` against the personal-scope skill and command scans. Imported by both the preset detail SSR page and its API route.

- [ ] **Step 1: Create the file**

Create `packages/presets/src/enrich.ts`:

```ts
// packages/presets/src/enrich.ts
import { scanSkills } from "@lector/core/scanner";
import { scanCommands } from "@lector/core/command-scanner";
import type { Skill, Command } from "@lector/core/types";
import type { PresetItem } from "./types";

export type EnrichedPresetItem =
    | {
          kind: "skill";
          identifier: string;
          addedAt: string;
          missing: false;
          skill: Skill;
      }
    | {
          kind: "command";
          identifier: string;
          addedAt: string;
          missing: false;
          command: Command;
      }
    | {
          kind: "skill" | "command";
          identifier: string;
          addedAt: string;
          missing: true;
      };

export async function enrichPresetItems(
    items: PresetItem[],
): Promise<EnrichedPresetItem[]> {
    const [skillsResult, commandsResult] = await Promise.all([
        safeScanSkills(),
        safeScanCommands(),
    ]);

    const skillByName = new Map<string, Skill>();
    for (const s of skillsResult) {
        if (s.type === "personal") skillByName.set(s.name, s);
    }
    const commandByName = new Map<string, Command>();
    for (const c of commandsResult) {
        if (c.scope === "personal") commandByName.set(c.name, c);
    }

    return items.map((item): EnrichedPresetItem => {
        if (item.kind === "skill") {
            const skill = skillByName.get(item.identifier);
            if (skill) {
                return {
                    kind: "skill",
                    identifier: item.identifier,
                    addedAt: item.addedAt,
                    missing: false,
                    skill,
                };
            }
        } else {
            const command = commandByName.get(item.identifier);
            if (command) {
                return {
                    kind: "command",
                    identifier: item.identifier,
                    addedAt: item.addedAt,
                    missing: false,
                    command,
                };
            }
        }
        return {
            kind: item.kind,
            identifier: item.identifier,
            addedAt: item.addedAt,
            missing: true,
        };
    });
}

async function safeScanSkills(): Promise<Skill[]> {
    try {
        return scanSkills().skills;
    } catch {
        return [];
    }
}

async function safeScanCommands(): Promise<Command[]> {
    try {
        return scanCommands().commands;
    } catch {
        return [];
    }
}
```

Note: `scanSkills()` and `scanCommands()` are synchronous in this codebase (in-process 8-second cache), but wrapped in `async` helpers so a future signature change doesn't require touching every caller. The `Promise.all` is preserved for clarity even though both scans run sync today.

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build completes cleanly. If `scanSkills().skills` or `scanCommands().commands` field names are wrong, TypeScript will flag them — verify against `packages/core/src/types.ts` (`ScanResult` / `CommandScanResult`).

- [ ] **Step 3: Commit**

```bash
git add packages/presets/src/enrich.ts
git commit -m "$(cat <<'EOF'
feat(presets): add enrichPresetItems join helper

Server-only helper that joins raw PresetItem[] against scanSkills() and
scanCommands() personal-scope results, returning EnrichedPresetItem[].
Missing items are flagged with missing: true so the UI can render a
distinct card variant.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create `loadPresetMembership` helper

**Files:**
- Create: `packages/presets/src/membership.ts`

Loads non-archived presets and a JSON-safe membership record (`{ [presetId]: ["kind::identifier", …] }`) used by the explorer filter.

- [ ] **Step 1: Create the file**

Create `packages/presets/src/membership.ts`:

```ts
// packages/presets/src/membership.ts
import { openDb } from "./db";
import { listPresets } from "./presets";
import type { Preset, ItemKind } from "./types";

/**
 * Serializable shape that crosses the React Server Components boundary as JSON.
 * itemsByPreset is a plain object keyed by stringified preset id; each value
 * is an array of "kind::identifier" strings. The explorer client materializes
 * a Map<number, Set<string>> from it for O(1) membership tests.
 */
export type PresetMembership = {
    presets: Preset[];
    itemsByPreset: Record<string, string[]>;
};

type DbRow = { preset_id: number; kind: ItemKind; identifier: string };

export function loadPresetMembership(): PresetMembership {
    try {
        const presets = listPresets({ status: "active" }).sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        const db = openDb();
        const rows = db
            .prepare(
                `SELECT preset_id, kind, identifier FROM preset_items
                 WHERE preset_id IN (SELECT id FROM presets WHERE archived_at IS NULL)`,
            )
            .all() as DbRow[];
        const itemsByPreset: Record<string, string[]> = {};
        for (const r of rows) {
            const key = `${r.kind}::${r.identifier}`;
            const bucket = itemsByPreset[String(r.preset_id)] ?? [];
            bucket.push(key);
            itemsByPreset[String(r.preset_id)] = bucket;
        }
        return { presets, itemsByPreset };
    } catch {
        return { presets: [], itemsByPreset: {} };
    }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build completes cleanly. If `openDb` is not the correct export name, verify by reading `packages/presets/src/db.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/presets/src/membership.ts
git commit -m "$(cat <<'EOF'
feat(presets): add loadPresetMembership helper

Returns a JSON-serializable map from non-archived preset id to the set of
'kind::identifier' keys it contains, used by the Skills and Commands
explorer pages to power the Preset filter dropdown. A single SQL select
replaces N round-trips of listPresetItems.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Enrich items in the `/api/presets/[id]` GET handler

**Files:**
- Modify: `apps/web/app/api/presets/[id]/route.ts` (GET handler at lines 30-41)

So post-mutation refetches from React Query receive the enriched shape that matches the SSR hydration.

- [ ] **Step 1: Update the import**

Replace the existing import block at the top of `apps/web/app/api/presets/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import {
    getPreset,
    listPresetItems,
    SlugCollisionError,
    updatePreset,
} from "@lector/presets/presets";
import { enrichPresetItems } from "@lector/presets/enrich";
```

- [ ] **Step 2: Update the GET handler**

Replace the GET handler body (lines 30-41) with the enriched version:

```ts
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const items = listPresetItems(id);
    const enriched = await enrichPresetItems(items);
    return NextResponse.json({ preset, items: enriched });
}
```

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Expected: build completes cleanly. Note `usePreset` consumers will still typecheck against the old `PresetItem[]` until Task 6 — that's intentional and they will be updated next.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/presets/[id]/route.ts
git commit -m "$(cat <<'EOF'
feat(web): enrich items in the preset GET API

The /api/presets/[id] handler now returns EnrichedPresetItem[] instead of
bare PresetItem[], so React Query refetches after add/remove mutations
hydrate the new card UI without extra round trips.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Hydrate enriched items at SSR and narrow the `usePreset` type

**Files:**
- Modify: `apps/web/app/presets/[id]/page.tsx`
- Modify: `apps/web/components/presets/use-preset-queries.ts`

Match the SSR hydration shape to the API response so the React Query cache stays consistent across the first paint and every subsequent invalidation.

- [ ] **Step 1: Update the preset detail page**

Replace `apps/web/app/presets/[id]/page.tsx` with:

```tsx
// apps/web/app/presets/[id]/page.tsx
import { notFound } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getPreset, listPresetItems } from "@lector/presets/presets";
import { enrichPresetItems } from "@lector/presets/enrich";
import { PresetDetailClient } from "@/components/presets/preset-detail-client";
import { qk } from "@/components/presets/preset-query-keys";

export const dynamic = "force-dynamic";

export default async function PresetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return notFound();
    const preset = getPreset(id);
    if (!preset) return notFound();
    const items = listPresetItems(id);
    const enriched = await enrichPresetItems(items);

    const qc = new QueryClient();
    qc.setQueryData(qk.preset(id), { preset, items: enriched });

    return (
        <div className="space-y-6 px-5 py-0">
            <HydrationBoundary state={dehydrate(qc)}>
                <PresetDetailClient presetId={id} />
            </HydrationBoundary>
        </div>
    );
}
```

- [ ] **Step 2: Narrow the usePreset return type**

In `apps/web/components/presets/use-preset-queries.ts`, update the import block at the top and the `usePreset` query:

Add to the existing import from `@lector/presets/types` so the file imports `PresetItem` along with the rest (or remove `PresetItem` from imports if no longer used after this change). Then add a new import:

```ts
import type { EnrichedPresetItem } from "@lector/presets/enrich";
```

Change the `usePreset` body (currently lines 45-51) to:

```ts
export function usePreset(id: number) {
    return useQuery({
        queryKey: qk.preset(id),
        queryFn: () =>
            jsonFetch<{ preset: Preset; items: EnrichedPresetItem[] }>(
                `/api/presets/${id}`,
            ),
    });
}
```

- [ ] **Step 3: Update the (temporarily broken) consumer**

`apps/web/components/presets/preset-detail-client.tsx` filters items by `kind` (lines 41-42), which still works against `EnrichedPresetItem` because both variants share `kind`. The `ItemList` body uses only `item.identifier` and `item.kind`, both still present. So the type narrowing should be source-compatible until Task 8 replaces `ItemList` entirely.

If TypeScript flags `removeItem.mutate({ presetId, kind, identifier: id })` or similar — both fields exist on every variant of `EnrichedPresetItem`, so no change should be needed.

- [ ] **Step 4: Type-check**

```bash
npm run build
```

Expected: build completes cleanly. Open `/presets/{id}` in the dev server (`npm run dev`, then navigate to any existing preset) and confirm the existing list still renders (we haven't replaced the UI yet — that's Task 8).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/presets/[id]/page.tsx apps/web/components/presets/use-preset-queries.ts
git commit -m "$(cat <<'EOF'
feat(web): hydrate enriched preset items on SSR

usePreset now expects EnrichedPresetItem[] from both the SSR hydration
boundary and the API refetch path. UI consumers still render the bare
identifier; the next commit swaps in the card grid.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create the `PresetItemCard` component

**Files:**
- Create: `apps/web/components/presets/preset-item-card.tsx`

The visual unit — handles the present and missing variants, the `?preset=` query on the link, and the inline remove (`×`) that does not trigger navigation.

- [ ] **Step 1: Create the file**

Create `apps/web/components/presets/preset-item-card.tsx`:

```tsx
// apps/web/components/presets/preset-item-card.tsx
"use client";

import Link from "next/link";
import { Package, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillTypeDot } from "@/components/skill-type-dot";
import { SourceBadge } from "@/components/source-badge";
import { ModelInvocationBadge } from "@/components/model-invocation-badge";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { EnrichedPresetItem } from "@lector/presets/enrich";

type Props = {
    item: EnrichedPresetItem;
    presetId: number;
    onRemove: () => void;
    disabled: boolean;
};

export function PresetItemCard({ item, presetId, onRemove, disabled }: Props) {
    const t = useT();

    if (item.missing) {
        return (
            <Card className="rounded-md shadow-none opacity-60 border-dashed">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                            {item.kind}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            {t.presetsPage.detail.missingBadge}
                        </Badge>
                    </div>
                    {!disabled && (
                        <RemoveButton
                            onRemove={onRemove}
                            label={t.presetsPage.detail.removeItem}
                        />
                    )}
                </CardHeader>
                <CardContent className="pt-0 text-sm">
                    <code className="font-mono">{item.identifier}</code>
                </CardContent>
            </Card>
        );
    }

    const href =
        item.kind === "skill"
            ? `/skills/${item.skill.id}?preset=${presetId}`
            : `/commands/${item.command.id}?preset=${presetId}`;
    const srLabel =
        item.kind === "skill"
            ? t.presetsPage.detail.openSkill
            : t.presetsPage.detail.openCommand;
    const name = item.kind === "skill" ? item.skill.name : `/${item.command.name}`;
    const description =
        item.kind === "skill" ? item.skill.description : item.command.description;
    const type = item.kind === "skill" ? item.skill.type : item.command.scope;
    const disableModelInvocation =
        item.kind === "skill"
            ? item.skill.disableModelInvocation
            : item.command.disableModelInvocation;
    const source = item.kind === "skill" ? item.skill.source : item.command.source;
    const plugin = item.kind === "skill" ? item.skill.plugin : item.command.plugin;
    const lastUpdated =
        item.kind === "skill" ? item.skill.lastUpdated : item.command.lastUpdated;

    return (
        <Link href={href} className="block">
            <span className="sr-only">{srLabel}</span>
            <Card className="rounded-md shadow-none transition-colors hover:bg-accent/40">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <SkillTypeDot type={type} />
                        <ModelInvocationBadge disabled={disableModelInvocation} />
                    </div>
                    {!disabled && (
                        <RemoveButton
                            onRemove={onRemove}
                            label={t.presetsPage.detail.removeItem}
                        />
                    )}
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                    <p className="text-sm font-medium">{name}</p>
                    {description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                        {plugin && source.kind === "local" ? (
                            <span className="inline-flex items-center gap-1">
                                <Package className="h-3 w-3 shrink-0 text-purple-600" />
                                <span className="truncate">{plugin.name}</span>
                            </span>
                        ) : (
                            <SourceBadge source={source} />
                        )}
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{formatDate(lastUpdated)}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function RemoveButton({
    onRemove,
    label,
}: {
    onRemove: () => void;
    label: string;
}) {
    return (
        <Button
            size="icon-xs"
            variant="ghost"
            aria-label={label}
            title={label}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
            }}
        >
            <X className="h-3.5 w-3.5" />
        </Button>
    );
}
```

If `Button` does not accept the `icon-xs` size, fall back to `size="icon"` (look at `apps/web/components/ui/button.tsx` to confirm available sizes; the explorer uses both, but matching the existing `apps/web/app/skills/[id]/page.tsx`'s `CopyButton size="icon-xs"` pattern is preferred if available).

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build completes cleanly. If `SkillTypeDot` rejects the `command.scope` value (`SkillType` vs `CommandScope` mismatch), cast at the call site: `type={type as SkillType}` — this matches the existing pattern in `apps/web/components/commands-explorer.tsx:261` where `c.scope` is passed to `SkillTypeDot`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/presets/preset-item-card.tsx
git commit -m "$(cat <<'EOF'
feat(web): add PresetItemCard component

Renders a single preset item as an explorer-style card: type dot,
invocation badge, name, two-line description, source/plugin, and last
updated. Whole-card link to /skills/{id}?preset=N (or /commands), with
a remove button that does not trigger navigation. Missing items get a
muted dashed-border variant.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Replace `ItemList` with `PresetItemGrid` in the preset detail client

**Files:**
- Modify: `apps/web/components/presets/preset-detail-client.tsx` (replace lines 153-177 and update consumers at lines 103-107, 112-116)

Switches the preset detail UI from `<ul>` rows to a responsive card grid.

- [ ] **Step 1: Update imports**

At the top of `apps/web/components/presets/preset-detail-client.tsx`, add the new imports below the existing ones:

```ts
import { PresetItemCard } from "./preset-item-card";
import type { EnrichedPresetItem } from "@lector/presets/enrich";
```

The existing `import type { ApplyResult, ItemKind } from "@lector/presets/types";` stays.

- [ ] **Step 2: Replace the `ItemList` function**

Delete the existing `ItemList` function at the bottom of the file (lines 153-177) and replace it with `PresetItemGrid`:

```tsx
function PresetItemGrid({
    items,
    presetId,
    onRemove,
    disabled,
}: {
    items: EnrichedPresetItem[];
    presetId: number;
    onRemove: (kind: ItemKind, identifier: string) => void;
    disabled: boolean;
}) {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">None yet.</p>;
    }
    return (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {items.map((i) => (
                <PresetItemCard
                    key={`${i.kind}::${i.identifier}`}
                    item={i}
                    presetId={presetId}
                    onRemove={() => onRemove(i.kind, i.identifier)}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Update the call sites**

In the same file, replace the two `<ItemList … />` usages (currently around lines 103-107 and 112-116) with `<PresetItemGrid … />` — both calls gain the `presetId` prop:

```tsx
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Skills ({skills.length})</h2>
                    {!preset.archivedAt ? (
                        <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setPickerOpen(true)}>
                            + Add from catalog
                        </Button>
                    ) : null}
                </div>
                <PresetItemGrid
                    items={skills}
                    presetId={presetId}
                    onRemove={(kind, id) => removeItem.mutate({ presetId, kind, identifier: id })}
                    disabled={!!preset.archivedAt}
                />
            </section>

            <section className="space-y-2">
                <h2 className="text-base font-semibold">Commands ({commands.length})</h2>
                <PresetItemGrid
                    items={commands}
                    presetId={presetId}
                    onRemove={(kind, id) => removeItem.mutate({ presetId, kind, identifier: id })}
                    disabled={!!preset.archivedAt}
                />
            </section>
```

Also adjust the `skills` / `commands` filter to narrow the type for downstream typing. The existing two lines:

```ts
    const skills = items.filter((i) => i.kind === "skill");
    const commands = items.filter((i) => i.kind === "command");
```

become:

```ts
    const skills = items.filter((i): i is EnrichedPresetItem => i.kind === "skill");
    const commands = items.filter((i): i is EnrichedPresetItem => i.kind === "command");
```

(The type predicates preserve `EnrichedPresetItem[]` — they only narrow `kind`, which still lives on every variant.)

- [ ] **Step 4: Type-check**

```bash
npm run build
```

Expected: build completes cleanly.

- [ ] **Step 5: Browser verification**

Start the dev server if it isn't running:

```bash
npm run dev
```

Open `http://localhost:4317/presets`, click into any preset that has at least one skill and one command. Confirm:

- Cards render in a grid (1 column on mobile, 2 on `md`, 3 on `xl`).
- Each card shows type dot, invocation badge, name, 2-line description, source/plugin, and updated date.
- Click a card → navigates to `/skills/{id}?preset=N` or `/commands/{id}?preset=N` (check the URL bar).
- Click the `×` on a card → item is removed without triggering navigation; grid re-renders.
- Archive the preset → `×` buttons are hidden; cards remain navigable.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/presets/preset-detail-client.tsx
git commit -m "$(cat <<'EOF'
feat(web): switch preset detail items to card grid

Replaces the bare-identifier list with a responsive grid of
PresetItemCards. Card links carry ?preset={id} so the destination
detail pages can render a back link in a later commit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Skills explorer — read membership and add Preset filter

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/skills-explorer.tsx`

The dashboard (`/`) is the Skills explorer page; this task adds the SSR membership load and the client-side filter UI + URL sync.

- [ ] **Step 1: Update the dashboard SSR page**

Replace `apps/web/app/page.tsx` with:

```tsx
import { AlertTriangle } from "lucide-react";
import { StatCards } from "@/components/stat-cards";
import { SkillsExplorer } from "@/components/skills-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanSkills } from "@lector/core/scanner";
import { loadPresetMembership } from "@lector/presets/membership";
import { parsePresetId } from "@/lib/preset-query";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ claudeHome, t }: { claudeHome: string; t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.dashboard.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.dashboard.empty1}
                <InlineCode>{claudeHome}</InlineCode>
                {t.dashboard.empty2}
                <InlineCode>extraRoots</InlineCode>
                {t.dashboard.empty3}
                <InlineCode>skills-lector.config.json</InlineCode>
                {t.dashboard.empty4}
            </p>
        </div>
    );
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ preset?: string }>;
}) {
    const { t } = await getServerI18n();
    const { preset: presetParam } = await searchParams;
    const initialPresetId = parsePresetId(presetParam);
    const result = scanSkills();
    const membership = loadPresetMembership();

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t.dashboard.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.dashboard.subtitle}
                    </p>
                </div>
                <p className="tabular-nums text-xs text-muted-foreground">
                    {t.scan.line(
                        formatDate(result.scannedAt),
                        result.durationMs,
                        result.platform,
                    )}
                </p>
            </div>

            <StatCards result={result} />

            {result.skills.length === 0 ? (
                <EmptyState claudeHome={result.claudeHome} t={t} />
            ) : (
                <SkillsExplorer
                    skills={result.skills}
                    presetFilter={{
                        presets: membership.presets,
                        initialPresetId,
                        itemsByPreset: membership.itemsByPreset,
                    }}
                />
            )}

            {result.errors.length > 0 && (
                <details className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs">
                    <summary className="flex cursor-pointer items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t.scan.errors(result.errors.length)}
                    </summary>
                    <ul className="mt-2 space-y-1 font-mono text-muted-foreground">
                        {result.errors.slice(0, 30).map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Update the SkillsExplorer imports**

In `apps/web/components/skills-explorer.tsx`, change the imports at the top:

Replace the `useRouter` line (currently `import { useRouter } from "next/navigation";`) with:

```ts
import { useRouter, useSearchParams } from "next/navigation";
```

Add `Layers` to the lucide-react import block (around lines 6-14):

```ts
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Folder,
    Layers,
    Package,
    Search,
    Sparkles,
} from "lucide-react";
```

Add this at the bottom of the imports block:

```ts
import type { Preset } from "@lector/presets/types";
```

- [ ] **Step 3: Update the SkillsExplorer props and state**

Update the function signature and add the new state. Replace the existing function declaration plus the initial hook calls (currently lines 51-60) with:

```tsx
type PresetFilter = {
    presets: Preset[];
    initialPresetId: number | null;
    itemsByPreset: Record<string, string[]>;
};

export function SkillsExplorer({
    skills,
    presetFilter,
}: {
    skills: Skill[];
    presetFilter?: PresetFilter;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useT();
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [invocationFilter, setInvocationFilter] =
        useState<InvocationFilter>("all");
    const [presetId, setPresetId] = useState<number | null>(
        presetFilter?.initialPresetId ?? null,
    );
    const [sort, setSort] = useState<SortKey>("updated");
    const [page, setPage] = useState(1);

    const membership = useMemo(() => {
        const map = new Map<number, Set<string>>();
        if (!presetFilter) return map;
        for (const [pid, keys] of Object.entries(presetFilter.itemsByPreset)) {
            map.set(Number(pid), new Set(keys));
        }
        return map;
    }, [presetFilter]);
```

- [ ] **Step 4: Extend the filter logic**

In the same file, find the `filtered` memo (currently lines 80-104) and add the preset check inside the `.filter()` callback, between the invocation filter and the search filter. The complete updated memo:

```tsx
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = skills.filter((s) => {
            if (typeFilter !== "all" && s.type !== typeFilter) return false;
            if (projectFilter !== "all" && s.project?.name !== projectFilter)
                return false;
            if (invocationFilter === "model" && s.disableModelInvocation)
                return false;
            if (invocationFilter === "slash-only" && !s.disableModelInvocation)
                return false;
            if (presetId != null) {
                const set = membership.get(presetId);
                if (!set) return false;
                if (!set.has(`skill::${s.name}`)) return false;
            }
            if (!q) return true;
            return (
                s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q) ||
                (s.plugin?.name.toLowerCase().includes(q) ?? false) ||
                s.source.label.toLowerCase().includes(q)
            );
        });
        return list.sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            if (sort === "usage")
                return (b.usage?.usageCount ?? 0) - (a.usage?.usageCount ?? 0);
            return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
        });
    }, [skills, query, typeFilter, projectFilter, invocationFilter, presetId, membership, sort]);
```

- [ ] **Step 5: Add the Preset Select to the filter row**

In the same file, find the filter row that contains the Sort `<Select>` (the last `<Select>` before the closing `</div>` of the filter row, currently lines 205-221). Insert this new `<Select>` immediately before the Sort `<Select>`:

```tsx
                {presetFilter && presetFilter.presets.length > 0 && (
                    <Select
                        value={presetId == null ? "all" : String(presetId)}
                        onValueChange={(v) => {
                            const next = v === "all" ? null : Number(v);
                            setPresetId(next);
                            setPage(1);
                            const params = new URLSearchParams(searchParams.toString());
                            if (next == null) params.delete("preset");
                            else params.set("preset", String(next));
                            const qs = params.toString();
                            router.replace(qs ? `?${qs}` : "?", { scroll: false });
                        }}
                    >
                        <SelectTrigger
                            className="gap-1.5 lg:w-[180px] rounded-sm"
                            aria-label={t.explorer.filterPreset}
                        >
                            <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.explorer.presetAll}</SelectItem>
                            {presetFilter.presets.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
```

- [ ] **Step 6: Type-check**

```bash
npm run build
```

Expected: build completes cleanly. If the `Suspense` requirement of `useSearchParams` flags an error, the existing client component is already inside a `"use client"` boundary plus the page is `force-dynamic`, so it should be fine; if not, wrap the explorer's children in `<Suspense>` at the SSR page level.

- [ ] **Step 7: Browser verification**

In `npm run dev`, open `http://localhost:4317`. Confirm:

- The Preset filter dropdown appears between the project filter and the sort dropdown (or as the rightmost filter if no projects exist).
- Selecting a preset filters the table to that preset's skills.
- The URL gains `?preset=N` when a preset is selected and loses it when set back to "All presets".
- Switching tabs (All / Personal / Plugin / Project / Local) still works; intersecting with a preset filter narrows further.
- Visit `http://localhost:4317/?preset=99999` → dropdown shows "All presets" and the list is unfiltered.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/skills-explorer.tsx
git commit -m "$(cat <<'EOF'
feat(web): add Preset filter to the Skills explorer

Loads non-archived preset membership server-side and passes it to
SkillsExplorer. The new dropdown sits beside the existing filters, syncs
its selection to ?preset=N in the URL, and intersects with the type /
project / invocation filters already present.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Commands explorer — add Preset filter

**Files:**
- Modify: `apps/web/app/commands/page.tsx`
- Modify: `apps/web/components/commands-explorer.tsx`

Mirror of Task 9 for commands. Only difference: the membership key is `command::${name}` instead of `skill::${name}`.

- [ ] **Step 1: Update the commands SSR page**

Replace `apps/web/app/commands/page.tsx` with:

```tsx
import { AlertTriangle } from "lucide-react";
import { CommandStatCards } from "@/components/command-stat-cards";
import { CommandsExplorer } from "@/components/commands-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanCommands } from "@lector/core/command-scanner";
import { loadPresetMembership } from "@lector/presets/membership";
import { parsePresetId } from "@/lib/preset-query";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ claudeHome, t }: { claudeHome: string; t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.commandsPage.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.commandsPage.empty1}
                <InlineCode>.md</InlineCode>
                {t.commandsPage.empty2}
                <InlineCode>{claudeHome}</InlineCode>
                {t.commandsPage.empty3}
                <InlineCode>.claude/commands</InlineCode>
                {t.commandsPage.empty4}
            </p>
        </div>
    );
}

export default async function CommandsPage({
    searchParams,
}: {
    searchParams: Promise<{ preset?: string }>;
}) {
    const { t } = await getServerI18n();
    const { preset: presetParam } = await searchParams;
    const initialPresetId = parsePresetId(presetParam);
    const result = scanCommands();
    const membership = loadPresetMembership();

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t.commandsPage.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.commandsPage.subtitle}
                    </p>
                </div>
                <p className="tabular-nums text-xs text-muted-foreground">
                    {t.scan.line(
                        formatDate(result.scannedAt),
                        result.durationMs,
                        result.platform,
                    )}
                </p>
            </div>

            <CommandStatCards result={result} />

            {result.commands.length === 0 ? (
                <EmptyState claudeHome={result.claudeHome} t={t} />
            ) : (
                <CommandsExplorer
                    commands={result.commands}
                    presetFilter={{
                        presets: membership.presets,
                        initialPresetId,
                        itemsByPreset: membership.itemsByPreset,
                    }}
                />
            )}

            {result.errors.length > 0 && (
                <details className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs">
                    <summary className="flex cursor-pointer items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t.scan.errors(result.errors.length)}
                    </summary>
                    <ul className="mt-2 space-y-1 font-mono text-muted-foreground">
                        {result.errors.slice(0, 30).map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Update CommandsExplorer imports**

In `apps/web/components/commands-explorer.tsx`, make the same import changes as in Task 9 Step 2:

Replace `import { useRouter } from "next/navigation";` with:

```ts
import { useRouter, useSearchParams } from "next/navigation";
```

Add `Layers` to the lucide-react import block:

```ts
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Folder,
    Layers,
    Package,
    Search,
    Sparkles,
} from "lucide-react";
```

Add at the bottom of the imports block:

```ts
import type { Preset } from "@lector/presets/types";
```

- [ ] **Step 3: Update the CommandsExplorer signature, state, and membership memo**

Replace the function signature and the initial hook calls (currently lines 51-60) with:

```tsx
type PresetFilter = {
    presets: Preset[];
    initialPresetId: number | null;
    itemsByPreset: Record<string, string[]>;
};

export function CommandsExplorer({
    commands,
    presetFilter,
}: {
    commands: Command[];
    presetFilter?: PresetFilter;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useT();
    const [query, setQuery] = useState("");
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [invocationFilter, setInvocationFilter] =
        useState<InvocationFilter>("all");
    const [presetId, setPresetId] = useState<number | null>(
        presetFilter?.initialPresetId ?? null,
    );
    const [sort, setSort] = useState<SortKey>("updated");
    const [page, setPage] = useState(1);

    const membership = useMemo(() => {
        const map = new Map<number, Set<string>>();
        if (!presetFilter) return map;
        for (const [pid, keys] of Object.entries(presetFilter.itemsByPreset)) {
            map.set(Number(pid), new Set(keys));
        }
        return map;
    }, [presetFilter]);
```

- [ ] **Step 4: Extend the filter logic**

Update the `filtered` memo (currently lines 79-101) — add the preset check between invocation and search. The complete updated memo:

```tsx
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = commands.filter((c) => {
            if (scopeFilter !== "all" && c.scope !== scopeFilter) return false;
            if (projectFilter !== "all" && c.project?.name !== projectFilter)
                return false;
            if (invocationFilter === "model" && c.disableModelInvocation)
                return false;
            if (invocationFilter === "slash-only" && !c.disableModelInvocation)
                return false;
            if (presetId != null) {
                const set = membership.get(presetId);
                if (!set) return false;
                if (!set.has(`command::${c.name}`)) return false;
            }
            if (!q) return true;
            return (
                c.name.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                (c.plugin?.name.toLowerCase().includes(q) ?? false) ||
                c.source.label.toLowerCase().includes(q)
            );
        });
        return list.sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
        });
    }, [commands, query, scopeFilter, projectFilter, invocationFilter, presetId, membership, sort]);
```

- [ ] **Step 5: Add the Preset Select**

Same as Task 9 Step 5 — insert the Preset `<Select>` immediately before the Sort `<Select>` (currently around line 202-217):

```tsx
                {presetFilter && presetFilter.presets.length > 0 && (
                    <Select
                        value={presetId == null ? "all" : String(presetId)}
                        onValueChange={(v) => {
                            const next = v === "all" ? null : Number(v);
                            setPresetId(next);
                            setPage(1);
                            const params = new URLSearchParams(searchParams.toString());
                            if (next == null) params.delete("preset");
                            else params.set("preset", String(next));
                            const qs = params.toString();
                            router.replace(qs ? `?${qs}` : "?", { scroll: false });
                        }}
                    >
                        <SelectTrigger
                            className="gap-1.5 lg:w-[180px] rounded-sm"
                            aria-label={t.explorer.filterPreset}
                        >
                            <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.explorer.presetAll}</SelectItem>
                            {presetFilter.presets.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
```

- [ ] **Step 6: Type-check**

```bash
npm run build
```

Expected: build completes cleanly.

- [ ] **Step 7: Browser verification**

In `npm run dev`, open `http://localhost:4317/commands`. Confirm:

- Preset dropdown appears with the correct presets.
- Selecting a preset filters the command list to that preset's commands.
- URL syncs to `?preset=N` and back to bare `/commands` when "All presets" is selected.
- `http://localhost:4317/commands?preset=99999` falls back to unfiltered with no error.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/commands/page.tsx apps/web/components/commands-explorer.tsx
git commit -m "$(cat <<'EOF'
feat(web): add Preset filter to the Commands explorer

Mirror of the Skills explorer change — Preset dropdown driven by the
same loadPresetMembership() helper, URL-synced via ?preset=N, and
intersecting with the scope / project / invocation filters.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Skill detail page — back link

**Files:**
- Modify: `apps/web/app/skills/[id]/page.tsx`

When the user lands on a skill detail page via a preset card (URL has `?preset=N`), show a small back link above the title pointing to the filtered explorer.

- [ ] **Step 1: Update imports**

At the top of `apps/web/app/skills/[id]/page.tsx`, add to the existing lucide-react import:

```ts
import { ChevronLeft, FileText, Package, Workflow } from "lucide-react";
```

Add a Next.js Link import and the new helpers below the existing imports:

```ts
import Link from "next/link";
import { getPreset } from "@lector/presets/presets";
import { parsePresetId } from "@/lib/preset-query";
```

- [ ] **Step 2: Update the page signature and add preset lookup**

Replace the existing function signature (currently lines 44-52) with the wider version that also accepts `searchParams`:

```tsx
export default async function SkillDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ preset?: string }>;
}) {
    const { id } = await params;
    const { preset: presetParam } = await searchParams;
    const { t, locale } = await getServerI18n();
    const skill = getSkillById(id);
    if (!skill) notFound();

    const presetId = parsePresetId(presetParam);
    const preset = presetId != null ? getPreset(presetId) : null;
```

(The rest of the function body — `parseSkillMd`, `extractPipeline`, etc. — stays unchanged.)

- [ ] **Step 3: Render the back link**

Find the existing title block (currently lines 63-72, the outer `<div className="space-y-4">` containing `<h1>`). Insert the back link immediately inside the outer `<div className="space-y-4">`, just before the existing `<div className="space-y-3">` block:

```tsx
        <div className="space-y-4">
            {preset && (
                <Link
                    href={`/?preset=${preset.id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t.detail.backToPreset(preset.name)}
                </Link>
            )}
            <div className="space-y-3">
                ...
```

Note: the Skills explorer lives at `/`, not `/skills` — that's why the link is `/?preset=N`.

- [ ] **Step 4: Type-check**

```bash
npm run build
```

Expected: build completes cleanly.

- [ ] **Step 5: Browser verification**

In `npm run dev`, navigate `Presets → click any preset → click a skill card`. Confirm:

- The URL contains `?preset=N`.
- A "← Back to preset {name} in explorer" link appears above the skill title.
- Clicking it lands on `/?preset=N` with the explorer's Preset dropdown showing that preset name.
- Visit `/skills/<id>` directly (no `?preset=`) → no back link rendered.
- Visit `/skills/<id>?preset=99999` (non-existent) → no back link rendered, page renders cleanly.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/skills/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): add 'Back to preset' link on skill detail

When a skill is opened from a preset card the URL carries ?preset=N;
render a small back link above the title that returns to the explorer
with the Preset filter pre-applied. No link is shown for direct visits
or unknown preset ids.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Command detail page — back link

**Files:**
- Modify: `apps/web/app/commands/[id]/page.tsx`

Mirror of Task 11 for commands. Link target is `/commands?preset=N`. The page's structure matches the skill detail page (the existing imports start with `import path from "path";` followed by lucide-react and other modules; the body opens with `<div className="space-y-4"><div className="space-y-3"><div className="flex flex-wrap items-center gap-3"><h1>…</h1>…`).

- [ ] **Step 1: Update imports**

In `apps/web/app/commands/[id]/page.tsx`, change the lucide-react import (currently `import { FileText, Package, Workflow } from "lucide-react";`) to:

```ts
import { ChevronLeft, FileText, Package, Workflow } from "lucide-react";
```

Add the new imports below the existing imports (after `import { getServerI18n } from "@/lib/i18n/server";`):

```ts
import Link from "next/link";
import { getPreset } from "@lector/presets/presets";
import { parsePresetId } from "@/lib/preset-query";
```

- [ ] **Step 2: Widen the page signature and add preset lookup**

Replace the existing function head (currently lines 46-54) with:

```tsx
export default async function CommandDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ preset?: string }>;
}) {
    const { id } = await params;
    const { preset: presetParam } = await searchParams;
    const { t, locale } = await getServerI18n();
    const command = getCommandById(id);
    if (!command) notFound();

    const presetId = parsePresetId(presetParam);
    const preset = presetId != null ? getPreset(presetId) : null;
```

(The rest of the function body — `parseCommandMd`, `extractPipeline`, etc. — stays unchanged.)

- [ ] **Step 3: Render the back link**

Find the title block (currently starts at line 67 with `<div className="space-y-4">` wrapping `<div className="space-y-3">`). Insert the back link immediately inside the outer `<div className="space-y-4">`, just before the existing `<div className="space-y-3">`:

```tsx
        <div className="space-y-4">
            {preset && (
                <Link
                    href={`/commands?preset=${preset.id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t.detail.backToPreset(preset.name)}
                </Link>
            )}
            <div className="space-y-3">
                ...
```

Reuses `t.detail.backToPreset` — the same i18n key works for both detail pages.

- [ ] **Step 4: Type-check**

```bash
npm run build
```

Expected: build completes cleanly.

- [ ] **Step 5: Browser verification**

In `npm run dev`, navigate `Presets → click any preset → click a command card`. Confirm:

- URL contains `?preset=N`.
- "← Back to preset {name} in explorer" link appears above the `/command-name` title.
- Clicking it lands on `/commands?preset=N` with the Preset filter pre-applied.
- Direct visit `/commands/<id>` (no `?preset=`) → no back link.
- Visit `/commands/<id>?preset=99999` → no back link, page renders cleanly.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/commands/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): add 'Back to preset' link on command detail

Mirror of the skill detail change — when a command is opened from a
preset card, render a back link above the title that returns to the
Commands explorer with ?preset=N pre-applied.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check from a clean state**

```bash
npm run build
```

Expected: completes cleanly. Any TypeScript or build error is a regression — fix before continuing.

- [ ] **Step 2: Walkthrough — happy path**

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:4317`. Walk the full flow:

1. Navigate to Presets, open a preset with at least one skill and one command.
2. Confirm cards render in a responsive grid (1 / 2 / 3 columns by viewport).
3. Click a skill card → URL ends with `?preset=N`; skill detail page shows the back link.
4. Click the back link → lands on `/?preset=N`; Preset dropdown is set to the preset name; only that preset's skills are listed.
5. Change the Preset dropdown to a different preset → URL updates; list re-filters.
6. Change it back to "All presets" → URL drops the `preset` param; full list returns.
7. Repeat steps 3-6 for a command card (lands on `/commands?preset=N`).

- [ ] **Step 3: Walkthrough — edge cases**

1. Visit `http://localhost:4317/?preset=99999` → dropdown shows "All presets", list is unfiltered.
2. Visit `http://localhost:4317/skills/<id>?preset=99999` → no back link, page renders cleanly.
3. On a preset detail page, remove an item via the `×` → grid re-renders without flicker, URL stays on the preset page.
4. Insert a fake row referencing a nonexistent identifier (e.g. via `sqlite3 ~/.skills-lector/presets.db "INSERT INTO preset_items (preset_id, kind, identifier, added_at) VALUES (1, 'skill', 'does-not-exist', datetime('now'))"`), then reload the preset detail page. Confirm a dashed-border "missing on disk" card renders for that row. Remove it via the `×` afterwards.
5. Archive a preset on the presets index → it disappears from the Preset dropdowns on both explorers.
6. Resize the browser to mobile width → preset detail grid collapses to one column; explorer filter row wraps without overlap.

- [ ] **Step 4: Final commit (only if any fix-ups were needed)**

If the walkthrough surfaced no issues, no extra commit is needed — the work is complete and the plan is done. If a small fix was needed, commit it on its own:

```bash
git add <changed files>
git commit -m "$(cat <<'EOF'
fix(web): <describe the specific fix>

<one-paragraph why>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage check** — every requirement from the spec maps to a task:

- Card with explorer fields (type dot, invocation badge, name, description, source/plugin, updated date) → Task 7.
- Whole-card click → `/skills/{id}?preset={presetId}` (or commands) → Task 7 (link href) + Task 8 (wiring).
- `×` remove button that does not trigger the link → Task 7 (`RemoveButton`).
- Missing item variant → Task 7.
- SSR-coherent enrichment with no flicker → Tasks 3, 5, 6.
- Preset filter on both explorers with URL sync → Tasks 9, 10.
- Skill + Command detail back link → Tasks 11, 12.
- i18n (6 new keys, en + th) → Task 1.
- Verification plan from the spec → Task 13.

**Placeholder scan** — no "TBD", no "TODO", no "implement later". Every step has the actual code or command. Task 12 Step 1 calls out reading the file first (the structure varies slightly from the skill detail page) but provides the full diff to apply.

**Type consistency** — `EnrichedPresetItem`, `PresetMembership`, `PresetFilter` use consistent names across the plan. `loadPresetMembership` returns `itemsByPreset: Record<string, string[]>` consistently in Tasks 4, 9, 10. The `parsePresetId` signature is the same in Tasks 2, 9, 10, 11, 12.

---

## Notes for the implementer

- The codebase has no test framework. The verification gate per task is `npm run build` (type-check) plus targeted browser verification at the end of UI tasks. Do not skip the browser checks for UI tasks — they catch issues TypeScript cannot.
- The repo sits on an exFAT volume; only `npm run build` (which uses Turbopack via the existing scripts) is supported — do not switch to webpack. See `CLAUDE.md` for the `apps/web/scripts/exfat-readlink-fix.cjs` shim if anything goes sideways with `fs.readlink` errors.
- All scanning and presets DB work is synchronous (`better-sqlite3`); do not introduce `async` where it isn't required.
- Commit messages use the project's existing conventional-style prefixes (`feat(web):`, `feat(presets):`, `i18n:`, `fix(web):`). Recent commits in `git log` show the format.
