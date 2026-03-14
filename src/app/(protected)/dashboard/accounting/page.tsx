import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate, formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function AccountingDashboard() {
  await requireAuth();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*, purchase_orders(po_number, suppliers(name), projects(name))")
    .order("created_at", { ascending: false });

  const pending = payments?.filter((p) => p.status === "pending") ?? [];
  const onHold = payments?.filter((p) => p.status === "on_hold") ?? [];
  const released = payments?.filter((p) => p.status === "released") ?? [];
  const confirmed = payments?.filter((p) => p.status === "confirmed") ?? [];

  const { data: matchExceptions } = await supabase
    .from("three_way_matches")
    .select("*, purchase_orders(po_number, suppliers(name))")
    .in("match_status", ["qty_variance", "price_variance", "unmatched"])
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <Header title="Accounting Dashboard" />
      <div className="p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending Payments"
            value={formatCurrency(pending.reduce((s, p) => s + p.amount, 0))}
            subtitle={`${pending.length} payments`}
          />
          <StatCard
            label="On Hold"
            value={formatCurrency(onHold.reduce((s, p) => s + p.amount, 0))}
            subtitle={`${onHold.length} payments`}
            variant="warning"
          />
          <StatCard
            label="Released (Awaiting Confirm)"
            value={formatCurrency(released.reduce((s, p) => s + p.amount, 0))}
            subtitle={`${released.length} payments`}
          />
          <StatCard
            label="Confirmed This Month"
            value={formatCurrency(confirmed.reduce((s, p) => s + p.amount, 0))}
            subtitle={`${confirmed.length} payments`}
            variant="success"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Payment Queue</h4>
                <Link href="/payments" className="text-sm text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent>
              {released.length > 0 ? (
                <div className="space-y-2">
                  {released.slice(0, 10).map((pay: any) => (
                    <Link key={pay.id} href={`/payments/${pay.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-2 transition hover:bg-gray-50">
                      <div>
                        <span className="font-mono text-sm">{pay.payment_number}</span>
                        <p className="text-xs text-muted">
                          {pay.purchase_orders?.po_number} — {pay.purchase_orders?.suppliers?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(pay.amount)}</p>
                        <Badge variant={getStatusVariant(pay.status)}>{formatStatus(pay.status)}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No released payments awaiting confirmation.</p>
              )}
            </CardContent>
          </Card>

          {/* 3-Way Match Exceptions */}
          <Card>
            <CardHeader><h4 className="font-semibold">3-Way Match Exceptions</h4></CardHeader>
            <CardContent>
              {matchExceptions && matchExceptions.length > 0 ? (
                <div className="space-y-2">
                  {matchExceptions.map((match: any) => (
                    <div key={match.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2">
                      <div>
                        <span className="font-mono text-sm">{match.purchase_orders?.po_number}</span>
                        <p className="text-xs text-muted">{match.purchase_orders?.suppliers?.name}</p>
                        {match.invoice_number && <p className="text-xs text-muted">Invoice: {match.invoice_number}</p>}
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusVariant(match.match_status)}>
                          {formatStatus(match.match_status)}
                        </Badge>
                        <p className="text-xs text-muted mt-1">Variance: {match.variance_pct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No match exceptions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
