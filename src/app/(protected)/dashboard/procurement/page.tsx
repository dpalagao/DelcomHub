import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function ProcurementDashboard() {
  await requireAuth();
  const supabase = await createClient();

  const [
    { count: openCanvass },
    { count: pendingPRs },
    { count: activePOs },
    { data: recentPRs },
    { data: topSuppliers },
  ] = await Promise.all([
    supabase.from("canvass_sessions").select("*", { count: "exact", head: true }).in("status", ["open", "evaluating"]),
    supabase.from("purchase_requests").select("*", { count: "exact", head: true }).in("status", ["draft", "submitted"]),
    supabase.from("purchase_orders").select("*", { count: "exact", head: true }).in("status", ["approved", "partially_received"]),
    supabase.from("purchase_requests")
      .select("id, pr_number, status, total_amount, projects(name), suppliers(name)")
      .in("status", ["draft", "submitted", "approved"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("suppliers")
      .select("id, name, supplier_code, performance_score, avg_delivery_reliability")
      .eq("is_active", true)
      .order("performance_score", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  return (
    <div>
      <Header title="Procurement Dashboard" />
      <div className="p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open Canvass Sessions" value={openCanvass ?? 0} />
          <StatCard label="PRs in Pipeline" value={pendingPRs ?? 0} />
          <StatCard label="Active POs" value={activePOs ?? 0} />
          <Link href="/purchase-requests/new">
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-primary bg-blue-50/50 p-4 transition hover:bg-blue-50">
              <span className="font-semibold text-primary">+ New PR</span>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PR Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">PR Queue</h4>
                <Link href="/purchase-requests" className="text-sm text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPRs && recentPRs.length > 0 ? (
                <div className="space-y-2">
                  {recentPRs.map((pr: any) => (
                    <Link key={pr.id} href={`/purchase-requests/${pr.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 transition hover:bg-gray-50">
                      <div>
                        <span className="font-mono text-sm">{pr.pr_number}</span>
                        <p className="text-xs text-muted">{pr.projects?.name} — {pr.suppliers?.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(pr.total_amount)}</span>
                        <Badge variant={getStatusVariant(pr.status)}>{formatStatus(pr.status)}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No PRs in pipeline.</p>
              )}
            </CardContent>
          </Card>

          {/* Top Suppliers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Top Suppliers</h4>
                <Link href="/suppliers" className="text-sm text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent>
              {topSuppliers && topSuppliers.length > 0 ? (
                <div className="space-y-2">
                  {topSuppliers.map((sup, i) => (
                    <Link key={sup.id} href={`/suppliers/${sup.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 transition hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium">{sup.name}</p>
                          <p className="text-xs text-muted">{sup.supplier_code}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{sup.performance_score?.toFixed(1) ?? "N/A"}</p>
                        <p className="text-xs text-muted">
                          {sup.avg_delivery_reliability ? `${sup.avg_delivery_reliability}% on-time` : "No data"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No supplier data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
