import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus, formatPercent } from "@/lib/format";
import Link from "next/link";

export default async function PMDashboard() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: myProjects } = await supabase
    .from("projects")
    .select("*, project_cost_categories(budget_value, encumbered_value, actual_value)")
    .eq("project_manager_id", user.id)
    .in("status", ["active", "on_hold"])
    .order("name");

  const { data: myPRs } = await supabase
    .from("purchase_requests")
    .select("id, pr_number, status, total_amount, projects(name)")
    .eq("owner_id", user.id)
    .in("status", ["draft", "submitted", "approved"])
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: upcomingDeliveries } = await supabase
    .from("purchase_orders")
    .select("id, po_number, delivery_date, status, suppliers(name), projects!inner(project_manager_id, name)")
    .eq("projects.project_manager_id", user.id)
    .in("status", ["approved", "partially_received"])
    .order("delivery_date")
    .limit(10);

  const totalBudget = myProjects?.reduce((s: number, p: any) =>
    s + (p.project_cost_categories?.reduce((cs: number, c: any) => cs + (c.budget_value ?? 0), 0) ?? 0), 0) ?? 0;
  const totalSpent = myProjects?.reduce((s: number, p: any) =>
    s + (p.project_cost_categories?.reduce((cs: number, c: any) => cs + c.actual_value, 0) ?? 0), 0) ?? 0;

  return (
    <div>
      <Header title="Project Manager Dashboard" />
      <div className="p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="My Projects" value={myProjects?.length ?? 0} />
          <StatCard label="Total Budget" value={formatCurrency(totalBudget)} />
          <StatCard label="Total Spent" value={formatCurrency(totalSpent)} />
          <StatCard label="Active PRs" value={myPRs?.length ?? 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Projects */}
          <Card>
            <CardHeader><h4 className="font-semibold">My Projects</h4></CardHeader>
            <CardContent>
              {myProjects && myProjects.length > 0 ? (
                <div className="space-y-3">
                  {myProjects.map((project: any) => {
                    const budget = project.project_cost_categories?.reduce((s: number, c: { budget_value: number | null }) => s + (c.budget_value ?? 0), 0) ?? 0;
                    const encumbered = project.project_cost_categories?.reduce((s: number, c: { encumbered_value: number }) => s + c.encumbered_value, 0) ?? 0;
                    const pct = budget > 0 ? (encumbered / budget) * 100 : 0;
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-xs text-muted">{project.project_code}</p>
                          </div>
                          <Badge variant={getStatusVariant(project.status)}>{formatStatus(project.status)}</Badge>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted">
                            <span>Budget: {formatCurrency(budget)}</span>
                            <span>{formatPercent(pct)}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-gray-100">
                            <div className={`h-2 rounded-full ${pct > 95 ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">No active projects assigned.</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deliveries */}
          <Card>
            <CardHeader><h4 className="font-semibold">Upcoming Deliveries</h4></CardHeader>
            <CardContent>
              {upcomingDeliveries && upcomingDeliveries.length > 0 ? (
                <div className="space-y-2">
                  {upcomingDeliveries.map((po: any) => (
                    <Link key={po.id} href={`/purchase-orders/${po.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 transition hover:bg-gray-50">
                      <div>
                        <span className="font-mono text-sm">{po.po_number}</span>
                        <p className="text-xs text-muted">{po.suppliers?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{formatDate(po.delivery_date)}</p>
                        <Badge variant={getStatusVariant(po.status)}>{formatStatus(po.status)}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No upcoming deliveries.</p>
              )}
            </CardContent>
          </Card>

          {/* My PRs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">My Purchase Requests</h4>
                <Link href="/purchase-requests" className="text-sm text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent>
              {myPRs && myPRs.length > 0 ? (
                <div className="space-y-2">
                  {myPRs.map((pr: any) => (
                    <Link key={pr.id} href={`/purchase-requests/${pr.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 transition hover:bg-gray-50">
                      <div>
                        <span className="font-mono text-sm">{pr.pr_number}</span>
                        <span className="ml-2 text-xs text-muted">{pr.projects?.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(pr.total_amount)}</span>
                        <Badge variant={getStatusVariant(pr.status)}>{formatStatus(pr.status)}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No active purchase requests.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
