import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { PaymentForm } from "./payment-form";

export default async function NewPaymentPage() {
  await requireRole(["accounting"]);
  const supabase = await createClient();

  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, po_number, total_amount, supplier_id, suppliers(name), projects(name)")
    .in("status", ["approved", "partially_received", "fully_received"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Create Payment" />
      <div className="mx-auto max-w-2xl p-6">
        <PaymentForm purchaseOrders={(pos ?? []) as any} />
      </div>
    </div>
  );
}
