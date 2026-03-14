import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus, formatPercent } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, users!projects_project_manager_id_fkey(full_name)")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: categories } = await supabase
    .from("project_cost_categories")
    .select("*")
    .eq("project_id", id)
    .order("category_code");

  const { data: recentPRs } = await supabase
    .from("purchase_requests")
    .select("id, pr_number, status, total_amount, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  const totalBudget = categories?.reduce((sum, c) => sum + (c.budget_value ?? 0), 0) ?? 0;
  const totalEncumbered = categories?.reduce((sum, c) => sum + c.encumbered_value, 0) ?? 0;
  const totalActual = categories?.reduce((sum, c) => sum + c.actual_value, 0) ?? 0;
  const utilizationPct = totalBudget > 0 ? (totalEncumbered / totalBudget) * 100 : 0;

  return (
    <div>
      <Header title={project.name} />
      <div className="p-6">
        {/* Project Info */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted">{project.project_code}</span>
              <Badge variant={getStatusVariant(project.status)}>
                {formatStatus(project.status)}
              </Badge>
            </div>
            <h3 className="mt-1 text-xl font-bold">{project.name}</h3>
            {project.client_name && (
              <p className="text-sm text-muted">{project.client_name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${id}/budget`}>
              <Button variant="secondary" size="sm">Budget</Button>
            </Link>
            <Link href={`/projects/${id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Estimate"
            value={formatCurrency(project.total_estimate)}
          />
          <StatCard
            label="Budget Allocated"
            value={formatCurrency(totalBudget)}
          />
          <StatCard
            label="Encumbered"
            value={formatCurrency(totalEncumbered)}
            subtitle={`${formatPercent(utilizationPct)} of budget`}
            variant={utilizationPct > 95 ? "danger" : utilizationPct > 80 ? "warning" : "default"}
          />
          <StatCard
            label="Actual Spent"
            value={formatCurrency(totalActual)}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <h4 className="font-semibold">Project Details</h4>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Project Manager</dt>
                  <dd className="font-medium">{project.users?.full_name ?? "Unassigned"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Site Address</dt>
                  <dd className="font-medium">{project.site_address ?? "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Start Date</dt>
                  <dd className="font-medium">{formatDate(project.start_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Target End</dt>
                  <dd className="font-medium">{formatDate(project.target_end_date)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Budget Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Budget Categories</h4>
                <span className="text-xs text-muted">
                  {categories?.length ?? 0} categories
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {categories && categories.length > 0 ? (
                <div className="space-y-3">
                  {categories.map((cat) => {
                    const pct =
                      cat.budget_value && cat.budget_value > 0
                        ? (cat.encumbered_value / cat.budget_value) * 100
                        : 0;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            <span className="font-mono text-xs text-muted">{cat.category_code}</span>{" "}
                            {cat.name}
                          </span>
                          <span className="text-muted">
                            {formatCurrency(cat.encumbered_value)} / {formatCurrency(cat.budget_value ?? 0)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              pct > 95 ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">No budget categories defined yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent PRs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Recent Purchase Requests</h4>
                <Link href={`/purchase-requests?project=${id}`}>
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPRs && recentPRs.length > 0 ? (
                <div className="space-y-2">
                  {recentPRs.map((pr) => (
                    <Link
                      key={pr.id}
                      href={`/purchase-requests/${pr.id}`}
                      className="flex items-center justify-between rounded-lg p-2 transition hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-mono text-sm">{pr.pr_number}</span>
                        <span className="ml-3 text-sm text-muted">
                          {formatDate(pr.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(pr.total_amount)}
                        </span>
                        <Badge variant={getStatusVariant(pr.status)}>
                          {formatStatus(pr.status)}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No purchase requests yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
