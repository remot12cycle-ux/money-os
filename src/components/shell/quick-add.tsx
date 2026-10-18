"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRight,
  CalendarClock,
  CheckSquare,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionSheet } from "@/components/forms/transaction-sheet";
import { CommittedSheet } from "@/components/forms/committed-sheet";
import { TaskSheet } from "@/components/forms/task-sheet";
import { NAV } from "./nav";
import type { TxType } from "@/lib/db/types";

type Open = null | { kind: "tx"; type: TxType } | { kind: "committed" } | { kind: "task" };

export function QuickAdd() {
  const [palette, setPalette] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const router = useRouter();
  // true after hydration (false during SSR) without a setState-in-effect
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.key === "Escape") setPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(o: Open) {
    setPalette(false);
    // let the palette close before the sheet springs in
    setTimeout(() => setOpen(o), 60);
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => setPalette(true)}
        className="hidden md:inline-flex"
      >
        <Plus /> Quick add
        <kbd className="num ml-1 rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>

      {/* mobile floating button — portaled to <body> so the blurred header can't become its containing block */}
      {mounted
        ? createPortal(
            <button
              type="button"
              aria-label="Quick add"
              onClick={() => setPalette(true)}
              className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-mint text-on-mint shadow-float transition-transform active:scale-95 md:hidden"
            >
              <Plus className="size-6" />
            </button>,
            document.body,
          )
        : null}

      <Dialog.Root open={palette} onOpenChange={setPalette}>
        <AnimatePresence>
          {palette ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div className="fixed inset-0 z-40 bg-black/50" initial={false} exit={{ opacity: 0, transition: { duration: 0.08 } }} />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                {/* Opened dozens of times a day: no entrance animation, only a very short exit fade. */}
                <motion.div
                  className="fixed left-1/2 top-[12vh] z-50 w-[min(94vw,560px)] -translate-x-1/2 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-float outline-none"
                  initial={false}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                  <Dialog.Title className="sr-only">Quick add</Dialog.Title>
                  <Command label="Quick add" loop>
                    <div className="flex items-center gap-2 border-b border-hairline px-3">
                      <Search className="size-4 text-ink-3" aria-hidden />
                      <Command.Input
                        autoFocus
                        placeholder="Add something or jump to a page…"
                        className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
                      />
                    </div>
                    <Command.List className="max-h-[50vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                      <Command.Empty className="px-3 py-6 text-center text-sm text-ink-2">
                        Nothing matches.
                      </Command.Empty>
                      <Command.Group heading="Add">
                        <Item icon={<Minus className="text-coral" />} onSelect={() => go({ kind: "tx", type: "expense" })}>
                          Expense
                        </Item>
                        <Item icon={<Plus className="text-mint" />} onSelect={() => go({ kind: "tx", type: "income" })}>
                          Income
                        </Item>
                        <Item icon={<ArrowLeftRight />} onSelect={() => go({ kind: "tx", type: "transfer" })}>
                          Transfer between accounts
                        </Item>
                        <Item icon={<CalendarClock className="text-amber" />} onSelect={() => go({ kind: "committed" })}>
                          Committed amount (to pay later)
                        </Item>
                        <Item icon={<CheckSquare />} onSelect={() => go({ kind: "task" })}>
                          Task
                        </Item>
                      </Command.Group>
                      <Command.Group heading="Go to">
                        {NAV.map((n) => (
                          <Item
                            key={n.href}
                            icon={<n.icon />}
                            onSelect={() => {
                              setPalette(false);
                              router.push(n.href);
                            }}
                          >
                            {n.label}
                          </Item>
                        ))}
                      </Command.Group>
                    </Command.List>
                  </Command>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>

      <TransactionSheet
        open={open?.kind === "tx"}
        onOpenChange={(o) => !o && setOpen(null)}
        defaults={open?.kind === "tx" ? { type: open.type } : undefined}
      />
      <CommittedSheet open={open?.kind === "committed"} onOpenChange={(o) => !o && setOpen(null)} />
      <TaskSheet open={open?.kind === "task"} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}

function Item({
  icon,
  children,
  onSelect,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm text-ink-2 data-[selected=true]:bg-raised data-[selected=true]:text-ink [&_svg]:size-4"
    >
      {icon}
      {children}
    </Command.Item>
  );
}
