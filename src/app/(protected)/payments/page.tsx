import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function PaymentsPage() {
  const user = await requireRole(["admin", "accounting"]);
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select(`
      *,
      purchase_orders(po_number, projects(name))
    `)
    .order("created_at", { ascending: false });

  const pending = payments?.filter((p) => p.status === "pending") ?? [];
  const onHold = payments?.filter((p) => p.status === "on_hold") ?? [];
  const released = payments?.filter((p) => p.status === "released") ?? [];
  const confirmed = payments?.filter((p) => p.status === "confirmed") ?? [];

  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalOnHold = onHold.reduce((s, p) => s + p.amount, 0);
  const totalConfirmed = confirmed.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <Header title="Payments & Disbursements" />
      <div className="p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending" value={formatCurrency(totalPending)} subtitle={`${pending.length} payments`} />
          <StatCard label="On Hold" value={formatCurrency(totalOnHold)} subtitle={`${onHold.length} payments`} variant="warning" />
          <StatCard label="Released" value={formatCurrency(released.reduce((s, p) => s + p.amount, 0))} subtitle={`${released.length} payments`} variant="info" />
          <StatCard label="Confirmed" value={formatCurrency(totalConfirmed)} subtitle={`${confirmed.length} payments`} variant="success" />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">All Payments</h3>
          {user.role === "accounting" && (
            <Link href="/payments/new">
              <Button>Create Payment</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">Payment #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">PO</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Project</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Method</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments?.map((pay) => (
                    <tr key={pay.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/payments/${pay.id}`} className="font-mono text-primary hover:underline">
                          {pay.payment_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{pay.purchase_orders?.po_number}</td>
                      <td className="px-4 py-3">{pay.purchase_orders?.projects?.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(pay.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge>{formatStatus(pay.payment_method)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={getStatusVariant(pay.status)}>{formatStatus(pay.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{pay.reference_number ?? "-"}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(pay.created_at)}</td>
                    </tr>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">No payments found.</td>
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
