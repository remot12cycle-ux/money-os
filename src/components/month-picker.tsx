"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/dates";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function go(m: string) {
    const next = new URLSearchParams(sp.toString());
    if (m === currentMonth()) next.delete("month");
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
        className="num min-w-[132px] rounded-[7px] px-2 text-sm font-medium hover:bg-raised disabled:opacity-60"
        onClick={() => go(currentMonth())}
        disabled={pending || month === currentMonth()}
        title="Jump to current month"
      >
        {monthLabel(month)}
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => go(shiftMonth(month, 1))}
        aria-label="Next month"
        disabled={pending || month >= currentMonth()}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
