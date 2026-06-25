// apps/web/components/presets/apply-log-table.tsx
"use client";

import { Fragment, useState } from "react";
import { useApplyLog, useApplyLogItems } from "./use-preset-queries";

export function ApplyLogTable() {
    const { data, isLoading } = useApplyLog();
    const [expanded, setExpanded] = useState<number | null>(null);
    const expandedItems = useApplyLogItems(expanded);

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
    if (!data || data.logs.length === 0) {
        return <p className="text-sm text-muted-foreground">No activations yet.</p>;
    }

    function toggle(id: number) {
        setExpanded((cur) => (cur === id ? null : id));
    }

    return (
        <div className="rounded-none border">
            <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs">
                    <tr>
                        <th className="p-2 text-left">When</th>
                        <th className="p-2 text-left">From → To</th>
                        <th className="p-2 text-right">Enabled</th>
                        <th className="p-2 text-right">Disabled</th>
                        <th className="p-2 text-right">Skipped</th>
                        <th className="p-2 text-right">Errors</th>
                        <th className="p-2 text-left">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.logs.map((log) => (
                        <Fragment key={log.id}>
                            <tr
                                className="cursor-pointer border-t hover:bg-accent/30"
                                onClick={() => toggle(log.id)}
                            >
                                <td className="p-2 font-mono text-xs">{log.ts}</td>
                                <td className="p-2 font-mono text-xs">
                                    {log.fromPresetId ?? "—"} → {log.toPresetId ?? "—"}
                                </td>
                                <td className="p-2 text-right">{log.enabledCount}</td>
                                <td className="p-2 text-right">{log.disabledCount}</td>
                                <td className="p-2 text-right">{log.skippedCount}</td>
                                <td className="p-2 text-right">{log.errorCount}</td>
                                <td className="p-2">{log.status}</td>
                            </tr>
                            {expanded === log.id ? (
                                <tr className="border-t bg-secondary/20">
                                    <td colSpan={7} className="p-2">
                                        {expandedItems.isLoading ? (
                                            <p className="text-xs text-muted-foreground">Loading items…</p>
                                        ) : expandedItems.data && expandedItems.data.items.length > 0 ? (
                                            <ul className="space-y-1 font-mono text-xs">
                                                {expandedItems.data.items.map((i, idx) => (
                                                    <li key={idx}>
                                                        [{i.action}] [{i.kind}] {i.identifier}
                                                        {i.message ? (
                                                            <span className="text-muted-foreground"> — {i.message}</span>
                                                        ) : null}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">No items.</p>
                                        )}
                                    </td>
                                </tr>
                            ) : null}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
