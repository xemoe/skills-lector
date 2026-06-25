/** Canonical composite identity key for a skill/command item in the UI. */
export function itemKey(item: { kind: string; identifier: string }): string {
    return `${item.kind}::${item.identifier}`;
}
