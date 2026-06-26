"use client";

import { Fragment } from "react";
import { Play, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { ResolvedStep } from "@/lib/flow-resolve";
import { FlowNode } from "./flow-node";
import { FlowConnector } from "./flow-connector";

interface FlowPipelineProps {
    steps: ResolvedStep[];
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (index: number) => void;
    onAdd: () => void;
}

/**
 * The flow as a connected pipeline: a `Start` cap, each step rendered as a
 * stage node joined by directional connectors, and a dashed "add step" node as
 * the terminal. Lays out as a horizontal rail (with horizontal scroll) on
 * `md`+ and stacks vertically on mobile, over a faint blueprint dot-grid.
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
        <div className="flow-canvas relative overflow-x-auto rounded-none border bg-muted/20 p-4 md:p-6">
            <div className="flex flex-col items-stretch md:flex-row md:items-stretch">
                {/* Start cap */}
                <div className="flex shrink-0 items-center md:items-center">
                    <span className="inline-flex items-center gap-1.5 rounded-none border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                        <Play className="size-3 fill-current" />
                        {t.flowsPage.start}
                    </span>
                </div>

                <FlowConnector />

                {steps.map((step, index) => (
                    <Fragment key={step.cheatId}>
                        <FlowNode
                            step={step}
                            index={index}
                            total={steps.length}
                            onMoveUp={onMoveUp}
                            onMoveDown={onMoveDown}
                            onRemove={onRemove}
                        />
                        <FlowConnector />
                    </Fragment>
                ))}

                {/* Terminal add-step node */}
                <button
                    type="button"
                    onClick={onAdd}
                    className="group flex w-full flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary md:w-[13rem] md:shrink-0"
                >
                    <span className="flex size-9 items-center justify-center rounded-none border-2 border-dashed border-current">
                        <Plus className="size-4" />
                    </span>
                    <span className="text-xs font-medium">
                        {empty ? t.flowsPage.addFirstStep : t.flowsPage.addStep}
                    </span>
                </button>
            </div>
        </div>
    );
}
