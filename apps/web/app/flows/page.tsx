import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { FlowsExplorer } from "@/components/flow/flows-explorer";
import { flowsQk } from "@/components/flow/flow-query-keys";
import { cheatsQk } from "@/components/cheats/cheat-query-keys";
import { listFlows } from "@lector/presets/flows";
import { listCheats } from "@lector/presets/cheats";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
    const { t } = await getServerI18n();
    const flows = listFlows();
    const cheats = listCheats();

    const queryClient = new QueryClient();
    queryClient.setQueryData(flowsQk.list(), { flows });
    queryClient.setQueryData(cheatsQk.list(), { cheats });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t.flowsPage.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.flowsPage.subtitle}
                    </p>
                </div>
            </div>

            <HydrationBoundary state={dehydrate(queryClient)}>
                <FlowsExplorer />
            </HydrationBoundary>
        </div>
    );
}
