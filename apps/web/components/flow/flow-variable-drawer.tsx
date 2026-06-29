"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { useT } from "@/lib/i18n/context";
import { FLOW_VARIANT_KEYS } from "@/lib/flow-variant";
import {
    extractVariables,
    fillVariables,
    markdownSafe,
    unfilledCount,
} from "@/lib/flow-variables";
import type { FlowStepVariants, FlowVariantKey } from "@lector/presets/types";

type PreviewView = "rendered" | "raw";

/** A copyable prompt block: a variant length, or the lone raw fallback. */
type Section = { key: string; label: string | null; text: string };

interface FlowVariableDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Short label for the step, e.g. "05 · planning". */
    title: string;
    /** All three rewrite variants when the step is enhanced; null otherwise. */
    variants: FlowStepVariants | null;
    /** Raw step text shown when the step has no enhancement. */
    fallbackText: string;
    /** Position within the pipeline, e.g. "2 / 5". Enables prev/next nav. */
    positionLabel?: string;
    hasPrev?: boolean;
    hasNext?: boolean;
    onPrev?: () => void;
    onNext?: () => void;
}

/**
 * Side drawer for one pipeline step. The pipeline cards show only the terse
 * `short` variant; this drawer shows all three (Short / Long / Precise) stacked,
 * each its own copyable block. It lists the `<placeholder>` variables found
 * across every variant, one input each, and substitutes them into every block's
 * live preview (blank inputs leave their placeholder intact). Unenhanced steps
 * show a single block of the raw step text. Values reset when the step changes.
 */
export function FlowVariableDrawer({
    open,
    onOpenChange,
    title,
    variants,
    fallbackText,
    positionLabel,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
}: FlowVariableDrawerProps) {
    const t = useT();
    const hasNav = Boolean(onPrev || onNext);

    const labelFor = useCallback(
        (key: FlowVariantKey): string =>
            key === "short"
                ? t.flowsPage.variantShort
                : key === "long"
                  ? t.flowsPage.variantLong
                  : t.flowsPage.variantPrecise,
        [t],
    );

    const sections: Section[] = useMemo(
        () =>
            variants
                ? FLOW_VARIANT_KEYS.map((key) => ({
                      key,
                      label: labelFor(key),
                      text: variants[key],
                  }))
                : [{ key: "only", label: null, text: fallbackText }],
        [variants, fallbackText, labelFor],
    );

    // Variables drive one shared input set, applied to every section's preview.
    const allText = useMemo(
        () => sections.map((s) => s.text).join("\n"),
        [sections],
    );
    const variables = useMemo(() => extractVariables(allText), [allText]);

    const [values, setValues] = useState<Record<string, string>>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [view, setView] = useState<PreviewView>("rendered");

    // Reset entered values when the drawer targets a different step.
    useEffect(() => {
        setValues({});
    }, [allText]);

    const remaining = unfilledCount(variables, values);
    const hasVars = variables.length > 0;

    const handleCopy = useCallback(async (key: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }, []);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full gap-0 data-[side=right]:sm:max-w-3xl"
            >
                <SheetHeader className="border-b">
                    <SheetTitle className="text-foreground/50">
                        <span className="font-mono">{title}</span> ·{" "}
                        {hasVars ? t.flowsPage.fillHint : t.flowsPage.viewHint}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                    {/* Variable inputs — shared across all variant blocks */}
                    {hasVars && (
                        <div className="space-y-2.5">
                            {variables.map((v) => (
                                <label key={v} className="block space-y-1">
                                    <span className="font-mono text-[11px] text-primary">
                                        &lt;{v}&gt;
                                    </span>
                                    <Input
                                        value={values[v] ?? ""}
                                        onChange={(e) =>
                                            setValues((prev) => ({
                                                ...prev,
                                                [v]: e.target.value,
                                            }))
                                        }
                                        placeholder={v}
                                    />
                                </label>
                            ))}
                            {/* In nav mode the footer is prev/next, so the reset
                                affordance lives next to the inputs. */}
                            {hasNav && Object.keys(values).length > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[11px] text-muted-foreground"
                                    onClick={() => setValues({})}
                                >
                                    {t.flowsPage.reset}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Preview bar: unfilled count + Markdown/Raw toggle (global) */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            {t.flowsPage.preview}
                        </span>
                        <div className="flex items-center gap-2">
                            {remaining > 0 && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {t.flowsPage.unfilled(remaining)}
                                </span>
                            )}
                            <div className="inline-flex rounded-none border">
                                {(
                                    [
                                        ["rendered", t.flowsPage.viewMarkdown],
                                        ["raw", t.flowsPage.viewRaw],
                                    ] as const
                                ).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setView(key)}
                                        aria-pressed={view === key}
                                        className={
                                            "px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors " +
                                            (view === key
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:text-foreground")
                                        }
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* One block per variant (or a single raw block) */}
                    {sections.map((section) => {
                        const filled = fillVariables(section.text, values);
                        const justCopied = copiedKey === section.key;
                        return (
                            <div key={section.key} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    {section.label && (
                                        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                                            {section.label}
                                        </span>
                                    )}
                                    <span className="h-px flex-1 bg-border" />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1.5 px-2"
                                        onClick={() =>
                                            handleCopy(section.key, filled)
                                        }
                                    >
                                        {justCopied ? (
                                            <Check className="size-3.5 text-green-600" />
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                        <span className="text-[11px]">
                                            {justCopied
                                                ? t.actions.copied
                                                : hasVars
                                                  ? t.flowsPage.copyFilled
                                                  : t.actions.copy}
                                        </span>
                                    </Button>
                                </div>
                                {view === "rendered" ? (
                                    <div className="rounded-none border bg-muted/30 p-3">
                                        <Markdown
                                            content={markdownSafe(filled)}
                                        />
                                    </div>
                                ) : (
                                    <pre className="whitespace-pre-wrap break-words rounded-none border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                                        {filled}
                                    </pre>
                                )}
                            </div>
                        );
                    })}
                </div>

                <SheetFooter className="border-t">
                    {hasNav ? (
                        // Prev (left) · position (center) · Next (right)
                        <div className="grid w-full grid-cols-3 items-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-self-start gap-1"
                                onClick={onPrev}
                                disabled={!hasPrev}
                                aria-label="Previous step"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <div className="justify-self-center">
                                {positionLabel && (
                                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                        {positionLabel}
                                    </span>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-self-end gap-1"
                                onClick={onNext}
                                disabled={!hasNext}
                                aria-label="Next step"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    ) : (
                        hasVars && (
                            <div className="flex flex-row justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setValues({})}
                                    disabled={Object.keys(values).length === 0}
                                >
                                    {t.flowsPage.reset}
                                </Button>
                            </div>
                        )
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
