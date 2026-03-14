"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface PO {
  id: string;
  po_number: string;
  suppliers: { name: string } | null;
  projects: { name: string } | null;
}

interface POLineData {
  id: string;
  item_name: string;
  quantity: number;
  uom: string | null;
  received_qty: number;
}

interface LineReceive {
  po_line_id: string;
  item_name: string;
  ordered: number;
  previously_received: number;
  receiving_qty: number;
}

export function ReceivingForm({
  purchaseOrders,
  userId,
}: {
  purchaseOrders: PO[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState("");
  const [lines, setLines] = useState<LineReceive[]>([]);

  useEffect(() => {
    if (!selectedPO) {
      setLines([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("po_lines")
        .select("id, item_name, quantity, uom, received_qty")
        .eq("po_id", selectedPO)
        .eq("is_fully_received", false);

      setLines(
        (data ?? []).map((l: POLineData) => ({
          po_line_id: l.id,
          item_name: l.item_name,
          ordered: l.quantity,
          previously_received: l.received_qty,
          receiving_qty: 0,
        }))
      );
    })();
  }, [selectedPO, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const receivingLines = lines.filter((l) => l.receiving_qty > 0);

    if (receivingLines.length === 0) {
      setError("Enter receiving quantities for at least one item");
      setLoading(false);
      return;
    }

    // Create goods receipt
    const { data: gr, error: grError } = await supabase
      .from("goods_receipts")
      .insert({
        po_id: selectedPO,
        received_by: userId,
        delivery_receipt_number: formData.get("delivery_receipt_number") as string || null,
        notes: formData.get("notes") as string || null,
      })
      .select()
      .single();

    if (grError || !gr) {
      setError(grError?.message ?? "Failed to create goods receipt");
      setLoading(false);
      return;
    }

    // Create GR lines and update PO lines
    for (const line of receivingLines) {
      const totalReceived = line.previously_received + line.receiving_qty;
      const variancePct =
        line.ordered > 0
          ? Math.abs(((totalReceived - line.ordered) / line.ordered) * 100)
          : 0;

      await supabase.from("goods_receipt_lines").insert({
        goods_receipt_id: gr.id,
        po_line_id: line.po_line_id,
        received_qty: line.receiving_qty,
        is_within_tolerance: variancePct <= 2,
        variance_pct: variancePct,
      });

      const isFullyReceived = totalReceived >= line.ordered * 0.98; // 2% tolerance
      await supabase
        .from("po_lines")
        .update({
          received_qty: totalReceived,
          is_fully_received: isFullyReceived,
        })
        .eq("id", line.po_line_id);
    }

    // Update PO status
    const { data: allPOLines } = await supabase
      .from("po_lines")
      .select("is_fully_received")
      .eq("po_id", selectedPO);

    const allReceived = allPOLines?.every((l) => l.is_fully_received);
    const someReceived = allPOLines?.some((l) => l.is_fully_received);

    await supabase
      .from("purchase_orders")
      .update({
        status: allReceived ? "fully_received" : someReceived ? "partially_received" : "approved",
      })
      .eq("id", selectedPO);

    router.push("/receiving");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Receive Goods</h3>
          <p className="text-sm text-muted">Record delivery quantities against a Purchase Order</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</div>}

          <Select
            id="po_id"
            name="po_id"
            label="Purchase Order"
            required
            placeholder="Select PO"
            options={purchaseOrders.map((po) => ({
              value: po.id,
              label: `${po.po_number} — ${po.suppliers?.name} (${po.projects?.name})`,
            }))}
            onChange={(e) => setSelectedPO(e.target.value)}
          />

          <Input
            id="delivery_receipt_number"
            name="delivery_receipt_number"
            label="Delivery Receipt # (DR)"
            placeholder="Enter supplier DR number"
          />

          {lines.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Items to Receive</h4>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={line.po_line_id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 p-3">
                    <div className="col-span-4">
                      <p className="text-sm font-medium">{line.item_name}</p>
                    </div>
                    <div className="col-span-2 text-center text-sm">
                      <p className="text-muted">Ordered</p>
                      <p className="font-medium">{line.ordered}</p>
                    </div>
                    <div className="col-span-2 text-center text-sm">
                      <p className="text-muted">Prev Rcvd</p>
                      <p className="font-medium">{line.previously_received}</p>
                    </div>
                    <div className="col-span-2 text-center text-sm">
                      <p className="text-muted">Remaining</p>
                      <p className="font-medium">{line.ordered - line.previously_received}</p>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Qty"
                        value={line.receiving_qty || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setLines((prev) =>
                            prev.map((l, j) => (j === i ? { ...l, receiving_qty: val } : l))
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Input id="notes" name="notes" label="Notes" placeholder="Any receiving notes or discrepancies" />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading || lines.length === 0}>
            {loading ? "Recording..." : "Record Receipt"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
