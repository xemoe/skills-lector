// Query keys for Flows. Kept in a non-"use client" module so the
// /flows Server Component can import it to seed the per-request QueryClient
// (a "use client" module's exports become opaque references on the server).

export const flowsQk = {
    list: () => ["flows", "list"] as const,
    detail: (id: number) => ["flows", "detail", id] as const,
};
