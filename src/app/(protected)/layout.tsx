import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <AppShell userRole={user.role} userName={user.full_name}>
      {children}
    </AppShell>
  );
}
