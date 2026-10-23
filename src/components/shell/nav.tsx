"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  CheckSquare,
  HandCoins,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/businesses", label: "Businesses", icon: Briefcase },
  { href: "/committed", label: "Committed", icon: CalendarClock },
  { href: "/budgets", label: "Budgets & Goals", icon: Target },
  { href: "/debts", label: "Debts", icon: HandCoins },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-16 lg:w-60 shrink-0 flex-col border-r border-hairline bg-canvas">
      <div className="flex h-14 items-center gap-2.5 px-3 lg:px-4">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-md bg-mint text-on-mint num text-sm font-semibold"
        >
          M
        </span>
        <span className="hidden lg:block text-[15px] font-semibold tracking-[-0.01em]">
          Money OS
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 pt-2" aria-label="Primary">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors duration-150",
                active ? "bg-raised text-ink" : "text-ink-2 hover:bg-raised hover:text-ink",
              )}
              title={item.label}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  aria-hidden
                  className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-mint"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <item.icon className="size-[18px] shrink-0" aria-hidden />
              <span className="hidden lg:block truncate">{item.label}</span>
              <PendingDot className="ml-auto hidden lg:block" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const MOBILE = [NAV[0], NAV[1], NAV[6], NAV[3]];

export function MobileTabs({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(56px+env(safe-area-inset-bottom))] items-stretch border-t border-hairline bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {MOBILE.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              active ? "text-mint" : "text-ink-2",
            )}
          >
            <span className="relative">
              <item.icon className="size-[22px]" aria-hidden />
              <PendingDot className="absolute -right-1.5 -top-0.5" />
            </span>
            {item.label.split(" ")[0]}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink-2"
      >
        <MoreHorizontal className="size-[22px]" aria-hidden />
        More
      </button>
    </nav>
  );
}

/** Tiny pulse on the link that was just tapped, until its page is on screen. */
function PendingDot({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full bg-mint transition-opacity duration-150",
        pending ? "animate-pulse opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
