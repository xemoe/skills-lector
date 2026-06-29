"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Cheat } from "@lector/presets/types";
import { useCheatsList } from "@/components/cheats/use-cheat-queries";
import { useT } from "@/lib/i18n/context";
import { basename } from "@/lib/utils";
import { distinctProjects } from "@/lib/project-options";

const RESULT_CAP = 50;
const PREVIEW_MAX = 100;

function truncate(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX).trimEnd()}…` : flat;
}

function matchesQuery(cheat: Cheat, lower: string): boolean {
    if (!lower) return true;
    return (
        cheat.original.toLowerCase().includes(lower) ||
        (cheat.improved?.toLowerCase().includes(lower) ?? false) ||
        (cheat.intent?.toLowerCase().includes(lower) ?? false) ||
        cheat.tags.some((tag) => tag.toLowerCase().includes(lower))
    );
}

interface CheatPickerProps {
    /** Cheat ids already in the flow — these are excluded from results. */
    excludeIds: number[];
    /** Called with the picked cheat id when the user clicks a result. */
    onPick: (cheatId: number) => void;
}

/**
 * Compact inline search panel for adding a cheat to a flow.
 * Filters useCheatsList by substring across original, improved, intent, and
 * tags. Cheats already in the flow (excludeIds) are hidden.
 */
export function CheatPicker({ excludeIds, onPick }: CheatPickerProps) {
    const t = useT();
    const [query, setQuery] = useState("");
    const [project, setProject] = useState("all");
    const { data } = useCheatsList();
    const all = useMemo(() => data?.cheats ?? [], [data]);

    const projectOptions = useMemo(() => distinctProjects(all), [all]);

    const matches = useMemo(() => {
        const lower = query.trim().toLowerCase();
        return all
            .filter(
                (c) =>
                    !excludeIds.includes(c.id) &&
                    (project === "all" || c.project === project) &&
                    matchesQuery(c, lower),
            )
            .slice(0, RESULT_CAP);
    }, [all, excludeIds, project, query]);

    function handlePick(cheatId: number) {
        onPick(cheatId);
        setQuery("");
    }

    return (
        <div className="flex flex-col gap-2 rounded-sm border bg-card p-3">
            <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search prompts, intent, tags…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-8"
                        autoFocus
                    />
                </div>
                {projectOptions.length > 0 && (
                    <Select value={project} onValueChange={setProject}>
                        <SelectTrigger
                            size="sm"
                            className="w-[160px] shrink-0"
                            aria-label={t.flowsPage.filterProject}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            <SelectItem value="all">{t.flowsPage.allProjects}</SelectItem>
                            {projectOptions.map((p) => (
                                <SelectItem key={p} value={p} title={p}>
                                    {basename(p)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-0.5">
                {matches.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                        {query ? "No prompts match your search." : "All cheats already added."}
                    </p>
                ) : (
                    matches.map((cheat) => (
                        <Button
                            key={cheat.id}
                            type="button"
                            variant="ghost"
                            className="h-auto w-full whitespace-normal justify-start gap-2 px-2 py-1.5 text-left"
                            onClick={() => handlePick(cheat.id)}
                        >
                            <div className="min-w-0 flex-1 space-y-0.5">
                                {cheat.intent && (
                                    <Badge
                                        variant="secondary"
                                        className="font-mono text-[10px]"
                                    >
                                        {cheat.intent}
                                    </Badge>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {truncate(cheat.original)}
                                </p>
                            </div>
                        </Button>
                    ))
                )}
            </div>
        </div>
    );
}
