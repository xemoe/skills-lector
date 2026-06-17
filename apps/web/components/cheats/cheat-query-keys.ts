// Query key for the Cheats list. Kept in a non-"use client" module so the
// /cheats Server Component can import it to seed the per-request QueryClient
// (a "use client" module's exports become opaque references on the server).

export const cheatsQk = {
    list: () => ["cheats", "list"] as const,
};
