import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: gr } = await supabase
    .from("goods_receipts")
    .select(`
      *,
      purchase_orders(po_number, suppliers(name), projects(name)),
      users!goods_receipts_received_by_fkey(full_name)
    `)
    .eq("id", id)
    .single();

  if (!gr) notFound();

  const { data: grLines } = await supabase
    .from("goods_receipt_lines")
    .select("*, po_lines(item_name, quantity, uom)")
    .eq("goods_receipt_id", id);

  return (
    <div>
      <Header title={`Receipt ${gr.gr_number}`} />
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold">{gr.gr_number}</h3>
          <p className="text-sm text-muted">
            PO {gr.purchase_orders?.po_number} — {gr.purchase_orders?.suppliers?.name}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader><h4 className="font-semibold">Receipt Details</h4></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Project</dt><dd>{gr.purchase_orders?.projects?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Received By</dt><dd>{gr.users?.full_name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Received At</dt><dd>{formatDateTime(gr.received_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">DR #</dt><dd>{gr.delivery_receipt_number ?? "-"}</dd></div>
              {gr.notes && <div><dt className="text-muted mb-1">Notes</dt><dd className="rounded bg-gray-50 p-2">{gr.notes}</dd></div>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h4 className="font-semibold">Received Items</h4></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-muted">Item</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Ordered</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Received</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Variance</th>
                  <th className="px-4 py-3 text-center font-medium text-muted">Tolerance</th>
                </tr>
              </thead>
              <tbody>
                {grLines?.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">{line.po_lines?.item_name}</td>
                    <td className="px-4 py-3 text-right">{line.po_lines?.quantity} {line.po_lines?.uom}</td>
                    <td className="px-4 py-3 text-right">{line.received_qty}</td>
                    <td className="px-4 py-3 text-right">{formatPercent(line.variance_pct)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={line.is_within_tolerance ? "success" : "danger"}>
                        {line.is_within_tolerance ? "Within 2%" : "Exceeds"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
