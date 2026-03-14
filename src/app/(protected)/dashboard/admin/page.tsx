import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function AdminDashboard() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [
    { count: activeProjects },
    { count: pendingPRs },
    { count: pendingPOs },
    { data: pendingPayments },
    { data: recentPRs },
    { count: heldPayments },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("purchase_requests").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase.from("payments").select("amount").eq("status", "pending"),
    supabase.from("purchase_requests")
      .select("id, pr_number, status, total_amount, is_over_budget, projects(name), suppliers(name)")
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "on_hold"),
  ]);

  const totalPendingDisbursements = pendingPayments?.reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <div>
      <Header title="Admin Dashboard" />
      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Projects" value={activeProjects ?? 0} />
          <StatCard label="PRs Pending Approval" value={pendingPRs ?? 0} variant={pendingPRs && pendingPRs > 0 ? "warning" : "default"} />
          <StatCard label="POs Pending Approval" value={pendingPOs ?? 0} />
          <StatCard label="Pending Disbursements" value={formatCurrency(totalPendingDisbursements)} subtitle={`${heldPayments ?? 0} on hold`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Approval Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Pending Approvals</h4>
                <Link href="/purchase-requests" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPRs && recentPRs.length > 0 ? (
                <div className="space-y-2">
                  {recentPRs.map((pr: any) => (
                    <Link
                      key={pr.id}
                      href={`/purchase-requests/${pr.id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{pr.pr_number}</span>
                          {pr.is_over_budget && <Badge variant="danger">Over Budget</Badge>}
                        </div>
                        <p className="text-xs text-muted">
                          {pr.projects?.name} — {pr.suppliers?.name}
                        </p>
                      </div>
                      <span className="font-medium">{formatCurrency(pr.total_amount)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No pending approvals.</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <h4 className="font-semibold">Quick Actions</h4>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/projects"
                  className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50"
                >
                  <p className="text-2xl font-bold text-primary">{activeProjects ?? 0}</p>
                  <p className="text-sm text-muted">Projects</p>
                </Link>
                <Link
                  href="/suppliers"
                  className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50"
                >
                  <p className="text-sm font-medium">Suppliers</p>
                  <p className="text-xs text-muted">Manage vendor list</p>
                </Link>
                <Link
                  href="/purchase-requests"
                  className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50"
                >
                  <p className="text-sm font-medium">Purchase Requests</p>
                  <p className="text-xs text-muted">Review & approve</p>
                </Link>
                <Link
                  href="/payments"
                  className="rounded-lg border border-gray-200 p-4 text-center transition hover:bg-gray-50"
                >
                  <p className="text-sm font-medium">Payments</p>
                  <p className="text-xs text-muted">Hold/Release</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
