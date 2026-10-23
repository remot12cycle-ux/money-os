import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Chip, EntityDot } from "@/components/ui/primitives";
import type { EntityRow, ProjectStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/** COD and digital products sell products; everything else runs projects. */
export function projectNoun(entity: Pick<EntityRow, "slug" | "name">): { one: string; many: string } {
  const key = `${entity.slug} ${entity.name}`.toLowerCase();
  return /cod|digital|product|store|shop/.test(key) ? { one: "product", many: "Products" } : { one: "project", many: "Projects" };
}

export function StatusChip({ status }: { status: ProjectStatus }) {
  const tone = status === "active" ? "mint" : status === "idea" ? "amber" : "neutral";
  const label = { idea: "Idea", active: "Active", paused: "Paused", archived: "Archived" }[status];
  return <Chip tone={tone}>{label}</Chip>;
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-2">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 ? <ChevronRight className="size-3.5 text-ink-3" aria-hidden /> : null}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Switch between businesses without going back to the overview. */
export function BusinessTabs({ list, activeId, month }: { list: EntityRow[]; activeId?: string; month?: string }) {
  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 md:mx-0 md:px-0" role="tablist">
      <Link
        href={{ pathname: "/businesses", query: month ? { month } : {} }}
        role="tab"
        aria-selected={!activeId}
        className={cn("relative flex h-10 shrink-0 items-center px-3 text-sm transition-colors", !activeId ? "text-ink" : "text-ink-2 hover:text-ink")}
      >
        All
        {!activeId ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" /> : null}
      </Link>
      {list.map((e) => {
        const active = e.id === activeId;
        return (
          <Link
            key={e.id}
            href={{ pathname: `/businesses/${e.slug}`, query: month ? { month } : {} }}
            role="tab"
            aria-selected={active}
            className={cn("relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm transition-colors", active ? "text-ink" : "text-ink-2 hover:text-ink")}
          >
            <EntityDot color={e.color} />
            {e.name}
            {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" /> : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Six little bars of net result per period — server-rendered, no JS. */
export function NetBars({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  return (
    <div className={cn("flex h-10 items-center gap-1", className)} aria-hidden>
      {values.map((v, i) => (
        <div key={i} className="relative flex h-full w-2.5 flex-col justify-center">
          <div
            className={cn("absolute left-0 right-0 rounded-[2px]", v >= 0 ? "bottom-1/2 bg-mint" : "top-1/2 bg-coral", v === 0 && "bg-hairline-strong")}
            style={{ height: `${Math.max(v === 0 ? 1 : 3, (Math.abs(v) / max) * 50)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
