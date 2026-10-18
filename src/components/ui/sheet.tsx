"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Sheet: slides from the right on desktop, from the bottom on mobile.
 * Controlled via `open` / `onOpenChange`.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  wide,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Convenience: wraps children in SheetBody and renders this in a SheetFooter. */
  footer?: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={description ? undefined : ""}>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col bg-canvas text-ink shadow-float outline-none",
                  "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-lg",
                  "md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:rounded-none md:border-l md:border-hairline",
                  wide ? "md:w-[560px]" : "md:w-[440px]",
                  className,
                )}
                initial={
                  reduce
                    ? { opacity: 0 }
                    : typeof window !== "undefined" && window.innerWidth < 768
                      ? { y: "100%" }
                      : { x: "100%" }
                }
                animate={reduce ? { opacity: 1 } : { x: 0, y: 0 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : typeof window !== "undefined" && window.innerWidth < 768
                      ? { y: "100%" }
                      : { x: "100%" }
                }
                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
                  <div className="min-w-0">
                    <Dialog.Title className="text-base font-semibold tracking-[-0.01em]">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-0.5 text-sm text-ink-2">
                        {description}
                      </Dialog.Description>
                    ) : null}
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Close">
                      <X />
                    </Button>
                  </Dialog.Close>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  {footer ? (
                    <>
                      <SheetBody>{children}</SheetBody>
                      <SheetFooter>{footer}</SheetFooter>
                    </>
                  ) : (
                    children
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Scrollable body of a Sheet. */
export function SheetBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 pb-5", className)}>{children}</div>;
}

/** Sticky footer of a Sheet (render as the last child). */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}

/** Centered confirm dialog. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hairline bg-canvas p-5 shadow-float outline-none"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 4 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              >
                <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1.5 text-sm text-ink-2">
                    {description}
                  </Dialog.Description>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <Button variant="ghost">Cancel</Button>
                  </Dialog.Close>
                  <Button
                    variant={destructive ? "danger" : "primary"}
                    className={destructive ? "bg-coral-soft" : undefined}
                    onClick={onConfirm}
                    loading={loading}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
