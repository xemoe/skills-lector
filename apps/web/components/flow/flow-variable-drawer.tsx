"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
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
import { useT } from "@/lib/i18n/context";
import { extractVariables, fillVariables, unfilledCount } from "@/lib/flow-variables";

interface FlowVariableDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Short label for the step, e.g. "05 · planning". */
    title: string;
    /** The enhanced prompt containing `<placeholder>` variables. */
    text: string;
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
}: FlowVariableDrawerProps) {
    const t = useT();
    const variables = useMemo(() => extractVariables(text), [text]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState(false);

    // Reset entered values when the drawer targets a different step.
    useEffect(() => {
        setValues({});
    }, [text]);

    const filled = useMemo(() => fillVariables(text, values), [text, values]);
    const remaining = unfilledCount(variables, values);

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
                    <SheetTitle>{t.flowsPage.fillVariables}</SheetTitle>
                    <SheetDescription>
                        <span className="font-mono">{title}</span> · {t.flowsPage.fillHint}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                    {/* Variable inputs */}
                    <div className="space-y-2.5">
                        {variables.map((v) => (
                            <label key={v} className="block space-y-1">
                                <span className="font-mono text-[11px] text-primary">
                                    &lt;{v}&gt;
                                </span>
                                <Input
                                    value={values[v] ?? ""}
                                    onChange={(e) =>
                                        setValues((prev) => ({ ...prev, [v]: e.target.value }))
                                    }
                                    placeholder={v}
                                />
                            </label>
                        ))}
                    </div>

                    {/* Live preview */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                {t.flowsPage.preview}
                            </span>
                            {remaining > 0 && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {t.flowsPage.unfilled(remaining)}
                                </span>
                            )}
                        </div>
                        <pre className="whitespace-pre-wrap break-words rounded-none border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                            {filled}
                        </pre>
                    </div>
                </div>

                <SheetFooter className="flex-row justify-end gap-2 border-t">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValues({})}
                        disabled={Object.keys(values).length === 0}
                    >
                        {t.flowsPage.reset}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="text-green-600" /> : <Copy />}
                        {copied ? t.actions.copied : t.flowsPage.copyFilled}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
