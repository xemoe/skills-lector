"use client";

import { cn } from "@/lib/utils";
import type { SkillType } from "@lector/core/types";
import { SKILL_TYPE_META } from "@/components/skill-type";
import { useT } from "@/lib/i18n/context";

/** A bare colour dot standing in for the type label — used in dense table rows. */
export function SkillTypeDot({
    type,
    className,
}: {
    type: SkillType;
    className?: string;
}) {
    const t = useT();
    const label = t.skillTypes[type];
    return (
        <span
            role="img"
            aria-label={label}
            title={label}
            className={cn(
                "inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle",
                SKILL_TYPE_META[type].dot,
                SKILL_TYPE_META[type].glow,
                className,
            )}
        />
    );
}
