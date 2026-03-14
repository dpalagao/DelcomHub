import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function PurchaseRequestsPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: prs } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      projects(name, project_code),
      suppliers(name),
      users!purchase_requests_owner_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  const canCreate = ["drp_procurement", "project_manager"].includes(user.role);

  return (
    <div>
      <Header title="Purchase Requests" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">All Purchase Requests</h3>
            <p className="text-sm text-muted">{prs?.length ?? 0} records</p>
          </div>
          {canCreate && (
            <Link href="/purchase-requests/new">
              <Button>New PR</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">PR #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Project</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Supplier</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Owner</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prs?.map((pr) => (
                    <tr key={pr.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/purchase-requests/${pr.id}`} className="font-mono text-primary hover:underline">
                          {pr.pr_number}
                        </Link>
                        {pr.is_over_budget && (
                          <Badge variant="danger" className="ml-2">Over Budget</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{pr.projects?.name}</div>
                        <div className="text-xs text-muted">{pr.projects?.project_code}</div>
                      </td>
                      <td className="px-4 py-3">{pr.suppliers?.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={pr.pr_type === "urgent" ? "warning" : "default"}>
                          {formatStatus(pr.pr_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(pr.total_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={getStatusVariant(pr.status)}>
                          {formatStatus(pr.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{pr.users?.full_name}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(pr.created_at)}</td>
                    </tr>
                  ))}
                  {(!prs || prs.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">
                        No purchase requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
