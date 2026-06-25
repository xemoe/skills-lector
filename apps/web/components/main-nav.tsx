"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Boxes,
    SquareTerminal,
    Webhook,
    SlidersHorizontal,
    ChartColumn,
    Network,
    GitBranch,
    Compass,
    Lightbulb,
    ScrollText,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

const LINKS = [
    { href: "/", key: "skills", Icon: Boxes },
    { href: "/commands", key: "commands", Icon: SquareTerminal },
    { href: "/hooks", key: "hooks", Icon: Webhook },
    { href: "/presets", key: "presets", Icon: SlidersHorizontal },
    { href: "/analytic", key: "analytics", Icon: ChartColumn },
    { href: "/graph", key: "graph", Icon: Network },
    { href: "/sources", key: "sources", Icon: GitBranch },
    { href: "/discover", key: "discover", Icon: Compass },
    { href: "/usecase", key: "usecase", Icon: Lightbulb },
    { href: "/cheats", key: "cheats", Icon: ScrollText },
] as const;

export function MainNav() {
    const pathname = usePathname();
    const t = useT();
    return (
        <TooltipProvider>
            <nav className="flex items-center gap-1">
                {LINKS.map(({ href, key, Icon }) => {
                    const active =
                        href === "/"
                            ? pathname === "/" || pathname.startsWith("/skills")
                            : pathname.startsWith(href);
                    const label = t.nav[key];
                    return (
                        <Tooltip key={href}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={href}
                                    aria-label={label}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-2 whitespace-nowrap rounded-md p-2 px-3 text-sm transition-colors",
                                        active
                                            ? "bg-accent font-semibold text-foreground border"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {active && <span>{label}</span>}
                                </Link>
                            </TooltipTrigger>
                            {!active && (
                                <TooltipContent side="bottom">
                                    {label}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    );
                })}
            </nav>
        </TooltipProvider>
    );
}
