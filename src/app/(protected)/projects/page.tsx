import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";
import type { Project } from "@/types/database";

export default async function ProjectsPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, users!projects_project_manager_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Projects" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">All Projects</h3>
            <p className="text-sm text-muted">
              {projects?.length ?? 0} projects
            </p>
          </div>
          {["admin", "drp_procurement", "drp_estimator"].includes(user.role) && (
            <Link href="/projects/new">
              <Button>New Project</Button>
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project: Project & { users: { full_name: string } | null }) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition hover:shadow-md">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-muted">
                        {project.project_code}
                      </p>
                      <h4 className="mt-1 font-semibold truncate">
                        {project.name}
                      </h4>
                      {project.client_name && (
                        <p className="text-sm text-muted truncate">
                          {project.client_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(project.status)}>
                      {formatStatus(project.status)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted">Estimate:</span>
                      <p className="font-medium">
                        {formatCurrency(project.total_estimate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted">PM:</span>
                      <p className="font-medium truncate">
                        {project.users?.full_name ?? "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted">Start:</span>
                      <p className="font-medium">
                        {formatDate(project.start_date)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted">Target End:</span>
                      <p className="font-medium">
                        {formatDate(project.target_end_date)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {(!projects || projects.length === 0) && (
            <div className="col-span-full py-12 text-center text-sm text-muted">
              No projects found. Create your first project to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
