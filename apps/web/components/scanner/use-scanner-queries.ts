// apps/web/components/scanner/use-scanner-queries.ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommandScanResult, ScanResult } from "@lector/core/types";

import { SCANNER_QUERY_PREFIX, scannerQk } from "./scanner-query-keys";
import { jsonFetch } from "@/lib/json-fetch";

export { scannerQk };

/** Subscribe to the skills scan result. Initial data is supplied via HydrationBoundary in the page. */
export function useSkillsScan() {
    return useQuery({
        queryKey: scannerQk.skills(),
        queryFn: () => jsonFetch<ScanResult>("/api/skills"),
    });
}

/** Subscribe to the commands scan result. */
export function useCommandsScan() {
    return useQuery({
        queryKey: scannerQk.commands(),
        queryFn: () => jsonFetch<CommandScanResult>("/api/commands"),
    });
}

/** Returns a callback that invalidates every scanner-cached query (skills + commands). */
export function useInvalidateScannerQueries() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: SCANNER_QUERY_PREFIX });
}
