"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Trash2 } from "lucide-react";
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
import { buildCombinedPrompt, cheatsByIdMap, resolveSteps } from "@/lib/flow-resolve";
import { useCheatsList } from "@/components/cheats/use-cheat-queries";
import {
    useDeleteFlow,
    useFlow,
    useSetSteps,
    useUpdateFlow,
} from "./use-flow-queries";
import { CheatPicker } from "./cheat-picker";
import { FlowPipeline } from "./flow-pipeline";

interface FlowEditorProps {
    flowId: number;
}

/**
 * Detail editor for a single flow. Inline-editable name and description,
 * ordered step list with reorder/remove, cheat picker to add steps, and a
 * "Copy combined prompt" button that builds the full chain for clipboard.
 */
export function FlowEditor({ flowId }: FlowEditorProps) {
    const t = useT();
    const router = useRouter();

    const { data: flowData } = useFlow(flowId);
    const flow = flowData?.flow;

    const { data: cheatsData } = useCheatsList();
    const cheats = cheatsData?.cheats ?? [];

    const cheatsById = useMemo(() => cheatsByIdMap(cheats), [cheats]);
    const steps = useMemo(
        () => (flow ? resolveSteps(flow, cheatsById) : []),
        [flow, cheatsById],
    );

    const updateFlow = useUpdateFlow();
    const setSteps = useSetSteps();
    const deleteFlow = useDeleteFlow();

    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState("");
    const [editingDesc, setEditingDesc] = useState(false);
    const [descVal, setDescVal] = useState("");
    const [copied, setCopied] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

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
        const text = buildCombinedPrompt(flow, cheatsById);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }, [flow, cheatsById]);

    const handleMoveUp = useCallback(
        (index: number) => {
            if (!flow || index === 0) return;
            const ids = [...flow.steps];
            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
            setSteps.mutate({ id: flowId, cheatIds: ids });
        },
        [flow, flowId, setSteps],
    );

    const handleMoveDown = useCallback(
        (index: number) => {
            if (!flow || index >= flow.steps.length - 1) return;
            const ids = [...flow.steps];
            [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
            setSteps.mutate({ id: flowId, cheatIds: ids });
        },
        [flow, flowId, setSteps],
    );

    const handleRemove = useCallback(
        (index: number) => {
            if (!flow) return;
            const ids = flow.steps.filter((_, i) => i !== index);
            setSteps.mutate({ id: flowId, cheatIds: ids });
        },
        [flow, flowId, setSteps],
    );

    const handleAddCheat = useCallback(
        (cheatId: number) => {
            if (!flow) return;
            const ids = [...flow.steps, cheatId];
            setSteps.mutate({ id: flowId, cheatIds: ids });
            setShowPicker(false);
        },
        [flow, flowId, setSteps],
    );

    const handleDelete = useCallback(() => {
        deleteFlow.mutate(
            { id: flowId },
            { onSuccess: () => router.push("/flows") },
        );
    }, [deleteFlow, flowId, router]);

    if (!flow) {
        return (
            <div className="py-12 text-center text-sm text-muted-foreground">
                {t.flowsPage.loadingFlow}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        {t.flowsPage.title} · {steps.length} {t.flowsPage.steps}
                    </p>
                    {editingName ? (
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
                        <h1
                            className="cursor-text text-lg font-semibold hover:underline hover:underline-offset-2"
                            title="Click to edit name"
                            onClick={() => {
                                setNameVal(flow.name);
                                setEditingName(true);
                            }}
                        >
                            {flow.name}
                        </h1>
                    )}

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
                        <p
                            className="cursor-text text-sm text-muted-foreground hover:text-foreground"
                            title="Click to edit description"
                            onClick={() => {
                                setDescVal(flow.description ?? "");
                                setEditingDesc(true);
                            }}
                        >
                            {flow.description ?? (
                                <span className="italic">Add a description…</span>
                            )}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleCopyAll}
                        disabled={steps.length === 0}
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
                        className="gap-1.5"
                        onClick={handleDelete}
                        disabled={deleteFlow.isPending}
                    >
                        <Trash2 />
                        {t.flowsPage.deleteFlow}
                    </Button>
                </div>
            </div>

            {/* Pipeline canvas */}
            <FlowPipeline
                steps={steps}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemove}
                onAdd={() => setShowPicker(true)}
            />

            {/* Add-step picker */}
            <Dialog open={showPicker} onOpenChange={setShowPicker}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t.flowsPage.pickerTitle}</DialogTitle>
                    </DialogHeader>
                    <CheatPicker excludeIds={flow.steps} onPick={handleAddCheat} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
