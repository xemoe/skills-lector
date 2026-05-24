# Preset detail — card view, explorer "Preset" filter, and return-link

**Date:** 2026-05-24
**Status:** Draft (awaiting user review)
**Scope:** `apps/web` preset detail page, Skills + Commands explorer pages, Skill + Command detail pages, plus a small `packages/presets` enrichment / membership helper.

## Motivation

Today, `apps/web/app/presets/[id]/page.tsx` lists the skills and commands in a preset as bare `<li>{identifier}</li>` rows with only a remove (`×`) button. The user wants each item rendered as a **card** carrying the same information shown in the Skills/Commands explorers, and clicking a card should open the existing detail view for that skill or command.

The original card-click plan navigated straight to `/skills/{id}` and dropped all preset context — the user then had no way to get back to "all skills in this preset". The fix is to treat a preset as a **saved filter** on the explorers: each explorer gains a Preset dropdown, and the skill/command detail page carries a return link back to the filtered explorer view when arrived via a preset card.

The preset database only stores `{ kind, identifier }` per item (see `packages/presets/src/types.ts` — `PresetItem`). To render the cards and to filter explorers by preset membership, the UI has to join preset items against the live skill and command scans.

## Goals

- Render each preset item as a card with the same fields the explorers show (type/scope dot, model-invocation badge, name, 2-line description, source/plugin, updated date).
- Whole-card click goes to `/skills/{id}?preset={presetId}` or `/commands/{id}?preset={presetId}`.
- Skill and Command detail pages, when arrived with `?preset=N`, show a "← Back to preset {name} in explorer" link at the top.
- Skills explorer and Commands explorer gain a **Preset** filter dropdown ("All presets" + each non-archived preset). Selecting one filters the list to items in that preset and reflects the choice in the URL (`?preset=N`).
- The `×` remove control stays available on each card without triggering the link.
- Items that no longer exist on disk render as a muted "missing" card so the user can see and clean up stale entries.
- Keep all pages server-rendered, cache-coherent with mutations, and free of post-SSR flicker.

## Non-goals

- No search / filter / sort controls on the preset detail page itself. The explorer (now filterable by preset) is the rich view; the preset detail page stays focused on add / remove / activate / archive.
- No usage count on the card itself. It's available on the skill detail page after click-through.
- No drag-to-reorder. Preset items are stored unordered (`ORDER BY kind, identifier` in `listPresetItems`).
- No change to the preset DB schema, the apply pipeline, or the picker (`preset-item-picker.tsx`).
- The Preset filter is single-select for v1. Multi-preset intersection / union is out of scope.

## Approach

Two cooperating pieces:

1. **`enrichPresetItems()`** — joins raw `PresetItem[]` with the live skill/command scans and returns enriched items for the preset detail page (cards) and its API route (post-mutation refetch).
2. **`loadPresetMembership()`** — returns a `Map<presetId, Set<"kind::identifier">>` so the explorer pages can filter by preset membership without re-deriving the join per render.

Both helpers live in `packages/presets/src/` and reuse the same `scanSkills()` / `scanCommands()` calls. Both are server-only.

### Approach for the data join (preset detail)

**Server-side enrichment shared by the page and the API route.** `enrichPresetItems()` runs in `apps/web/app/presets/[id]/page.tsx` (SSR hydration of the React Query cache) and in `apps/web/app/api/presets/[id]/route.ts` (the post-mutation refetch). This guarantees the SSR hydration shape and the client refetch shape match, so adding or removing an item triggers a clean cache refresh without flicker.

Alternatives considered:

- **B. Client-side join.** Fetch `/api/skills` + `/api/commands` from the client and merge by identifier (mirrors the existing `preset-item-picker.tsx`). Rejected because it ships the entire catalog over the wire just to render the preset's small subset, and produces a visible flicker after SSR.
- **C. New `/api/presets/[id]/items?enrich=1` endpoint.** Rejected as an arbitrary split — the existing `/api/presets/[id]` already returns `{ preset, items }`; enriching its items keeps a single contract.

### Approach for the explorer Preset filter

**Read `?preset=N` server-side, pass `initialPresetId` + `presets[]` + `membership` map into the client component.** Matches the existing pattern from `apps/web/app/analytic/page.tsx`, which reads `searchParams.project` server-side and hands it to the `<AnalyticsExplorer>` as a prop.

The explorer client component keeps the selected preset in local state (initialized from the prop) and pushes URL updates with `router.replace` (using `next/navigation`'s `useRouter`) so the URL stays in sync — that makes the filter shareable and survives the back-link round-trip from the detail page.

## Data model

### New file: `packages/presets/src/enrich.ts`

```ts
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
): Promise<EnrichedPresetItem[]>;
```

Lookup rules:

- `kind: "skill"` matches against `scanSkills()` results where `type === "personal"` and `name === identifier`. Presets only manage personal-scope items today (`preset-item-picker.tsx` filters identically), so non-personal entries cannot exist.
- `kind: "command"` matches against `scanCommands()` results where `scope === "personal"` and `name === identifier`.
- No match → `missing: true`, no `skill`/`command` field.
- The helper calls `scanSkills()` and `scanCommands()` in parallel (`Promise.all`).
- A scan that throws degrades to "all of its kind are missing" — the page still renders, missing cards explain the gap.
- The helper preserves the input array's order (currently `ORDER BY kind, identifier`).

### New file: `packages/presets/src/membership.ts`

```ts
import type { Preset } from "./types";

/**
 * Serializable shape that crosses the RSC props boundary as JSON.
 * itemsByPreset is a plain object keyed by stringified preset id; values are
 * "kind::identifier" strings. The explorer client materializes a Map<Set> from it.
 */
export type PresetMembership = {
  presets: Preset[]; // non-archived only, sorted by name
  itemsByPreset: Record<string, string[]>;
};

export function loadPresetMembership(): PresetMembership;
```

Implementation: `listPresets({ status: "active" })` for the dropdown options, then a single SQL select pulling all `preset_items` (instead of looping `listPresetItems` per preset) to build the record. Order presets by `name` to keep the dropdown stable across renders. Synchronous because `better-sqlite3` is sync; no `await` needed.

The explorer client materializes the fast-lookup form once inside a `useMemo`:

```ts
const membership = useMemo(() => {
  const map = new Map<number, Set<string>>();
  for (const [pid, keys] of Object.entries(presetFilter.itemsByPreset)) {
    map.set(Number(pid), new Set(keys));
  }
  return map;
}, [presetFilter.itemsByPreset]);
```

Why `Record<string, string[]>` and not `Map<number, Set<string>>` on the wire: React Server Components serialize props as JSON, so `Map` and `Set` would throw. Why a `Set` keyed by `"kind::identifier"` (after materialization) and not a nested map: the explorer's filter loop is `O(items × 1)` instead of `O(items × presets)` and the key shape matches the existing convention used in `preset-item-picker.tsx`.

Both helpers live in `packages/presets` because they cross both packages but are pure read functions used by web entry points; placing them next to the rest of the presets domain keeps the web app's `lib/` free of cross-package join logic.

## Preset detail — page and API

### `apps/web/app/api/presets/[id]/route.ts`

The `GET` handler today returns `{ preset, items: PresetItem[] }`. Change it to:

```ts
const items = listPresetItems(id);
const enriched = await enrichPresetItems(items);
return NextResponse.json({ preset, items: enriched });
```

### `apps/web/app/presets/[id]/page.tsx`

Replace the current `qc.setQueryData(qk.preset(id), { preset, items })` with the enriched call so SSR hydration matches the API shape:

```ts
const items = listPresetItems(id);
const enriched = await enrichPresetItems(items);
qc.setQueryData(qk.preset(id), { preset, items: enriched });
```

### `apps/web/components/presets/use-preset-queries.ts`

`usePreset(id)` return type changes from `{ preset: Preset; items: PresetItem[] }` to `{ preset: Preset; items: EnrichedPresetItem[] }`. No call-site signature change beyond the new item shape.

The `useAddPresetItem` / `useRemovePresetItem` mutations already invalidate `qk.preset(presetId)` on success, which now refetches the enriched payload — no further mutation changes needed.

## Preset detail — UI components

### New: `apps/web/components/presets/preset-item-card.tsx`

Props:

```ts
type Props = {
  item: EnrichedPresetItem;
  presetId: number; // appended to the link as ?preset=N
  onRemove: () => void;
  disabled: boolean; // true when the preset is archived — hide ×
};
```

Anatomy (present item):

- Outer: `<Link href={kind === "skill" ? `/skills/${skill.id}?preset=${presetId}` : `/commands/${command.id}?preset=${presetId}`}>` wrapping a shadcn `Card` styled like `preset-card.tsx` (`rounded-md shadow-none hover:bg-accent/40`).
- Header row: `SkillTypeDot` (use `type` for skill, `scope` for command), then `ModelInvocationBadge`, then a right-aligned ghost `×` button. The `×` button calls `e.preventDefault()` + `e.stopPropagation()` so it doesn't trigger the link.
- Body: name in `font-medium` (commands prefixed with `/`); description in `line-clamp-2 text-xs text-muted-foreground`.
- Footer: if `plugin && source.kind === "local"`, show the existing `Package` icon + plugin name (mirrors the explorer's plugin pill); otherwise `<SourceBadge source={source} />`; then a `·` separator; then `formatDate(lastUpdated)` in `tabular-nums`.

Anatomy (missing item):

- Outer: a plain `Card` (no `<Link>`, cursor stays default) with `opacity-60 border-dashed`.
- Header row: shows `kind` in muted text + a small `Badge variant="secondary"` reading "missing" (i18n key `preset.detail.missingBadge`).
- Body: bare `identifier` in `font-mono text-sm`. No description, no source, no date.
- The `×` button still works so the user can clean up.

### Changed: `apps/web/components/presets/preset-detail-client.tsx`

Replace the local `ItemList` component (lines 153-177) with a `PresetItemGrid` that renders `PresetItemCard`s in a responsive grid:

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

Existing section structure (Skills header with `+ Add from catalog`, Commands header, counts in parentheses) is unchanged.

## Skills / Commands explorer — Preset filter

### Server-side (`apps/web/app/page.tsx` and `apps/web/app/commands/page.tsx`)

Both pages currently scan and pass the array into the explorer client. Two changes:

1. Accept `searchParams` like `apps/web/app/analytic/page.tsx` does:
   ```ts
   export default async function HomePage({
     searchParams,
   }: {
     searchParams: Promise<{ preset?: string }>;
   }) {
     const { preset: presetParam } = await searchParams;
     const initialPresetId = parsePresetId(presetParam); // number | null
     // …
   }
   ```
2. Call `loadPresetMembership()` and pass `presets`, `initialPresetId`, and `membership.itemsByPreset` into the explorer.

### Client-side (`apps/web/components/skills-explorer.tsx` and `commands-explorer.tsx`)

Add an optional `presetFilter?: { presets: Preset[]; initialPresetId: number | null; itemsByPreset: Record<string, string[]> }` prop. The client materializes the `Map<number, Set<string>>` inside `useMemo` (see "membership.ts" above).

In the filter row (next to "All projects" / "Sort"):

```tsx
{presetFilter && presetFilter.presets.length > 0 && (
  <Select
    value={presetId == null ? "all" : String(presetId)}
    onValueChange={(v) => {
      const next = v === "all" ? null : Number(v);
      setPresetId(next);
      setPage(1);
      // sync URL
      const params = new URLSearchParams(searchParams.toString());
      if (next == null) params.delete("preset");
      else params.set("preset", String(next));
      router.replace(`?${params.toString()}`, { scroll: false });
    }}
  >
    <SelectTrigger className="gap-1.5 lg:w-[180px] rounded-sm" aria-label={t.explorer.filterPreset}>
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

Use `useRouter()` + `useSearchParams()` from `next/navigation`. Use the `Layers` icon from `lucide-react` to visually distinguish from the project filter (`Folder`) and the invocation filter (`Sparkles`).

Filter logic — extend the existing `filtered` memo (uses the local `membership` Map materialized above):

```ts
if (presetId != null) {
  const set = membership.get(presetId);
  if (!set) return false; // unknown preset id → empty result
  const key = `skill::${s.name}`; // for skills explorer; commands use `command::${c.name}`
  if (!set.has(key)) return false;
}
```

When the Preset filter is set, the existing tabs (`personal`, `plugin`, `project`, `local`) still work; they intersect. If a user selects `?preset=N` and the plugin tab, they see plugin-scope items that are also in preset N — which today is always empty (presets only contain personal-scope), but the intersection is harmless and avoids special-casing.

If `?preset=N` references a non-existent or archived preset, the dropdown falls back to "All presets" silently on first render (initial state is `null` when `presets` does not contain `N`), and the filter does not apply. No error toast — this is the same forgiving behavior as `?project=foo` with an unknown project on the analytic page.

## Skill / Command detail — return link

### `apps/web/app/skills/[id]/page.tsx` and `apps/web/app/commands/[id]/page.tsx`

Both pages currently take `params`; widen to also accept `searchParams`:

```ts
export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { id } = await params;
  const { preset: presetParam } = await searchParams;
  const presetId = parsePresetId(presetParam);
  const preset = presetId != null ? getPreset(presetId) : null;
  // … existing code …
}
```

When `preset` is non-null, render a back link directly above the `<h1>`:

```tsx
{preset && (
  <Link
    href={`/skills?preset=${preset.id}`}
    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
  >
    <ChevronLeft className="h-3.5 w-3.5" />
    {t.detail.backToPreset(preset.name)}
  </Link>
)}
```

(The Commands detail page mirrors this with `/commands?preset=...`.)

If `preset` is null (no query param, or stale id), the link is omitted — the page renders exactly as it does today.

Reuse: `parsePresetId(value: string | undefined): number | null` lives in a small `apps/web/lib/preset-query.ts` so the SSR pages and the explorer client share one parser.

## i18n

Add to `apps/web/lib/i18n/dictionaries/en.ts` and `th.ts`:

| Key | English | Thai |
| --- | --- | --- |
| `preset.detail.missingBadge` | `missing` | `ขาดหาย` |
| `preset.detail.removeItem` | `Remove from preset` | `ลบออกจาก preset` |
| `preset.detail.openSkill` | `Open skill` | `เปิด skill` |
| `preset.detail.openCommand` | `Open command` | `เปิด command` |
| `explorer.filterPreset` | `Filter by preset` | `กรองตาม preset` |
| `explorer.presetAll` | `All presets` | `ทุก preset` |
| `detail.backToPreset(name)` | `Back to preset "${name}" in explorer` | `กลับไปยัง preset "${name}" ใน explorer` |

Existing strings (Skills section header, "None yet.", etc.) are reused unchanged.

## Error handling

- `scanSkills()` and `scanCommands()` already return `errors[]` rather than throwing on per-file failures. `enrichPresetItems()` and `loadPresetMembership()` ignore those errors — they are surfaced by the existing scan diagnostics elsewhere.
- A catastrophic scan failure (thrown exception) is caught in `enrichPresetItems()` and degrades that kind to "all missing"; in `loadPresetMembership()` it degrades to an empty map, so the Preset filter shows "no items match" rather than crashing the page.
- Click-through is structurally disabled for missing items (no `<Link>` wrapper).
- An unknown `?preset=N` (non-existent or archived) silently falls back to "All presets" on the explorer and omits the back link on the detail page.

## Verification plan

This is a UI change rendered by the existing dev server. Per CLAUDE.md, verify in the browser before reporting done:

1. `npm run dev` (root) and open `http://localhost:4317`.
2. Open an existing preset that has at least one skill and one command.
3. Confirm: cards render in a responsive 1/2/3-column grid; each card shows type dot, invocation badge, name, 2-line description, source/plugin, and updated date.
4. Click a card → navigates to `/skills/{id}?preset={presetId}` (URL contains the param).
5. On the detail page, a small "← Back to preset {name} in explorer" link appears above the title. Click it → lands on `/skills?preset={presetId}` with the Preset filter pre-selected, and the list shows only items in that preset.
6. On the explorer, change the Preset dropdown to another preset → URL updates to the new `?preset=` value and the list re-filters.
7. On the explorer, switch the Preset dropdown back to "All presets" → URL drops the `preset` param.
8. Click the `×` on a card → item is removed without triggering navigation; grid re-renders without flicker.
9. Add a fake preset row that references a nonexistent identifier (insert into SQLite directly) and confirm the missing-card variant renders.
10. Archive the preset; confirm `×` buttons hide, cards are still navigable, and the preset disappears from the explorer's Preset dropdown.
11. Visit `/skills?preset=99999` (non-existent id) → dropdown shows "All presets" and the list is unfiltered. No error.
12. Resize to mobile width and confirm the preset detail grid collapses to one column and the explorer's filter row wraps cleanly.
13. `npm run build` for the TypeScript type-check.

## File changes (summary)

| File | Change |
| --- | --- |
| `packages/presets/src/enrich.ts` | **new** — `enrichPresetItems()` and `EnrichedPresetItem` type. Consumers import via `@lector/presets/enrich` (no barrel — matches the current pattern, e.g. `@lector/presets/presets`). |
| `packages/presets/src/membership.ts` | **new** — `loadPresetMembership()` and `PresetMembership` type. Imported via `@lector/presets/membership`. |
| `apps/web/lib/preset-query.ts` | **new** — `parsePresetId()` shared by SSR pages and the explorer client. |
| `apps/web/app/presets/[id]/page.tsx` | call `enrichPresetItems()` before `setQueryData`. |
| `apps/web/app/api/presets/[id]/route.ts` | enrich items before returning. |
| `apps/web/components/presets/use-preset-queries.ts` | `usePreset` return type uses `EnrichedPresetItem[]`. |
| `apps/web/components/presets/preset-item-card.tsx` | **new** — card component (present + missing variants); link includes `?preset={presetId}`. |
| `apps/web/components/presets/preset-detail-client.tsx` | replace `ItemList` with `PresetItemGrid` that uses `PresetItemCard`. |
| `apps/web/app/page.tsx` (Skills explorer page) | read `?preset` from `searchParams`, call `loadPresetMembership()`, pass `presetFilter` prop into `SkillsExplorer`. |
| `apps/web/app/commands/page.tsx` | same as Skills page but for `CommandsExplorer`. |
| `apps/web/components/skills-explorer.tsx` | add `presetFilter` prop, Preset `<Select>`, URL sync, filter logic. |
| `apps/web/components/commands-explorer.tsx` | same. |
| `apps/web/app/skills/[id]/page.tsx` | read `?preset`, look up preset, render back link above `<h1>` if present. |
| `apps/web/app/commands/[id]/page.tsx` | same. |
| `apps/web/lib/i18n/dictionaries/en.ts` | add the 7 keys above. |
| `apps/web/lib/i18n/dictionaries/th.ts` | add Thai equivalents. |
