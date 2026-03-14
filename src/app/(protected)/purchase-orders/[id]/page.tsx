import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus, formatPercent } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      projects(name, project_code),
      suppliers(name, supplier_code)
    `)
    .eq("id", id)
    .single();

  if (!po) notFound();

  const { data: lines } = await supabase
    .from("po_lines")
    .select("*")
    .eq("po_id", id)
    .order("created_at");

  const { data: milestones } = await supabase
    .from("po_milestones")
    .select("*")
    .eq("po_id", id)
    .order("milestone_number");

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("po_id", id)
    .order("created_at");

  const { data: receipts } = await supabase
    .from("goods_receipts")
    .select("*, users!goods_receipts_received_by_fkey(full_name)")
    .eq("po_id", id)
    .order("received_at", { ascending: false });

  const totalReceived = lines?.reduce((sum, l) => sum + l.received_qty, 0) ?? 0;
  const totalOrdered = lines?.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
  const receivePct = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  const totalPaid = payments?.filter((p) => p.status === "confirmed").reduce((sum, p) => sum + p.amount, 0) ?? 0;

  return (
    <div>
      <Header title={`PO ${po.po_number}`} />
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">{po.po_number}</h3>
            <Badge variant={getStatusVariant(po.status)}>{formatStatus(po.status)}</Badge>
            <Badge variant={po.is_subcontract ? "info" : "default"}>
              {po.is_subcontract ? "Subcontract" : "Material"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {po.projects?.project_code} — {po.projects?.name} | {po.suppliers?.name}
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="PO Amount" value={formatCurrency(po.total_amount)} />
          <StatCard label="Total Paid" value={formatCurrency(totalPaid)} variant={totalPaid >= po.total_amount ? "success" : "default"} />
          <StatCard label="Receiving" value={formatPercent(receivePct)} variant={receivePct >= 100 ? "success" : "default"} />
          <StatCard label="Delivery Date" value={formatDate(po.delivery_date)} />
        </div>

        {/* PO Lines */}
        <Card className="mb-6">
          <CardHeader><h4 className="font-semibold">Line Items</h4></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-muted">Item</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Ordered</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">UOM</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Total</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Received</th>
                  <th className="px-4 py-3 text-center font-medium text-muted">Complete</th>
                </tr>
              </thead>
              <tbody>
                {lines?.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">{line.item_name}</td>
                    <td className="px-4 py-3 text-right">{line.quantity}</td>
                    <td className="px-4 py-3">{line.uom ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(line.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(line.total_price)}</td>
                    <td className="px-4 py-3 text-right">{line.received_qty}</td>
                    <td className="px-4 py-3 text-center">
                      {line.is_fully_received ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge>No</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Milestones (Subcontract) */}
          {po.is_subcontract && (
            <Card>
              <CardHeader><h4 className="font-semibold">Milestones</h4></CardHeader>
              <CardContent>
                {milestones && milestones.length > 0 ? (
                  <div className="space-y-3">
                    {milestones.map((ms) => (
                      <div key={ms.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                        <div>
                          <p className="font-medium">#{ms.milestone_number} {ms.description}</p>
                          <p className="text-xs text-muted">{ms.percentage}% — {formatCurrency(ms.amount)}</p>
                        </div>
                        <Badge variant={getStatusVariant(ms.status)}>{formatStatus(ms.status)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No milestones defined.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          <Card>
            <CardHeader><h4 className="font-semibold">Payments</h4></CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((pay) => (
                    <div key={pay.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                      <div>
                        <span className="font-mono text-sm">{pay.payment_number}</span>
                        <p className="text-xs text-muted">{formatStatus(pay.payment_method)} — {formatDate(pay.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(pay.amount)}</p>
                        <Badge variant={getStatusVariant(pay.status)}>{formatStatus(pay.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No payments yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Goods Receipts */}
          <Card>
            <CardHeader><h4 className="font-semibold">Goods Receipts</h4></CardHeader>
            <CardContent>
              {receipts && receipts.length > 0 ? (
                <div className="space-y-3">
                  {receipts.map((gr) => (
                    <div key={gr.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                      <div>
                        <span className="font-mono text-sm">{gr.gr_number}</span>
                        <p className="text-xs text-muted">
                          By {gr.users?.full_name} — {formatDate(gr.received_at)}
                        </p>
                        {gr.delivery_receipt_number && (
                          <p className="text-xs text-muted">DR# {gr.delivery_receipt_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No goods received yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
