import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function PurchaseOrdersPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: pos } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      projects(name, project_code),
      suppliers(name)
    `)
    .order("created_at", { ascending: false });

  const canCreate = ["admin", "drp_procurement"].includes(user.role);

  return (
    <div>
      <Header title="Purchase Orders" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">All Purchase Orders</h3>
            <p className="text-sm text-muted">{pos?.length ?? 0} records</p>
          </div>
          {canCreate && (
            <Link href="/purchase-orders/new">
              <Button>New PO</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">PO #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Project</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Supplier</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Type</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Delivery</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pos?.map((po) => (
                    <tr key={po.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/purchase-orders/${po.id}`} className="font-mono text-primary hover:underline">
                          {po.po_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{po.projects?.name}</div>
                        <div className="text-xs text-muted">{po.projects?.project_code}</div>
                      </td>
                      <td className="px-4 py-3">{po.suppliers?.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(po.total_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={po.is_subcontract ? "info" : "default"}>
                          {po.is_subcontract ? "Subcontract" : "Material"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={getStatusVariant(po.status)}>{formatStatus(po.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDate(po.delivery_date)}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(po.created_at)}</td>
                    </tr>
                  ))}
                  {(!pos || pos.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">No purchase orders found.</td>
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
