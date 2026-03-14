import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ReceivingForm } from "./receiving-form";

export default async function NewReceivingPage() {
  const user = await requireRole(["project_manager", "drp_procurement", "warehouse"]);
  const supabase = await createClient();

  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, po_number, suppliers(name), projects(name)")
    .in("status", ["approved", "partially_received"])
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Receive Goods" />
      <div className="mx-auto max-w-3xl p-6">
        <ReceivingForm purchaseOrders={(pos ?? []) as any} userId={user.id} />
      </div>
    </div>
  );
}
