"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Cheat } from "@lector/presets/types";

import { cheatsQk } from "./cheat-query-keys";
import { jsonFetch } from "@/lib/json-fetch";

export { cheatsQk };

export interface CheatsListResponse {
    cheats: Cheat[];
}

/** Subscribe to the full cheats list. Seeded via HydrationBoundary on /cheats. */
export function useCheatsList() {
    return useQuery({
        queryKey: cheatsQk.list(),
        queryFn: () => jsonFetch<CheatsListResponse>("/api/cheats"),
    });
}

type ToggleFavoriteVars = { id: number; favorite: boolean };

/** Toggle a cheat's favorite flag, optimistically patching the cached list. */
export function useToggleFavorite() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, favorite }: ToggleFavoriteVars) =>
            jsonFetch<Cheat>(`/api/cheats/${id}/favorite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ favorite }),
            }),
        onMutate: async ({ id, favorite }) => {
            await qc.cancelQueries({ queryKey: cheatsQk.list() });
            const prev = qc.getQueryData<CheatsListResponse>(cheatsQk.list());
            qc.setQueryData<CheatsListResponse>(cheatsQk.list(), (old) =>
                old
                    ? {
                          ...old,
                          cheats: old.cheats.map((c) =>
                              c.id === id ? { ...c, favorite } : c,
                          ),
                      }
                    : old,
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(cheatsQk.list(), ctx.prev);
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: cheatsQk.list() });
        },
    });
}
