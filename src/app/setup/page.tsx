import type { Metadata } from "next";

export const metadata: Metadata = { title: "Setup required" };

const STEPS = [
  {
    title: "Create a Supabase project",
    body: "supabase.com → New project. Any region close to you (eu-west is good for Morocco). Keep the database password somewhere safe.",
  },
  {
    title: "Run the database migration",
    body: "In the Supabase dashboard open SQL Editor → New query, paste the contents of supabase/migrations/0001_init.sql from the repo and run it. It creates all tables, security rules and the seed function.",
  },
  {
    title: "Lock sign-ups and create your user",
    body: "Authentication → Providers → Email: turn OFF “Allow new users to sign up”. Then Authentication → Users → Add user: your email + a strong password (tick “auto confirm”).",
  },
  {
    title: "Add the environment variables to Vercel",
    body: "Project → Settings → Environment Variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY come from Supabase → Project Settings → API Keys. SUPABASE_SERVICE_ROLE_KEY is the secret key on the same page (server-only, needed for the ingest API). CRON_SECRET is any long random string.",
  },
  {
    title: "Redeploy",
    body: "Deployments → ⋯ → Redeploy. This page disappears and the login screen appears. Sign in once: your $5,000 starting capital, entities and categories are seeded automatically.",
  },
];

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-md bg-mint text-on-mint num text-sm font-semibold">M</span>
        <div>
          <h1 className="text-lg font-semibold tracking-[-0.01em]">Money OS needs its database</h1>
          <p className="text-sm text-ink-2">Supabase isn&apos;t connected yet. Five steps, about ten minutes.</p>
        </div>
      </div>
      <ol className="flex flex-col divide-y divide-hairline">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 py-4">
            <span className="num mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-raised text-xs font-medium text-ink-2">
              {i + 1}
            </span>
            <div>
              <h2 className="text-sm font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-xs text-ink-3">
        Env check: <code className="num">NEXT_PUBLIC_SUPABASE_URL</code> is{" "}
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? "set but points to a placeholder" : "missing"}.
      </p>
    </main>
  );
}
