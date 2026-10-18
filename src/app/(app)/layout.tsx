import { requireUser } from "@/lib/auth";
import { getRefData } from "@/lib/data/core";
import { RefProvider } from "@/components/ref-provider";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ref = await getRefData();
  return (
    <RefProvider value={ref}>
      <AppShell email={user.email} theme={ref.profile.theme}>
        {children}
      </AppShell>
    </RefProvider>
  );
}
