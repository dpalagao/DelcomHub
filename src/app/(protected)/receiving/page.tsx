import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function ReceivingPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: receipts } = await supabase
    .from("goods_receipts")
    .select(`
      *,
      purchase_orders(po_number, status, suppliers(name), projects(name)),
      users!goods_receipts_received_by_fkey(full_name)
    `)
    .order("received_at", { ascending: false });

  const canReceive = ["project_manager", "drp_procurement", "warehouse"].includes(user.role);

  return (
    <div>
      <Header title="Goods Receiving" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Goods Receipts</h3>
            <p className="text-sm text-muted">{receipts?.length ?? 0} records</p>
          </div>
          {canReceive && (
            <Link href="/receiving/new">
              <Button>Receive Goods</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">GR #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">PO</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Project</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Supplier</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">DR #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Received By</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts?.map((gr) => (
                    <tr key={gr.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/receiving/${gr.id}`} className="font-mono text-primary hover:underline">
                          {gr.gr_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{gr.purchase_orders?.po_number}</td>
                      <td className="px-4 py-3">{gr.purchase_orders?.projects?.name}</td>
                      <td className="px-4 py-3">{gr.purchase_orders?.suppliers?.name}</td>
                      <td className="px-4 py-3">{gr.delivery_receipt_number ?? "-"}</td>
                      <td className="px-4 py-3">{gr.users?.full_name}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(gr.received_at)}</td>
                    </tr>
                  ))}
                  {(!receipts || receipts.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted">No goods receipts found.</td>
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
