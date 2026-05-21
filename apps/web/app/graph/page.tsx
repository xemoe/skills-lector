import { RelationGraph } from "@/components/relation-graph";
import { InlineCode } from "@/components/inline-code";
import { buildRelationGraph } from "@/lib/relations";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ t }: { t: Dictionary }) {
  return (
    <div className="rounded-none border border-dashed p-12 text-center">
      <h3 className="text-base font-medium">{t.graphPage.emptyTitle}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        {t.graphPage.empty1}
        <InlineCode>{t.actions.rescan}</InlineCode>
        {t.graphPage.empty2}
      </p>
    </div>
  );
}

export default async function GraphPage() {
  const { t, locale } = await getServerI18n();
  const graph = buildRelationGraph({ locale });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.graphPage.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.graphPage.subtitle}
          </p>
        </div>
        <p className="tabular-nums text-xs text-muted-foreground">
          {t.graphPage.statsLine(
            graph.stats.skills,
            graph.stats.commands,
            graph.stats.clusters,
            graph.stats.references,
          )}
        </p>
      </div>

      {graph.nodes.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <RelationGraph graph={graph} />
      )}
    </div>
  );
}
