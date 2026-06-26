"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Flow } from "@lector/presets/types";

import { flowsQk } from "./flow-query-keys";
import { jsonFetch } from "@/lib/json-fetch";

export { flowsQk };

// ---------------------------------------------------------------------------
// Response interfaces
// ---------------------------------------------------------------------------

export interface FlowsListResponse {
    flows: Flow[];
}

export interface FlowDetailResponse {
    flow: Flow;
}

export interface FlowSeedResponse {
    created: Flow[];
}

export interface FlowDeleteResponse {
    ok: true;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateFlowVars {
    slug: string;
    name: string;
    description?: string | null;
}

export interface UpdateFlowVars {
    id: number;
    name?: string;
    description?: string | null;
}

export interface SetStepsVars {
    id: number;
    cheatIds: number[];
}

export interface DeleteFlowVars {
    id: number;
}

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/** Subscribe to the full flows list. Seeded via HydrationBoundary on /flows. */
export function useFlowsList() {
    return useQuery({
        queryKey: flowsQk.list(),
        queryFn: () => jsonFetch<FlowsListResponse>("/api/flows"),
    });
}

/** Subscribe to a single flow by numeric id. Seeded via HydrationBoundary on /flows/[id]. */
export function useFlow(id: number) {
    return useQuery({
        queryKey: flowsQk.detail(id),
        queryFn: () => jsonFetch<FlowDetailResponse>(`/api/flows/${id}`),
    });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Create a new flow (POST /api/flows). Invalidates the list on settle. */
export function useCreateFlow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: CreateFlowVars) =>
            jsonFetch<FlowDetailResponse>("/api/flows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vars),
            }),
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: flowsQk.list() });
        },
    });
}

/** Update a flow's name / description (PATCH /api/flows/[id]). Invalidates list + detail. */
export function useUpdateFlow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateFlowVars) =>
            jsonFetch<FlowDetailResponse>(`/api/flows/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSettled: (_data, _err, vars) => {
            void qc.invalidateQueries({ queryKey: flowsQk.list() });
            void qc.invalidateQueries({ queryKey: flowsQk.detail(vars.id) });
        },
    });
}

/**
 * Reorder / add / remove steps (PUT /api/flows/[id]/steps).
 * Optimistically patches the detail cache so reorder feels instant.
 * Rolls back on error. Invalidates list + detail on settle.
 */
export function useSetSteps() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, cheatIds }: SetStepsVars) =>
            jsonFetch<FlowDetailResponse>(`/api/flows/${id}/steps`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cheatIds }),
            }),
        onMutate: async ({ id, cheatIds }) => {
            await qc.cancelQueries({ queryKey: flowsQk.detail(id) });
            const prev = qc.getQueryData<FlowDetailResponse>(flowsQk.detail(id));
            qc.setQueryData<FlowDetailResponse>(flowsQk.detail(id), (old) =>
                old
                    ? { ...old, flow: { ...old.flow, steps: cheatIds } }
                    : old,
            );
            return { prev };
        },
        onError: (_err, vars, ctx) => {
            if (ctx?.prev) {
                qc.setQueryData(flowsQk.detail(vars.id), ctx.prev);
            }
        },
        onSettled: (_data, _err, vars) => {
            void qc.invalidateQueries({ queryKey: flowsQk.list() });
            void qc.invalidateQueries({ queryKey: flowsQk.detail(vars.id) });
        },
    });
}

/** Delete a flow (DELETE /api/flows/[id]). Invalidates list on settle. */
export function useDeleteFlow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: DeleteFlowVars) =>
            jsonFetch<FlowDeleteResponse>(`/api/flows/${id}`, { method: "DELETE" }),
        onSettled: (_data, _err, vars) => {
            void qc.invalidateQueries({ queryKey: flowsQk.list() });
            void qc.invalidateQueries({ queryKey: flowsQk.detail(vars.id) });
        },
    });
}

/** Auto-seed starter flows from existing cheats (POST /api/flows/seed). Invalidates list on settle. */
export function useSeedFlows() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            jsonFetch<FlowSeedResponse>("/api/flows/seed", { method: "POST" }),
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: flowsQk.list() });
        },
    });
}
