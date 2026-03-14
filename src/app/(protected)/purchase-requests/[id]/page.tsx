import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import { notFound } from "next/navigation";
import { ApprovalActions } from "./approval-actions";

export default async function PRDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: pr } = await supabase
    .from("purchase_requests")
    .select(`
      *,
      projects(name, project_code),
      suppliers(name, supplier_code),
      users!purchase_requests_owner_id_fkey(full_name),
      project_cost_categories(category_code, name)
    `)
    .eq("id", id)
    .single();

  if (!pr) notFound();

  const { data: lines } = await supabase
    .from("purchase_request_lines")
    .select("*")
    .eq("pr_id", id)
    .order("created_at");

  const { data: approvalLogs } = await supabase
    .from("approval_logs")
    .select("*, users!approval_logs_approved_by_fkey(full_name)")
    .eq("entity_type", "pr")
    .eq("entity_id", id)
    .order("approved_at", { ascending: false });

  const canApprove = user.role === "admin" && pr.status === "submitted";

  return (
    <div>
      <Header title={`PR ${pr.pr_number}`} />
      <div className="p-6">
        {/* PR Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">{pr.pr_number}</h3>
            <Badge variant={getStatusVariant(pr.status)}>{formatStatus(pr.status)}</Badge>
            <Badge variant={pr.pr_type === "urgent" ? "warning" : "default"}>
              {formatStatus(pr.pr_type)}
            </Badge>
            {pr.is_over_budget && <Badge variant="danger">Over Budget</Badge>}
            {pr.is_pre_approved && <Badge variant="success">Pre-Approved</Badge>}
          </div>
        </div>

        {/* Approval Actions */}
        {canApprove && (
          <div className="mb-6">
            <ApprovalActions prId={pr.id} userId={user.id} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PR Details */}
          <Card>
            <CardHeader><h4 className="font-semibold">Request Details</h4></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Project</dt><dd className="font-medium">{pr.projects?.project_code} — {pr.projects?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Supplier</dt><dd className="font-medium">{pr.suppliers?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Cost Category</dt><dd className="font-medium">{pr.project_cost_categories?.category_code} — {pr.project_cost_categories?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Owner</dt><dd className="font-medium">{pr.users?.full_name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Delivery Date</dt><dd className="font-medium">{formatDate(pr.requested_delivery_date)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Total Amount</dt><dd className="text-lg font-bold">{formatCurrency(pr.total_amount)}</dd></div>
                {pr.justification && (
                  <div><dt className="text-muted mb-1">Justification</dt><dd className="rounded-lg bg-gray-50 p-2">{pr.justification}</dd></div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Approval History */}
          <Card>
            <CardHeader><h4 className="font-semibold">Approval History</h4></CardHeader>
            <CardContent>
              {approvalLogs && approvalLogs.length > 0 ? (
                <div className="space-y-3">
                  {approvalLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.users?.full_name}</span>
                        <Badge variant={getStatusVariant(log.action)}>{formatStatus(log.action)}</Badge>
                      </div>
                      {log.notes && <p className="mt-1 text-sm text-muted">{log.notes}</p>}
                      {log.conditions && <p className="mt-1 text-sm text-warning">Conditions: {log.conditions}</p>}
                      <p className="mt-1 text-xs text-muted">{formatDate(log.approved_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No approval actions yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="mt-6">
          <CardHeader><h4 className="font-semibold">Line Items</h4></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Item</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Qty</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">UOM</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines?.map((line, i) => (
                    <tr key={line.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-muted">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{line.item_name}</td>
                      <td className="px-4 py-3 text-right">{line.quantity}</td>
                      <td className="px-4 py-3">{line.uom ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(line.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(line.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold">Total</td>
                    <td className="px-4 py-3 text-right text-lg font-bold">{formatCurrency(pr.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
