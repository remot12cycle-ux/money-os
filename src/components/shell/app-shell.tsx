"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { MobileTabs, NAV, Sidebar } from "./nav";
import { QuickAdd } from "./quick-add";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/db/types";

export function AppShell({
  children,
  email,
  theme,
}: {
  children: React.ReactNode;
  email: string | null;
  theme: Theme;
}) {
  const [more, setMore] = useState(false);
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-hairline bg-canvas/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-md bg-mint text-on-mint num text-xs font-semibold"
            >
              M
            </span>
            <span className="text-sm font-semibold">Money OS</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <QuickAdd />
            <ThemeToggle theme={theme} />
            <form action={logout}>
              <Button variant="ghost" size="icon" type="submit" aria-label="Sign out" title={email ?? "Sign out"}>
                <LogOut />
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pb-10">
          {children}
        </main>
      </div>
      <MobileTabs onMore={() => setMore(true)} />

      <Dialog.Root open={more} onOpenChange={setMore}>
        <AnimatePresence>
          {more ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-40 bg-black/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="fixed inset-x-0 bottom-0 z-50 rounded-t-lg border-t border-hairline bg-canvas p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-float outline-none"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 420, damping: 40 }}
                >
                  <Dialog.Title className="label px-2 pb-2">All sections</Dialog.Title>
                  <div className="grid grid-cols-2 gap-1">
                    {NAV.map((n) => (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setMore(false)}
                        className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-ink-2 hover:bg-raised hover:text-ink"
                      >
                        <n.icon className="size-[18px]" aria-hidden />
                        {n.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </div>
  );
}
