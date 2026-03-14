"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function SupplierForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const { error: insertError } = await supabase.from("suppliers").insert({
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      contact_person: formData.get("contact_person") as string || null,
      phone: formData.get("phone") as string || null,
      email: formData.get("email") as string || null,
      address: formData.get("address") as string || null,
      payment_terms: formData.get("payment_terms") as string || null,
      tax_id: formData.get("tax_id") as string || null,
      is_approved_vendor: formData.get("is_approved_vendor") === "true",
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/suppliers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Add New Supplier</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</div>
          )}
          <Input id="name" name="name" label="Supplier Name" required placeholder="e.g., ABC Construction Supply" />
          <Select
            id="type"
            name="type"
            label="Supplier Type"
            options={[
              { value: "material_supplier", label: "Material Supplier" },
              { value: "subcontractor", label: "Subcontractor" },
              { value: "both", label: "Both" },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input id="contact_person" name="contact_person" label="Contact Person" />
            <Input id="phone" name="phone" label="Phone" type="tel" />
          </div>
          <Input id="email" name="email" label="Email" type="email" />
          <Input id="address" name="address" label="Address" />
          <div className="grid grid-cols-2 gap-4">
            <Input id="payment_terms" name="payment_terms" label="Payment Terms" placeholder="e.g., COD, 30-day" />
            <Input id="tax_id" name="tax_id" label="TIN" />
          </div>
          <Select
            id="is_approved_vendor"
            name="is_approved_vendor"
            label="Approved Vendor?"
            options={[
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ]}
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Supplier"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
