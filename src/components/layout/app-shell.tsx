import { Sidebar } from "./sidebar";
import type { UserRole } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  userName: string;
}

export function AppShell({ children, userRole, userName }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="ml-64">{children}</main>
    </div>
  );
}
