import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatStatus, formatCurrency } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (!supplier) notFound();

  const { data: recentPOs } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, total_amount, project_id, projects(name)")
    .eq("supplier_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalPOValue = recentPOs?.reduce((sum, po) => sum + po.total_amount, 0) ?? 0;

  return (
    <div>
      <Header title={supplier.name} />
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted">{supplier.supplier_code}</span>
            <Badge variant={supplier.is_active ? "success" : "danger"}>
              {supplier.is_active ? "Active" : "Inactive"}
            </Badge>
            {supplier.is_approved_vendor && (
              <Badge variant="info">Approved Vendor</Badge>
            )}
          </div>
          <h3 className="mt-1 text-xl font-bold">{supplier.name}</h3>
          <p className="text-sm text-muted">{formatStatus(supplier.type)}</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Performance Score" value={supplier.performance_score?.toFixed(1) ?? "N/A"} />
          <StatCard label="Delivery Reliability" value={supplier.avg_delivery_reliability ? `${supplier.avg_delivery_reliability.toFixed(1)}%` : "N/A"} />
          <StatCard label="Price Competitiveness" value={supplier.avg_price_competitiveness?.toFixed(1) ?? "N/A"} />
          <StatCard label="Total PO Value" value={formatCurrency(totalPOValue)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><h4 className="font-semibold">Contact Information</h4></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Contact Person</dt><dd>{supplier.contact_person ?? "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Phone</dt><dd>{supplier.phone ?? "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{supplier.email ?? "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Address</dt><dd>{supplier.address ?? "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">TIN</dt><dd>{supplier.tax_id ?? "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Payment Terms</dt><dd>{supplier.payment_terms ?? "-"}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h4 className="font-semibold">Recent Purchase Orders</h4></CardHeader>
            <CardContent>
              {recentPOs && recentPOs.length > 0 ? (
                <div className="space-y-2">
                  {recentPOs.map((po: any) => (
                    <div key={po.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2">
                      <div>
                        <span className="font-mono text-sm">{po.po_number}</span>
                        <p className="text-xs text-muted">{po.projects?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(po.total_amount)}</p>
                        <Badge variant={po.status === "approved" ? "success" : "primary"}>
                          {formatStatus(po.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No purchase orders yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
