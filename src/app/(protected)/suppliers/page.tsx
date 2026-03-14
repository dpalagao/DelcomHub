import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatStatus } from "@/lib/format";
import Link from "next/link";

export default async function SuppliersPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div>
      <Header title="Suppliers" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Supplier Master</h3>
            <p className="text-sm text-muted">{suppliers?.length ?? 0} suppliers</p>
          </div>
          {["admin", "drp_procurement"].includes(user.role) && (
            <Link href="/suppliers/new">
              <Button>Add Supplier</Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Terms</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Approved</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers?.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b border-gray-100 transition hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{supplier.supplier_code}</td>
                      <td className="px-4 py-3">
                        <Link href={`/suppliers/${supplier.id}`} className="font-medium text-primary hover:underline">
                          {supplier.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{formatStatus(supplier.type)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>{supplier.contact_person ?? "-"}</div>
                        {supplier.phone && (
                          <div className="text-xs text-muted">{supplier.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{supplier.payment_terms ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {supplier.is_approved_vendor ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="default">No</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={supplier.is_active ? "success" : "danger"}>
                          {supplier.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {supplier.performance_score != null
                          ? supplier.performance_score.toFixed(1)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {(!suppliers || suppliers.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">
                        No suppliers found.
                      </td>
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
