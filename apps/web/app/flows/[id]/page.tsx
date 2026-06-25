import { notFound } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getFlow } from "@lector/presets/flows";
import { listCheats } from "@lector/presets/cheats";
import { FlowEditor } from "@/components/flow/flow-editor";
import { flowsQk } from "@/components/flow/flow-query-keys";
import { cheatsQk } from "@/components/cheats/cheat-query-keys";

export const dynamic = "force-dynamic";

export default async function FlowDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return notFound();

    const flow = getFlow(id);
    if (!flow) return notFound();

    const cheats = listCheats();

    const queryClient = new QueryClient();
    queryClient.setQueryData(flowsQk.detail(id), { flow });
    queryClient.setQueryData(cheatsQk.list(), { cheats });

    return (
        <div className="space-y-6 px-5 py-0">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <FlowEditor flowId={id} />
            </HydrationBoundary>
        </div>
    );
}
