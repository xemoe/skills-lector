"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

/**
 * Shown on a flow's detail page when it has steps but no skill-aware rewrite yet
 * — nudges the user to run the `/flow-enhance <id>` command, with a one-click
 * copy of the exact command.
 */
export function FlowEnhanceHint({ flowId }: { flowId: number }) {
    const t = useT();
    const [copied, setCopied] = useState(false);
    const command = `/flow-enhance ${flowId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-md border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                        {t.flowsPage.enhanceHintTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t.flowsPage.enhanceHintBody}{" "}
                        <code className="rounded-none bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                            {command}
                        </code>
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 rounded-xs"
                onClick={handleCopy}
            >
                {copied ? <Check className="text-green-600" /> : <Copy />}
                {copied ? t.actions.copied : t.flowsPage.enhanceHintCopy}
            </Button>
        </div>
    );
}
