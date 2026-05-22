import type { Locale } from "../config";
import { en, type Dictionary } from "./en";
import { th } from "./th";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, th };

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale];
}
