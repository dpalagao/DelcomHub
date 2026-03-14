import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { PRForm } from "./pr-form";

export default async function NewPRPage() {
  const user = await requireRole(["drp_procurement", "project_manager"]);
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .eq("status", "active")
    .order("name");

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, supplier_code")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <Header title="New Purchase Request" />
      <div className="mx-auto max-w-3xl p-6">
        <PRForm
          projects={projects ?? []}
          suppliers={suppliers ?? []}
          userId={user.id}
          userRole={user.role}
        />
      </div>
    </div>
  );
}
