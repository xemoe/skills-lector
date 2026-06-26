"use client";

import { Play, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import type { ResolvedStep } from "@/lib/flow-resolve";
import { FlowNode } from "./flow-node";

interface FlowPipelineProps {
    steps: ResolvedStep[];
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (index: number) => void;
    onAdd: () => void;
}

type RailKind = "start" | "step" | "add";

/**
 * The rail cell for one row: the continuous vertical line plus the medallion.
 * `top`/`bottom` toggle the line halves so the line starts at `Start` and ends
 * at the add node. `align` keeps the medallion near the card's header for steps
 * and centered for the start/add caps.
 */
function Rail({
    kind,
    label,
    top,
    bottom,
}: {
    kind: RailKind;
    label?: number;
    top: boolean;
    bottom: boolean;
}) {
    return (
        <div className="relative flex w-10 shrink-0 flex-col items-center self-stretch">
            <span className={cn("w-px flex-1", top ? "bg-border" : "bg-transparent")} />
            <span
                className={cn(
                    "z-10 my-0.5 flex size-9 shrink-0 items-center justify-center",
                    kind === "step" &&
                        "bg-primary font-mono text-sm font-bold tabular-nums text-primary-foreground",
                    kind === "start" && "bg-primary/15 text-primary",
                    kind === "add" &&
                        "border-2 border-dashed border-border text-muted-foreground",
                )}
            >
                {kind === "step" && label}
                {kind === "start" && <Play className="size-4 fill-current" />}
                {kind === "add" && <Plus className="size-4" />}
            </span>
            <span className={cn("w-px flex-1", bottom ? "bg-border" : "bg-transparent")} />
        </div>
    );
}

/**
 * The flow as a top-down pipeline: a continuous left rail threading a `Start`
 * cap, each step (numbered medallion + full-width stage card), and a dashed
 * add-step node, laid over a faint blueprint dot-grid. Reads as a workflow you
 * scan top to bottom; no horizontal scroll.
 */
export function FlowPipeline({
    steps,
    onMoveUp,
    onMoveDown,
    onRemove,
    onAdd,
}: FlowPipelineProps) {
    const t = useT();
    const empty = steps.length === 0;

    return (
        <div className="flow-canvas rounded-none border bg-muted/20 p-4 md:p-6">
            <div className="mx-auto max-w-3xl">
                {/* Start cap */}
                <div className="flex items-center gap-4">
                    <Rail kind="start" top={false} bottom />
                    <span className="inline-flex items-center rounded-none border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                        {t.flowsPage.start}
                    </span>
                </div>

                {/* Steps */}
                {steps.map((step, index) => (
                    <div key={step.cheatId} className="flex items-stretch gap-4">
                        <Rail kind="step" label={index + 1} top bottom />
                        <div className="min-w-0 flex-1 py-2">
                            <FlowNode
                                step={step}
                                index={index}
                                total={steps.length}
                                onMoveUp={onMoveUp}
                                onMoveDown={onMoveDown}
                                onRemove={onRemove}
                            />
                        </div>
                    </div>
                ))}

                {/* Add-step terminal */}
                <div className="flex items-stretch gap-4">
                    <Rail kind="add" top bottom={false} />
                    <div className="flex-1 py-2">
                        <button
                            type="button"
                            onClick={onAdd}
                            className="group flex w-full items-center justify-center gap-2 rounded-none border-2 border-dashed border-border p-5 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                        >
                            <Plus className="size-5" />
                            <span className="text-sm font-medium">
                                {empty ? t.flowsPage.addFirstStep : t.flowsPage.addStep}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
