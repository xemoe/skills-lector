"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { useT } from "@/lib/i18n/context";
import {
    extractVariables,
    fillVariables,
    markdownSafe,
    unfilledCount,
} from "@/lib/flow-variables";

type PreviewView = "rendered" | "raw";

interface FlowVariableDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Short label for the step, e.g. "05 · planning". */
    title: string;
    /** The enhanced prompt containing `<placeholder>` variables. */
    text: string;
    /** Position within the pipeline, e.g. "2 / 5". Enables prev/next nav. */
    positionLabel?: string;
    hasPrev?: boolean;
    hasNext?: boolean;
    onPrev?: () => void;
    onNext?: () => void;
}

/**
 * Side drawer for one pipeline step: lists the `<placeholder>` variables in that
 * step's enhanced prompt, one input each, and shows a live preview with the
 * values substituted (blank inputs leave their placeholder intact). Copy yields
 * the filled prompt. Values are ephemeral — reset whenever the step changes.
 */
export function FlowVariableDrawer({
    open,
    onOpenChange,
    title,
    text,
    positionLabel,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
}: FlowVariableDrawerProps) {
    const t = useT();
    const hasNav = Boolean(onPrev || onNext);
    const variables = useMemo(() => extractVariables(text), [text]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState<PreviewView>("rendered");

    // Reset entered values when the drawer targets a different step.
    useEffect(() => {
        setValues({});
    }, [text]);

    const filled = useMemo(() => fillVariables(text, values), [text, values]);
    const remaining = unfilledCount(variables, values);
    const hasVars = variables.length > 0;

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(filled);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }, [filled]);

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
                    {/* Variable inputs */}
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
                            {/* In nav mode the footer is prev/copy/next, so the
                                reset affordance lives next to the inputs. */}
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

                    {/* Live preview — Markdown rendered or raw source */}
                    <div className="space-y-1.5">
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
                                {/* Raw | Markdown segmented toggle */}
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
                        {view === "rendered" ? (
                            <div className="rounded-none border bg-muted/30 p-3">
                                <Markdown content={markdownSafe(filled)} />
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap break-words rounded-none border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                                {filled}
                            </pre>
                        )}
                        {/* Copy lives at the foot of the prompt it acts on. */}
                        <div className="flex justify-end pt-0.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <Check className="text-green-600" />
                                ) : (
                                    <Copy />
                                )}
                                {copied
                                    ? t.actions.copied
                                    : hasVars
                                      ? t.flowsPage.copyFilled
                                      : t.actions.copy}
                            </Button>
                        </div>
                    </div>
                </div>

                <SheetFooter className="border-t">
                    {hasNav ? (
                        // Prev (left) · Copy + position (center) · Next (right)
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
