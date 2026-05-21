import type { SkillType } from "@/lib/types";

/**
 * Per-type colour treatment. The display label lives in the i18n dictionary
 * (`t.skillTypes`) so it can be localized.
 */
export const SKILL_TYPE_META: Record<SkillType, { badge: string; dot: string }> =
  {
    personal: {
      badge: "border-blue-200 bg-blue-50 text-blue-700",
      dot: "bg-blue-500",
    },
    plugin: {
      badge: "border-purple-200 bg-purple-50 text-purple-700",
      dot: "bg-purple-500",
    },
    project: {
      badge: "border-green-200 bg-green-50 text-green-700",
      dot: "bg-green-500",
    },
    local: {
      badge: "border-slate-300 bg-slate-100 text-slate-600",
      dot: "bg-slate-400",
    },
  };
