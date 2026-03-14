"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface ApprovedPR {
  id: string;
  pr_number: string;
  total_amount: number;
  supplier_id: string;
  projects: { id: string; name: string; project_code: string } | null;
  suppliers: { id: string; name: string } | null;
}

export function POForm({ approvedPRs }: { approvedPRs: ApprovedPR[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPRs, setSelectedPRs] = useState<string[]>([]);

  const selectedPRData = approvedPRs.filter((pr) => selectedPRs.includes(pr.id));
  const totalAmount = selectedPRData.reduce((sum, pr) => sum + pr.total_amount, 0);
  const supplier = selectedPRData[0]?.suppliers;
  const project = selectedPRData[0]?.projects;

  function togglePR(prId: string) {
    setSelectedPRs((prev) =>
      prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedPRs.length === 0) {
      setError("Select at least one approved PR");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        project_id: project!.id,
        supplier_id: supplier!.id,
        total_amount: totalAmount,
        payment_terms: formData.get("payment_terms") as string || null,
        delivery_date: formData.get("delivery_date") as string || null,
        is_subcontract: formData.get("is_subcontract") === "true",
      })
      .select()
      .single();

    if (poError || !po) {
      setError(poError?.message ?? "Failed to create PO");
      setLoading(false);
      return;
    }

    // Link PRs to PO
    for (const prId of selectedPRs) {
      await supabase
        .from("purchase_requests")
        .update({ po_id: po.id, status: "converted_to_po" })
        .eq("id", prId);

      // Copy PR lines to PO lines
      const { data: prLines } = await supabase
        .from("purchase_request_lines")
        .select("*")
        .eq("pr_id", prId);

      if (prLines) {
        await supabase.from("po_lines").insert(
          prLines.map((line) => ({
            po_id: po.id,
            pr_line_id: line.id,
            item_name: line.item_name,
            quantity: line.quantity,
            uom: line.uom,
            unit_price: line.unit_price,
            total_price: line.total_price,
          }))
        );
      }
    }

    router.push("/purchase-orders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Create PO from Approved PRs</h3>
          <p className="text-sm text-muted">Select approved PRs to consolidate into a Purchase Order</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</div>}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Approved Purchase Requests</h4>
            {approvedPRs.length > 0 ? (
              <div className="space-y-2">
                {approvedPRs.map((pr) => (
                  <label
                    key={pr.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                      selectedPRs.includes(pr.id) ? "border-primary bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedPRs.includes(pr.id)}
                        onChange={() => togglePR(pr.id)}
                        className="rounded"
                      />
                      <div>
                        <span className="font-mono text-sm">{pr.pr_number}</span>
                        <p className="text-xs text-muted">{pr.projects?.name} — {pr.suppliers?.name}</p>
                      </div>
                    </div>
                    <span className="font-medium">{formatCurrency(pr.total_amount)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No approved PRs available for PO conversion.</p>
            )}
          </div>

          {selectedPRs.length > 0 && (
            <>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between text-sm">
                  <span>Supplier: <strong>{supplier?.name}</strong></span>
                  <span>Project: <strong>{project?.name}</strong></span>
                </div>
                <div className="mt-2 text-right text-lg font-bold">Total: {formatCurrency(totalAmount)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="payment_terms" name="payment_terms" label="Payment Terms" placeholder="e.g., COD, 30-day" />
                <Input id="delivery_date" name="delivery_date" label="Expected Delivery" type="date" />
              </div>

              <Select
                id="is_subcontract"
                name="is_subcontract"
                label="PO Type"
                options={[
                  { value: "false", label: "Material PO" },
                  { value: "true", label: "Subcontract PO" },
                ]}
              />
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading || selectedPRs.length === 0}>
            {loading ? "Creating..." : "Create PO"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
