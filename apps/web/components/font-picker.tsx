"use client";

import { useState } from "react";
import { Type } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/context";
import {
    type FontChoice,
    FONTS,
    FONT_CLASSES,
    FONT_COOKIE,
    fontClass,
} from "@/lib/font";

/**
 * Topbar dropdown that swaps the whole-site font. Toggles the font class on
 * `<html>` (which remaps `--font-active`, cascading into every `font-sans` /
 * `font-heading` user) and persists the choice in a cookie so the server renders
 * the matching class on the next load — no flash.
 */
export function FontPicker({ initialFont }: { initialFont: FontChoice }) {
    const t = useT();
    const [font, setFont] = useState<FontChoice>(initialFont);

    function choose(next: FontChoice) {
        const root = document.documentElement;
        root.classList.remove(...FONT_CLASSES);
        const cls = fontClass(next);
        if (cls) root.classList.add(cls);
        document.cookie = `${FONT_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        setFont(next);
    }

    return (
        <Select value={font} onValueChange={(v) => choose(v as FontChoice)}>
            <SelectTrigger
                size="sm"
                className="w-auto gap-1.5 rounded-sm"
                aria-label={t.font.label}
                title={t.font.label}
            >
                <Type className="size-3.5 text-muted-foreground" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {FONTS.map((f) => (
                    <SelectItem
                        key={f.id}
                        value={f.id}
                        style={{ fontFamily: `var(${f.cssVar})` }}
                    >
                        {f.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
