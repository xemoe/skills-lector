import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { CheatDetailNav } from "@/components/cheats/cheat-detail-nav";
import { getCheat } from "@lector/presets/cheats";
import { getServerI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/utils";
import { MetaRow } from "@/components/meta-row";

export const dynamic = "force-dynamic";

export default async function CheatDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ show?: string }>;
}) {
    const { id } = await params;
    const { show } = await searchParams;
    const { t } = await getServerI18n();
    const cheatId = Number(id);
    const cheat =
        Number.isInteger(cheatId) && cheatId > 0 ? getCheat(cheatId) : null;
    if (!cheat) notFound();

    // Mirror the list's display preference: lead with the version the user was
    // browsing (defaults to original). Both versions stay visible either way.
    const improvedFirst = show === "improved";

    const improvedCard = (
        <Card className="cheat-card cheat-card-glow overflow-visible rounded-sm">
            <CardHeader>
                <CardTitle className="text-base">
                    {t.cheatsPage.improvedLabel}
                </CardTitle>
                {cheat.improved && (
                    <CardAction>
                        <CopyButton value={cheat.improved} />
                    </CardAction>
                )}
            </CardHeader>
            <Separator className="border-b border-dotted border-border m-0" />
            <CardContent className="p-0">
                {cheat.improved ? (
                    <pre className="whitespace-pre-wrap break-words rounded-none bg-secondary p-3 text-sm">
                        {cheat.improved}
                    </pre>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t.cheatsPage.noImproved}
                    </p>
                )}
            </CardContent>
        </Card>
    );

    const originalCard = (
        <Card className="rounded-sm">
            <CardHeader>
                <CardTitle className="text-base">
                    {t.cheatsPage.originalLabel}
                </CardTitle>
                <CardAction>
                    <CopyButton value={cheat.original} />
                </CardAction>
            </CardHeader>
            <Separator className="border-b border-dotted border-border m-0" />
            <CardContent className="p-0">
                <pre className="whitespace-pre-wrap break-words rounded-none bg-secondary p-3 text-sm">
                    {cheat.original}
                </pre>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            <CheatDetailNav cheatId={cheat.id} />

            <div className="flex flex-wrap items-center gap-3">
                {cheat.favorite && (
                    <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                        {t.cheatsPage.favoritedBadge}
                    </Badge>
                )}
            </div>

            {improvedFirst ? (
                <>
                    {improvedCard}
                    {originalCard}
                </>
            ) : (
                <>
                    {originalCard}
                    {improvedCard}
                </>
            )}

            <Card className="rounded-sm">
                <CardHeader>
                    <CardTitle className="text-base">
                        {t.detail.details}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="divide-y">
                        <MetaRow label={t.cheatsPage.sourceLabel}>
                            <span className="text-xs">
                                {cheat.provenance === "typed"
                                    ? t.cheatsPage.sourceTyped
                                    : t.cheatsPage.sourceLegacy}
                            </span>
                        </MetaRow>
                        {cheat.intent && (
                            <MetaRow label={t.cheatsPage.intentLabel}>
                                <span className="font-mono text-xs">
                                    {cheat.intent}
                                </span>
                            </MetaRow>
                        )}
                        {cheat.tags.length > 0 && (
                            <MetaRow label={t.cheatsPage.tagsLabel}>
                                <span className="flex flex-wrap justify-end gap-1">
                                    {cheat.tags.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {tag}
                                        </Badge>
                                    ))}
                                </span>
                            </MetaRow>
                        )}
                        {typeof cheat.reuseScore === "number" && (
                            <MetaRow label={t.cheatsPage.reuseLabel}>
                                <span className="tabular-nums">
                                    {cheat.reuseScore}
                                </span>
                            </MetaRow>
                        )}
                        <MetaRow label={t.cheatsPage.occurrencesLabel}>
                            <span className="tabular-nums">
                                {cheat.occurrences}
                            </span>
                        </MetaRow>
                        {cheat.project && (
                            <MetaRow label={t.cheatsPage.projectLabel}>
                                <span className="break-all font-mono text-xs">
                                    {cheat.project}
                                </span>
                            </MetaRow>
                        )}
                        <MetaRow label={t.cheatsPage.colUpdated}>
                            <span>
                                {t.cheatsPage.seenRange(
                                    formatDate(cheat.firstSeenAt),
                                    formatDate(cheat.lastSeenAt),
                                )}
                            </span>
                        </MetaRow>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
