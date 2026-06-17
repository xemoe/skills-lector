"use client";

import { Sparkles, Star, FolderGit2, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Cheat } from "@lector/presets/types";
import { useT } from "@/lib/i18n/context";

export function CheatStatCards({ cheats }: { cheats: Cheat[] }) {
    const t = useT();

    const favorites = cheats.filter((c) => c.favorite).length;
    const projects = new Set(cheats.map((c) => c.project).filter(Boolean)).size;
    const scored = cheats.filter((c) => typeof c.reuseScore === "number");
    const avgReuse = scored.length
        ? Math.round(scored.reduce((sum, c) => sum + (c.reuseScore ?? 0), 0) / scored.length)
        : 0;

    const cards = [
        { label: t.cheatsPage.statTotal, value: cheats.length, Icon: Sparkles },
        { label: t.cheatsPage.statFavorites, value: favorites, Icon: Star },
        { label: t.cheatsPage.statProjects, value: projects, Icon: FolderGit2 },
        { label: t.cheatsPage.statAvgReuse, value: avgReuse, Icon: Gauge },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, Icon }) => (
                <Card key={label}>
                    <CardContent className="flex items-center gap-5 p-2 px-5">
                        <div className="rounded-none bg-secondary p-2.5">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-4xl font-bold tabular-nums">{value}</div>
                            <div className="text-sm font-medium">{label}</div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
