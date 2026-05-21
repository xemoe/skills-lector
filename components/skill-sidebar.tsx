"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Skill, SkillType } from "@/lib/types";

const TYPE_ORDER: SkillType[] = ["personal", "plugin", "project", "local"];

const TYPE_LABELS: Record<SkillType, string> = {
  personal: "Personal",
  plugin: "Plugin",
  project: "Project",
  local: "Local",
};

const TYPE_DOT: Record<SkillType, string> = {
  personal: "bg-blue-500",
  plugin: "bg-purple-500",
  project: "bg-green-500",
  local: "bg-slate-400",
};

export function SkillSidebar({ skills }: { skills: Skill[] }) {
  const pathname = usePathname();
  const currentId =
    pathname && pathname.startsWith("/skills/")
      ? pathname.slice("/skills/".length)
      : null;

  const [query, setQuery] = useState("");
  const activeRef = useRef<HTMLAnchorElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? skills.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            (s.plugin?.name.toLowerCase().includes(q) ?? false),
        )
      : skills;
    return TYPE_ORDER.map((type) => ({
      type,
      items: matched
        .filter((s) => s.type === type)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [skills, query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentId]);

  return (
    <aside className="lg:sticky lg:top-[4.5rem] lg:w-72 lg:shrink-0">
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card lg:max-h-[calc(100vh-6rem)]">
        <Link
          href="/"
          className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <span>All skills</span>
          <span className="ml-auto rounded bg-foreground/10 px-1.5 py-0.5 text-[11px] font-normal tabular-nums text-muted-foreground">
            {skills.length}
          </span>
        </Link>

        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter skills…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-md pl-7"
              aria-label="Filter skills"
            />
          </div>
        </div>

        <nav className="min-h-0 max-h-80 flex-1 overflow-y-auto p-1.5 lg:max-h-none">
          {groups.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              No skills match your filter.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.type} className="mb-1.5 last:mb-0">
                <div className="flex items-center gap-1.5 px-2 pb-1 pt-2">
                  <span
                    className={cn("h-2 w-2 rounded-full", TYPE_DOT[g.type])}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[g.type]}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {g.items.length}
                  </span>
                </div>
                <ul>
                  {g.items.map((s) => {
                    const isActive = s.id === currentId;
                    return (
                      <li key={s.id}>
                        <Link
                          ref={isActive ? activeRef : undefined}
                          href={`/skills/${s.id}`}
                          aria-current={isActive ? "page" : undefined}
                          title={s.description}
                          className={cn(
                            "block border-l-2 py-1.5 pl-2.5 pr-2 transition-colors",
                            isActive
                              ? "border-primary bg-accent"
                              : "border-transparent hover:bg-accent/60",
                          )}
                        >
                          <span
                            className={cn(
                              "block truncate text-sm",
                              isActive
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/90",
                            )}
                          >
                            {s.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {s.description}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>
      </div>
    </aside>
  );
}
