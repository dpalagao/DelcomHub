"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface PO {
  id: string;
  po_number: string;
  total_amount: number;
  suppliers: { name: string } | null;
  projects: { name: string } | null;
}

export function PaymentForm({ purchaseOrders }: { purchaseOrders: PO[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<string>("");

  const po = purchaseOrders.find((p) => p.id === selectedPO);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const { error: insertError } = await supabase.from("payments").insert({
      po_id: formData.get("po_id") as string,
      amount: parseFloat(formData.get("amount") as string),
      payment_method: formData.get("payment_method") as string,
      reference_number: formData.get("reference_number") as string || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/payments");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Create Payment</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</div>}

          <Select
            id="po_id"
            name="po_id"
            label="Purchase Order"
            required
            placeholder="Select PO"
            options={purchaseOrders.map((p) => ({
              value: p.id,
              label: `${p.po_number} — ${p.suppliers?.name} (${formatCurrency(p.total_amount)})`,
            }))}
            onChange={(e) => setSelectedPO(e.target.value)}
          />

          {po && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p>Project: <strong>{po.projects?.name}</strong></p>
              <p>Supplier: <strong>{po.suppliers?.name}</strong></p>
              <p>PO Total: <strong>{formatCurrency(po.total_amount)}</strong></p>
            </div>
          )}

          <Input
            id="amount"
            name="amount"
            label="Payment Amount (PHP)"
            type="number"
            step="0.01"
            min="0"
            required
          />

          <Select
            id="payment_method"
            name="payment_method"
            label="Payment Method"
            required
            options={[
              { value: "check", label: "Check" },
              { value: "bizlink", label: "BizLink" },
              { value: "gcash", label: "GCash" },
              { value: "cash", label: "Cash" },
              { value: "petty_cash", label: "Petty Cash" },
            ]}
          />

          <Input
            id="reference_number"
            name="reference_number"
            label="Reference Number"
            placeholder="Check #, transfer ref, etc."
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Payment"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
