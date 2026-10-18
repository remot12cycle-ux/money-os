"use client";

import { useOptimistic, useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTheme } from "@/lib/actions/settings";
import type { Theme } from "@/lib/db/types";

export function ThemeToggle({ theme }: { theme: Theme }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(theme);
  const isDark =
    optimistic === "dark" ||
    (optimistic === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    start(async () => {
      setOptimistic(next);
      await setTheme(next);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={pending}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
