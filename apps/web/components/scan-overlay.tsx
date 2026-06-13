"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WaveSpinner } from "@/components/wave-spinner";
import { useT } from "@/lib/i18n/context";

interface ScanOverlayProps {
    show: boolean;
}

/**
 * Full-screen blocking overlay shown while a rescan is in flight.
 * Rendered through a portal to document.body so it sits above the sticky
 * header (z-40) and any page content, regardless of where the trigger lives.
 */
export function ScanOverlay({ show }: ScanOverlayProps) {
    const t = useT();
    const [mounted, setMounted] = useState(false);

    // Portals need a DOM target; document only exists after the first client render.
    useEffect(() => setMounted(true), []);

    if (!mounted || !show) return null;

    return createPortal(
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-sm duration-150 animate-in fade-in-0"
        >
            <div className="flex flex-col items-center gap-4 px-6 text-center">
                <span className="flex items-center justify-center rounded-none bg-transparent p-0 ring-0 shadow-lg">
                    <WaveSpinner pattern="sweep" size={3} box={28} />
                </span>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                        {t.actions.scanning}
                    </p>
                    <p className="max-w-xs text-xs text-muted-foreground">
                        {t.actions.scanningHint}
                    </p>
                </div>
            </div>
        </div>,
        document.body,
    );
}
