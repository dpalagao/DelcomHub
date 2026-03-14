import { requireRole } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { ProjectForm } from "./project-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewProjectPage() {
  await requireRole(["admin", "drp_procurement", "drp_estimator"]);
  const supabase = await createClient();

  const { data: managers } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "project_manager")
    .eq("is_active", true);

  return (
    <div>
      <Header title="New Project" />
      <div className="mx-auto max-w-2xl p-6">
        <ProjectForm managers={managers ?? []} />
      </div>
    </div>
  );
}
