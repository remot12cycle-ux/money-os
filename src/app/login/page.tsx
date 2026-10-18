import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-md bg-mint text-on-mint num text-sm font-semibold"
          >
            M
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.01em]">Money OS</h1>
            <p className="text-sm text-ink-2">Private. One owner. Sign in to continue.</p>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
