// The three enhanced-step length variants, in display order. Shared by the
// pipeline drawer (stacked sections) and the copy-combined-prompt picker so both
// walk the same ordered set. Labels are resolved per-locale in the i18n dict.
import type { FlowVariantKey } from "@lector/presets/types";

export const FLOW_VARIANT_KEYS: readonly FlowVariantKey[] = [
    "short",
    "long",
    "precise",
] as const;
