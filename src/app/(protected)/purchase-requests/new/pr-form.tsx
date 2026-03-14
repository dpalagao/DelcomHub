"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { UserRole } from "@/types/database";

interface LineItem {
  item_name: string;
  quantity: number;
  uom: string;
  unit_price: number;
}

interface PRFormProps {
  projects: { id: string; name: string; project_code: string }[];
  suppliers: { id: string; name: string; supplier_code: string }[];
  userId: string;
  userRole: UserRole;
}

export function PRForm({ projects, suppliers, userId, userRole }: PRFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<LineItem[]>([
    { item_name: "", quantity: 0, uom: "", unit_price: 0 },
  ]);
  const [categories, setCategories] = useState<{ id: string; category_code: string; name: string }[]>([]);

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  async function loadCategories(projectId: string) {
    if (!projectId) {
      setCategories([]);
      return;
    }
    const { data } = await supabase
      .from("project_cost_categories")
      .select("id, category_code, name")
      .eq("project_id", projectId);
    setCategories(data ?? []);
  }

  function updateLine(index: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  function addLine() {
    setLines((prev) => [...prev, { item_name: "", quantity: 0, uom: "", unit_price: 0 }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const { data: pr, error: prError } = await supabase
      .from("purchase_requests")
      .insert({
        project_id: formData.get("project_id") as string,
        supplier_id: formData.get("supplier_id") as string,
        cost_category_id: formData.get("cost_category_id") as string,
        pr_type: userRole === "project_manager" ? "urgent" : "standard",
        justification: formData.get("justification") as string || null,
        requested_delivery_date: formData.get("requested_delivery_date") as string || null,
        total_amount: totalAmount,
        owner_id: userId,
      })
      .select()
      .single();

    if (prError || !pr) {
      setError(prError?.message ?? "Failed to create PR");
      setLoading(false);
      return;
    }

    const lineInserts = lines
      .filter((l) => l.item_name && l.quantity > 0)
      .map((l) => ({
        pr_id: pr.id,
        item_name: l.item_name,
        quantity: l.quantity,
        uom: l.uom || null,
        unit_price: l.unit_price,
        total_price: l.quantity * l.unit_price,
      }));

    if (lineInserts.length > 0) {
      const { error: lineError } = await supabase
        .from("purchase_request_lines")
        .insert(lineInserts);

      if (lineError) {
        setError(lineError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/purchase-requests");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Create Purchase Request</h3>
          <p className="text-sm text-muted">
            {userRole === "project_manager" ? "Urgent PR (PM Direct)" : "Standard PR (from Procurement)"}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="project_id"
              name="project_id"
              label="Project"
              required
              placeholder="Select project"
              options={projects.map((p) => ({
                value: p.id,
                label: `${p.project_code} — ${p.name}`,
              }))}
              onChange={(e) => loadCategories(e.target.value)}
            />
            <Select
              id="supplier_id"
              name="supplier_id"
              label="Supplier"
              required
              placeholder="Select supplier"
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="cost_category_id"
              name="cost_category_id"
              label="Cost Category"
              required
              placeholder="Select category"
              options={categories.map((c) => ({
                value: c.id,
                label: `${c.category_code} — ${c.name}`,
              }))}
            />
            <Input
              id="requested_delivery_date"
              name="requested_delivery_date"
              label="Requested Delivery Date"
              type="date"
            />
          </div>

          <Input
            id="justification"
            name="justification"
            label="Justification"
            placeholder="Business justification (required for urgent/over-budget)"
          />

          {/* Line Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Line Items</h4>
              <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-gray-200 p-3">
                  <div className="col-span-4">
                    <Input
                      placeholder="Item name"
                      value={line.item_name}
                      onChange={(e) => updateLine(i, "item_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Qty"
                      type="number"
                      step="0.01"
                      value={line.quantity || ""}
                      onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="UOM"
                      value={line.uom}
                      onChange={(e) => updateLine(i, "uom", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Unit Price"
                      type="number"
                      step="0.01"
                      value={line.unit_price || ""}
                      onChange={(e) => updateLine(i, "unit_price", parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center text-sm font-medium">
                    {(line.quantity * line.unit_price).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="text-danger hover:text-red-700"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-right text-sm">
              <span className="text-muted">Total: </span>
              <span className="text-lg font-bold">
                PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create PR"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
