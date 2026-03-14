import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { POForm } from "./po-form";

export default async function NewPOPage() {
  await requireRole(["admin", "drp_procurement"]);
  const supabase = await createClient();

  // Get approved PRs not yet converted to PO
  const { data: approvedPRs } = await supabase
    .from("purchase_requests")
    .select(`
      id, pr_number, total_amount, supplier_id,
      projects(id, name, project_code),
      suppliers(id, name)
    `)
    .eq("status", "approved")
    .order("created_at");

  return (
    <div>
      <Header title="Create Purchase Order" />
      <div className="mx-auto max-w-3xl p-6">
        <POForm approvedPRs={(approvedPRs ?? []) as any} />
      </div>
    </div>
  );
}
