"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/context";
import type { FlowEnhancedStep, FlowVariantKey } from "@lector/presets/types";
import {
    buildCombinedPrompt,
    cheatsByIdMap,
    enhancedByCheatId,
} from "@/lib/flow-resolve";
import { FLOW_VARIANT_KEYS } from "@/lib/flow-variant";
import { diffSteps, insertAtServerPosition } from "@/lib/flow-step-diff";
import { useCheatsList } from "@/components/cheats/use-cheat-queries";
import {
    useDeleteFlow,
    useFlow,
    useSetSteps,
    useUpdateFlow,
} from "./use-flow-queries";
import { CheatPicker } from "./cheat-picker";
import { FlowPipeline } from "./flow-pipeline";
import { FlowDetailNav } from "./flow-detail-nav";
import { FlowEnhanceHint } from "./flow-enhance-hint";

interface FlowEditorProps {
    flowId: number;
}

/**
 * Detail editor for a single flow. Step edits (reorder / remove / add) are
 * staged in a local draft — highlighted per item with a revert — and only hit
 * the DB on "Apply changes"; "Revert changes" discards the draft. Name and
 * description still save immediately.
 */
export function FlowEditor({ flowId }: FlowEditorProps) {
    const t = useT();
    const router = useRouter();

    const { data: flowData } = useFlow(flowId);
    const flow = flowData?.flow;

    const { data: cheatsData } = useCheatsList();
    const cheats = cheatsData?.cheats ?? [];
    const cheatsById = useMemo(() => cheatsByIdMap(cheats), [cheats]);

    const updateFlow = useUpdateFlow();
    const setSteps = useSetSteps();
    const deleteFlow = useDeleteFlow();

    // Local draft of the step order. null = clean (mirrors the saved order).
    const [draft, setDraft] = useState<number[] | null>(null);
    const server = flow?.steps ?? [];
    const current = draft ?? server;

    const diff = useMemo(() => diffSteps(server, current), [server, current]);
    const enhancedSteps = useMemo<Map<number, FlowEnhancedStep>>(
        () => (flow ? enhancedByCheatId(flow) : new Map()),
        [flow],
    );
    const rows = useMemo(
        () =>
            diff.rows.map((r) => ({
                cheatId: r.cheatId,
                cheat: cheatsById.get(r.cheatId) ?? null,
                change: r.change,
                draftIndex: r.draftIndex,
            })),
        [diff, cheatsById],
    );

    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState("");
    const [editingDesc, setEditingDesc] = useState(false);
    const [descVal, setDescVal] = useState("");
    const [copied, setCopied] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);
    // Which enhanced length the combined-prompt copy uses (pipeline shows short).
    const [copyVariant, setCopyVariant] = useState<FlowVariantKey>("short");

    const handleSaveName = useCallback(() => {
        const trimmed = nameVal.trim();
        if (trimmed && flow && trimmed !== flow.name) {
            updateFlow.mutate({ id: flowId, name: trimmed });
        }
        setEditingName(false);
    }, [flowId, nameVal, flow, updateFlow]);

    const handleSaveDesc = useCallback(() => {
        const trimmed = descVal.trim();
        if (flow && trimmed !== (flow.description ?? "")) {
            updateFlow.mutate({ id: flowId, description: trimmed || null });
        }
        setEditingDesc(false);
    }, [flowId, descVal, flow, updateFlow]);

    const handleCopyAll = useCallback(async () => {
        if (!flow) return;
        const text = buildCombinedPrompt(
            { ...flow, steps: current },
            cheatsById,
            copyVariant,
        );
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }, [flow, current, cheatsById, copyVariant]);

    // ---- staged step edits (local draft only) ----
    const handleMoveUp = useCallback(
        (cheatId: number) => {
            const i = current.indexOf(cheatId);
            if (i <= 0) return;
            const next = [...current];
            [next[i - 1], next[i]] = [next[i], next[i - 1]];
            setDraft(next);
        },
        [current],
    );

    const handleMoveDown = useCallback(
        (cheatId: number) => {
            const i = current.indexOf(cheatId);
            if (i < 0 || i >= current.length - 1) return;
            const next = [...current];
            [next[i], next[i + 1]] = [next[i + 1], next[i]];
            setDraft(next);
        },
        [current],
    );

    const handleRemove = useCallback(
        (cheatId: number) => setDraft(current.filter((x) => x !== cheatId)),
        [current],
    );

    const handleAddCheat = useCallback(
        (cheatId: number) => {
            setDraft([...current, cheatId]);
            setShowPicker(false);
        },
        [current],
    );

    const handleRevertItem = useCallback(
        (cheatId: number) => {
            const inServer = server.includes(cheatId);
            setDraft(
                inServer
                    ? insertAtServerPosition(current, cheatId, server) // removed or moved
                    : current.filter((x) => x !== cheatId), // added
            );
        },
        [current, server],
    );

    const handleApply = useCallback(() => {
        setApplyError(null);
        setSteps.mutate(
            { id: flowId, cheatIds: current },
            {
                onSuccess: () => setDraft(null),
                onError: (err) =>
                    setApplyError(
                        err instanceof Error
                            ? err.message
                            : t.flowsPage.applyFailed,
                    ),
            },
        );
    }, [setSteps, flowId, current, t]);

    const handleRevertAll = useCallback(() => {
        setApplyError(null);
        setDraft(null);
    }, []);

    const handleDelete = useCallback(() => {
        deleteFlow.mutate(
            { id: flowId },
            { onSuccess: () => router.push("/flows") },
        );
    }, [deleteFlow, flowId, router]);

    if (!flow) {
        return (
            <div className="space-y-6">
                <FlowDetailNav flowId={flowId} />
                <div className="py-12 text-center text-sm text-muted-foreground">
                    {t.flowsPage.loadingFlow}
                </div>
            </div>
        );
    }

    const applying = setSteps.isPending;

    // Flow name lives in the nav row (left of the prev/next controls) so the
    // header stays compact; editing it swaps the heading for an inline input.
    const nameBlock = editingName ? (
        <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                handleSaveName();
            }}
        >
            <Input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                className="h-8 text-base font-semibold"
                onBlur={handleSaveName}
            />
            <Button
                type="submit"
                variant="outline"
                size="icon-sm"
                aria-label="Save name"
            >
                <Check />
            </Button>
        </form>
    ) : (
        <h1 className="truncate text-lg font-semibold">
            <button
                type="button"
                className="cursor-text rounded-none text-left hover:underline hover:underline-offset-2"
                title="Click to edit name"
                aria-label="Edit flow name"
                onClick={() => {
                    setNameVal(flow.name);
                    setEditingName(true);
                }}
            >
                {flow.name}
            </button>
        </h1>
    );

    return (
        <div className="space-y-2.5">
            <FlowDetailNav flowId={flowId} leftSlot={nameBlock} />

            {/* Sub-header: description + actions */}
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1 space-y-1">
                    {editingDesc ? (
                        <form
                            className="flex items-start gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSaveDesc();
                            }}
                        >
                            <Textarea
                                autoFocus
                                value={descVal}
                                onChange={(e) => setDescVal(e.target.value)}
                                className="text-sm"
                                onBlur={handleSaveDesc}
                            />
                            <Button
                                type="submit"
                                variant="outline"
                                size="icon-sm"
                                aria-label="Save description"
                            >
                                <Check />
                            </Button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            className="block cursor-text rounded-none text-left text-sm text-muted-foreground hover:text-foreground"
                            title="Click to edit description"
                            aria-label="Edit flow description"
                            onClick={() => {
                                setDescVal(flow.description ?? "");
                                setEditingDesc(true);
                            }}
                        >
                            {flow.description ?? (
                                <span className="italic">
                                    Add a description…
                                </span>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary mr-4">
                        {t.flowsPage.title} · {current.length}{" "}
                        {t.flowsPage.steps}
                    </p>
                    {/* Variant picker — which enhanced length the combined copy
                        uses. Only meaningful once the flow has been enhanced. */}
                    {enhancedSteps.size > 0 && (
                        <div
                            className="inline-flex rounded-none border"
                            role="group"
                            aria-label={t.flowsPage.copyVariant}
                        >
                            {FLOW_VARIANT_KEYS.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCopyVariant(key)}
                                    aria-pressed={copyVariant === key}
                                    className={
                                        "px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors " +
                                        (copyVariant === key
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:text-foreground")
                                    }
                                >
                                    {key === "short"
                                        ? t.flowsPage.variantShort
                                        : key === "long"
                                          ? t.flowsPage.variantLong
                                          : t.flowsPage.variantPrecise}
                                </button>
                            ))}
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 w-46"
                        onClick={handleCopyAll}
                        disabled={current.length === 0}
                    >
                        {copied ? (
                            <Check className="text-green-600" />
                        ) : (
                            <Copy />
                        )}
                        {copied ? t.actions.copied : t.flowsPage.copyPrompt}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1.5 w-24 rounded-md"
                        onClick={handleDelete}
                        disabled={deleteFlow.isPending}
                    >
                        <Trash2 />
                        {t.flowsPage.deleteFlow}
                    </Button>
                </div>
            </div>

            {/* Unsaved-changes action bar */}
            {diff.dirty && (
                <div
                    role="status"
                    aria-live="polite"
                    className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-none border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 backdrop-blur supports-backdrop-filter:bg-amber-500/10"
                >
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        {applyError ? (
                            <span className="text-destructive">
                                {applyError}
                            </span>
                        ) : (
                            t.flowsPage.unsavedChanges(
                                diff.counts.added,
                                diff.counts.removed,
                                diff.counts.moved,
                            )
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleRevertAll}
                            disabled={applying}
                        >
                            <Undo2 className="size-3.5" />
                            {t.flowsPage.revertChanges}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleApply}
                            disabled={applying}
                        >
                            <Check className="size-3.5" />
                            {applying
                                ? t.flowsPage.applying
                                : t.flowsPage.applyChanges}
                        </Button>
                    </div>
                </div>
            )}

            {/* Nudge to enhance — only when the flow has steps but no rewrite yet */}
            {current.length > 0 && enhancedSteps.size === 0 && (
                <FlowEnhanceHint flowId={flowId} />
            )}

            {/* Pipeline canvas */}
            <FlowPipeline
                rows={rows}
                draftCount={current.length}
                enhancedByCheatId={enhancedSteps}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemove}
                onRevert={handleRevertItem}
                onAdd={() => setShowPicker(true)}
            />

            {/* Add-step picker */}
            <Dialog open={showPicker} onOpenChange={setShowPicker}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t.flowsPage.pickerTitle}</DialogTitle>
                    </DialogHeader>
                    <CheatPicker excludeIds={current} onPick={handleAddCheat} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
