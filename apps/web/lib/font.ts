/** Site font handling shared by the server (cookie reader) and the client (picker). */

export type FontChoice =
    | "raleway"
    | "inter"
    | "merriweather"
    | "jetbrains"
    | "geist"
    | "poppins"
    | "space-grotesk"
    | "lora"
    | "playfair"
    | "ibm-plex-mono";

export const DEFAULT_FONT: FontChoice = "raleway";

/** Cookie that persists the chosen font so the server renders the matching class. */
export const FONT_COOKIE = "skills-lector-font";

/**
 * One selectable family. `className` is the html class that remaps `--font-active`
 * (see globals.css); empty for the default. `cssVar` previews the option in its
 * own face. The default uses no class so the base theme font stays untouched.
 */
export const FONTS: { id: FontChoice; label: string; className: string; cssVar: string }[] = [
    { id: "raleway", label: "Raleway", className: "", cssVar: "--font-raleway" },
    { id: "inter", label: "Inter", className: "font-inter", cssVar: "--font-inter" },
    {
        id: "merriweather",
        label: "Merriweather",
        className: "font-merriweather",
        cssVar: "--font-merriweather",
    },
    {
        id: "jetbrains",
        label: "JetBrains Mono",
        className: "font-jetbrains",
        cssVar: "--font-jetbrains",
    },
    { id: "geist", label: "Geist", className: "font-geist", cssVar: "--font-geist" },
    { id: "poppins", label: "Poppins", className: "font-poppins", cssVar: "--font-poppins" },
    {
        id: "space-grotesk",
        label: "Space Grotesk",
        className: "font-space-grotesk",
        cssVar: "--font-space-grotesk",
    },
    { id: "lora", label: "Lora", className: "font-lora", cssVar: "--font-lora" },
    {
        id: "playfair",
        label: "Playfair Display",
        className: "font-playfair",
        cssVar: "--font-playfair",
    },
    {
        id: "ibm-plex-mono",
        label: "IBM Plex Mono",
        className: "font-ibm-plex-mono",
        cssVar: "--font-ibm-plex-mono",
    },
];

/** Every non-empty font class — used to clear the old one before applying the next. */
export const FONT_CLASSES = FONTS.map((f) => f.className).filter(Boolean);

export function isFont(value: unknown): value is FontChoice {
    return FONTS.some((f) => f.id === value);
}

export function fontClass(id: FontChoice): string {
    return FONTS.find((f) => f.id === id)?.className ?? "";
}
