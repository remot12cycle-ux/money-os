"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/dates";
import { useRef_ } from "@/components/ref-provider";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const startDay = useRef_().profile.period_start_day;
  const now = currentMonth(startDay);

  function go(m: string) {
    const next = new URLSearchParams(sp.toString());
    if (m === now) next.delete("month");
    else next.set("month", m);
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface p-0.5">
      <Button variant="ghost" size="icon-sm" onClick={() => go(shiftMonth(month, -1))} aria-label="Previous month" disabled={pending}>
        <ChevronLeft />
      </Button>
      <button
        type="button"
        className="num min-w-[132px] whitespace-nowrap rounded-[7px] px-2 text-sm font-medium hover:bg-raised disabled:opacity-60"
        onClick={() => go(now)}
        disabled={pending || month === now}
        title={startDay === 1 ? "Jump to current month" : "Jump to current period"}
      >
        {monthLabel(month, startDay)}
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => go(shiftMonth(month, 1))}
        aria-label="Next month"
        disabled={pending || month >= now}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
