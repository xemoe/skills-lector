"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useLanguage();

    return (
        <div
            role="group"
            aria-label={t.language.label}
            className="flex items-center rounded-none border"
        >
            <Languages
                className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
            />
            {LOCALES.map((l) => (
                <button
                    key={l}
                    type="button"
                    onClick={() => setLocale(l)}
                    aria-pressed={locale === l}
                    className={cn(
                        "px-2 py-1 text-xs transition-colors",
                        locale === l
                            ? "bg-accent font-semibold text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {LOCALE_LABELS[l]}
                </button>
            ))}
        </div>
    );
}
