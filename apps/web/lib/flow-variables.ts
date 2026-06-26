// Pure helpers for the `<placeholder>` variables that appear in flow prompts
// (e.g. "<server1>", "<component/feature>"). Used by the per-step "Fill
// variables" drawer. Framework-agnostic — no React, safe anywhere.

// A variable is <name> with no nested angle brackets; 1–60 chars keeps it from
// matching stray "<" in prose / code.
const VAR_RE = /<([^<>]{1,60})>/g;

/** Distinct variable names in the text, in first-seen order (without the <>). */
export function extractVariables(text: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of text.matchAll(VAR_RE)) {
        const name = m[1].trim();
        if (name && !seen.has(name)) {
            seen.add(name);
            out.push(name);
        }
    }
    return out;
}

/**
 * Substitute filled values into the text. A blank/missing value leaves its
 * `<name>` placeholder intact. Uses split/join (not regex) so names with
 * regex-special chars like "/" in "<component/feature>" are safe.
 */
export function fillVariables(
    text: string,
    values: Record<string, string>,
): string {
    let out = text;
    for (const [name, val] of Object.entries(values)) {
        if (!val) continue;
        out = out.split(`<${name}>`).join(val);
    }
    return out;
}

/** Count of placeholders still unfilled (distinct names with no value). */
export function unfilledCount(
    variables: string[],
    values: Record<string, string>,
): number {
    return variables.filter((v) => !values[v]?.trim()).length;
}
