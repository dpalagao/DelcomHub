import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ProjectForm } from "../../new/project-form";
import { notFound } from "next/navigation";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: managers } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "project_manager")
    .eq("is_active", true);

  return (
    <div>
      <Header title={`Edit — ${project.name}`} />
      <div className="mx-auto max-w-2xl p-6">
        <ProjectForm
          managers={managers ?? []}
          initialData={{
            id: project.id,
            name: project.name,
            client_name: project.client_name ?? "",
            site_address: project.site_address ?? "",
            start_date: project.start_date ?? "",
            target_end_date: project.target_end_date ?? "",
            project_manager_id: project.project_manager_id ?? "",
            total_estimate: project.total_estimate,
            status: project.status,
          }}
        />
      </div>
    </div>
  );
}
