import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime, formatStatus } from "@/lib/format";
import { notFound } from "next/navigation";
import { PaymentActions } from "./payment-actions";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["admin", "accounting"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select(`
      *,
      purchase_orders(po_number, total_amount, projects(name), suppliers(name))
    `)
    .eq("id", id)
    .single();

  if (!payment) notFound();

  return (
    <div>
      <Header title={`Payment ${payment.payment_number}`} />
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <h3 className="text-xl font-bold">{payment.payment_number}</h3>
          <Badge variant={getStatusVariant(payment.status)}>{formatStatus(payment.status)}</Badge>
        </div>

        <Card className="mb-6">
          <CardHeader><h4 className="font-semibold">Payment Details</h4></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">PO</dt><dd className="font-mono">{payment.purchase_orders?.po_number}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Project</dt><dd>{payment.purchase_orders?.projects?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Supplier</dt><dd>{payment.purchase_orders?.suppliers?.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="text-lg font-bold">{formatCurrency(payment.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Method</dt><dd><Badge>{formatStatus(payment.payment_method)}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-muted">Reference</dt><dd>{payment.reference_number ?? "-"}</dd></div>
              {payment.hold_reason && (
                <div><dt className="text-muted mb-1">Hold Reason</dt><dd className="rounded bg-amber-50 p-2 text-warning">{payment.hold_reason}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Created</dt><dd>{formatDateTime(payment.created_at)}</dd></div>
              {payment.released_at && <div className="flex justify-between"><dt className="text-muted">Released</dt><dd>{formatDateTime(payment.released_at)}</dd></div>}
              {payment.confirmed_at && <div className="flex justify-between"><dt className="text-muted">Confirmed</dt><dd>{formatDateTime(payment.confirmed_at)}</dd></div>}
            </dl>
          </CardContent>
        </Card>

        <PaymentActions
          paymentId={payment.id}
          status={payment.status}
          userId={user.id}
          userRole={user.role}
        />
      </div>
    </div>
  );
}
