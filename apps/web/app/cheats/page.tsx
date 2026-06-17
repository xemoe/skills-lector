import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { CheatStatCards } from "@/components/cheat-stat-cards";
import { CheatsExplorer } from "@/components/cheats-explorer";
import { cheatsQk } from "@/components/cheats/cheat-query-keys";
import { InlineCode } from "@/components/inline-code";
import { listCheats } from "@lector/presets/cheats";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ t }: { t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.cheatsPage.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.cheatsPage.empty1}
                <InlineCode>/cheats</InlineCode>
                {t.cheatsPage.empty2}
                <InlineCode>presets.db</InlineCode>
                {t.cheatsPage.empty3}
            </p>
        </div>
    );
}

export default async function CheatsPage() {
    const { t } = await getServerI18n();
    const cheats = listCheats();

    const queryClient = new QueryClient();
    queryClient.setQueryData(cheatsQk.list(), { cheats });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t.cheatsPage.title}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t.cheatsPage.subtitle}</p>
                </div>
            </div>

            <HydrationBoundary state={dehydrate(queryClient)}>
                <CheatStatCards />
                {cheats.length === 0 ? <EmptyState t={t} /> : <CheatsExplorer />}
            </HydrationBoundary>
        </div>
    );
}
