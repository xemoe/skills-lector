/**
 * Fetch JSON from a local API route. `cache: "no-store"` by default so client
 * subscriptions always see fresh scans; pass `init` to override (e.g. POST body).
 * Throws Error(body.error ?? `HTTP <status>`) on a non-OK response.
 */
export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}
