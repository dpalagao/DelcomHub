import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRouter() {
  const user = await requireAuth();

  // Route to role-specific dashboard
  switch (user.role) {
    case "admin":
      redirect("/dashboard/admin");
    case "project_manager":
      redirect("/dashboard/pm");
    case "drp_procurement":
      redirect("/dashboard/procurement");
    case "accounting":
      redirect("/dashboard/accounting");
    default:
      redirect("/dashboard/pm");
  }
}
