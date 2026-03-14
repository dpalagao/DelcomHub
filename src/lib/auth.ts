import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@/types/database";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getAppUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return data;
}

export async function requireAuth(): Promise<User> {
  const user = await getAppUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export function canAccess(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  drp_procurement: "DRP Procurement",
  drp_estimator: "DRP Estimator",
  accounting: "Accounting",
  warehouse: "Warehouse",
};
