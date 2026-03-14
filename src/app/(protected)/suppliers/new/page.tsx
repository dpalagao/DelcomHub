import { requireRole } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { SupplierForm } from "./supplier-form";

export default async function NewSupplierPage() {
  await requireRole(["admin", "drp_procurement"]);

  return (
    <div>
      <Header title="New Supplier" />
      <div className="mx-auto max-w-2xl p-6">
        <SupplierForm />
      </div>
    </div>
  );
}
