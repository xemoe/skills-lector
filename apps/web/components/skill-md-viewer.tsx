"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/context";

export function SkillMdViewer({
    preview,
    raw,
    copyLabel = "SKILL.md",
}: {
    // Pre-rendered on the server so react-markdown stays out of the client bundle.
    preview: React.ReactNode;
    raw: string;
    /** Name of the file being shown — used in the copy button's accessible label. */
    copyLabel?: string;
}) {
    const t = useT();
    const [copied, setCopied] = useState(false);

    async function copyRaw() {
        try {
            await navigator.clipboard.writeText(raw);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }

    return (
        <Tabs defaultValue="preview">
            <div className="flex items-center justify-between gap-2">
                <TabsList>
                    <TabsTrigger value="preview">{t.viewer.preview}</TabsTrigger>
                    <TabsTrigger value="raw">{t.viewer.raw}</TabsTrigger>
                </TabsList>
                <Button
                    variant="outline"
                    onClick={copyRaw}
                    title={t.viewer.copyRaw(copyLabel)}
                    aria-label={t.viewer.copyRaw(copyLabel)}
                >
                    {copied ? (
                        <>
                            <Check className="text-green-600" />
                            {t.viewer.copied}
                        </>
                    ) : (
                        <>
                            <Copy />
                            {t.viewer.copy}
                        </>
                    )}
                </Button>
            </div>
            <TabsContent value="preview">{preview}</TabsContent>
            <TabsContent value="raw">
                <pre className="overflow-x-auto rounded-none border bg-secondary/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {raw}
                </pre>
            </TabsContent>
        </Tabs>
    );
}
