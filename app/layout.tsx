import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Raleway, Noto_Sans_Thai } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/context";
import { getServerI18n } from "@/lib/i18n/server";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-thai",
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("font-sans", raleway.variable, notoSansThai.variable)}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <LanguageProvider initialLocale={locale}>
          <TooltipProvider>
            <SiteHeader />
            <main className="container mx-auto max-w-7xl px-4 py-8">
              {children}
            </main>
          </TooltipProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
