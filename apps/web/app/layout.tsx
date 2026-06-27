import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { LowPolyBackground } from "@/components/lowpoly-background";
import {
    Raleway,
    Noto_Sans_Thai,
    Inter,
    Merriweather,
    JetBrains_Mono,
    Geist,
    Poppins,
    Space_Grotesk,
    Lora,
    Playfair_Display,
    IBM_Plex_Mono,
} from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/context";
import { getServerI18n } from "@/lib/i18n/server";
import { THEME_COOKIE, DEFAULT_THEME, isTheme } from "@/lib/theme";
import { FONT_COOKIE, DEFAULT_FONT, isFont, fontClass } from "@/lib/font";
import { Providers } from "./providers";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });
const notoSansThai = Noto_Sans_Thai({
    subsets: ["thai"],
    variable: "--font-noto-thai",
});
// Optional picker fonts — not preloaded; the browser fetches one only when applied.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });
const merriweather = Merriweather({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-merriweather",
    preload: false,
});
const jetbrains = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains",
    preload: false,
});
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", preload: false });
const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "600"],
    variable: "--font-poppins",
    preload: false,
});
const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
    preload: false,
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", preload: false });
const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-playfair",
    preload: false,
});
const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "600"],
    variable: "--font-ibm-plex-mono",
    preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getServerI18n();
    return {
        title: t.meta.title,
        description: t.meta.description,
    };
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { locale } = await getServerI18n();
    const cookieStore = await cookies();
    const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
    const theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;
    const fontCookie = cookieStore.get(FONT_COOKIE)?.value;
    const font = isFont(fontCookie) ? fontCookie : DEFAULT_FONT;

    return (
        <html
            lang={locale}
            suppressHydrationWarning
            className={cn(
                "font-sans",
                raleway.variable,
                notoSansThai.variable,
                inter.variable,
                merriweather.variable,
                jetbrains.variable,
                geist.variable,
                poppins.variable,
                spaceGrotesk.variable,
                lora.variable,
                playfair.variable,
                ibmPlexMono.variable,
                fontClass(font),
                theme === "dark" && "dark",
            )}
        >
            <body className="flex min-h-screen flex-col font-sans antialiased gap-4">
                <Providers>
                    <LowPolyBackground />
                    <LanguageProvider initialLocale={locale}>
                        <TooltipProvider>
                            <SiteHeader initialTheme={theme} initialFont={font} />
                            <main className="container mx-auto w-full max-w-7xl flex-1 border border-1 border-stone-500/30 bg-background px-4 py-8 dark:bg-background/74 dark:backdrop-blur rounded-sm shadow-md">
                                {children}
                            </main>
                        </TooltipProvider>
                    </LanguageProvider>
                </Providers>
            </body>
        </html>
    );
}
