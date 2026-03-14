"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface BudgetCategoryFormProps {
  projectId: string;
}

export function BudgetCategoryForm({ projectId }: BudgetCategoryFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <Button variant="secondary" onClick={() => setShowForm(true)}>
        Add Cost Category
      </Button>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const { error: insertError } = await supabase
      .from("project_cost_categories")
      .insert({
        project_id: projectId,
        category_code: formData.get("category_code") as string,
        name: formData.get("name") as string,
        budget_type: formData.get("budget_type") as string,
        budget_qty: parseFloat(formData.get("budget_qty") as string) || null,
        budget_qty_unit: formData.get("budget_qty_unit") as string || null,
        budget_value: parseFloat(formData.get("budget_value") as string) || null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setShowForm(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <h4 className="font-semibold">Add Cost Category</h4>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input id="category_code" name="category_code" label="Code" required placeholder="e.g., STRUCT" />
            <Input id="name" name="name" label="Category Name" required placeholder="e.g., Structural Works" />
          </div>
          <Select
            id="budget_type"
            name="budget_type"
            label="Budget Type"
            options={[
              { value: "qty_and_value", label: "Quantity & Value" },
              { value: "qty_only", label: "Quantity Only" },
              { value: "value_only", label: "Value Only" },
            ]}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input id="budget_qty" name="budget_qty" label="Budget Qty" type="number" step="0.01" placeholder="0" />
            <Input id="budget_qty_unit" name="budget_qty_unit" label="Unit" placeholder="e.g., bags" />
            <Input id="budget_value" name="budget_value" label="Budget Value (PHP)" type="number" step="0.01" placeholder="0.00" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Category"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
