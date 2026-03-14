"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface ProjectFormProps {
  managers: { id: string; full_name: string }[];
  initialData?: {
    id: string;
    name: string;
    client_name: string;
    site_address: string;
    start_date: string;
    target_end_date: string;
    project_manager_id: string;
    total_estimate: number;
    status: string;
  };
}

export function ProjectForm({ managers, initialData }: ProjectFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!initialData;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      client_name: formData.get("client_name") as string || null,
      site_address: formData.get("site_address") as string || null,
      start_date: formData.get("start_date") as string || null,
      target_end_date: formData.get("target_end_date") as string || null,
      project_manager_id: formData.get("project_manager_id") as string || null,
      total_estimate: parseFloat(formData.get("total_estimate") as string) || 0,
    };

    let result;
    if (isEditing) {
      result = await supabase
        .from("projects")
        .update(payload)
        .eq("id", initialData.id);
    } else {
      result = await supabase.from("projects").insert(payload).select().single();
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Project" : "Create New Project"}
          </h3>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Input
            id="name"
            name="name"
            label="Project Name"
            required
            defaultValue={initialData?.name}
            placeholder="e.g., SM Aura Tower Fit-Out"
          />

          <Input
            id="client_name"
            name="client_name"
            label="Client Name"
            defaultValue={initialData?.client_name}
            placeholder="e.g., SM Prime Holdings"
          />

          <Input
            id="site_address"
            name="site_address"
            label="Site Address"
            defaultValue={initialData?.site_address}
            placeholder="e.g., 26th St, BGC, Taguig"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="start_date"
              name="start_date"
              label="Start Date"
              type="date"
              defaultValue={initialData?.start_date}
            />
            <Input
              id="target_end_date"
              name="target_end_date"
              label="Target End Date"
              type="date"
              defaultValue={initialData?.target_end_date}
            />
          </div>

          <Select
            id="project_manager_id"
            name="project_manager_id"
            label="Project Manager"
            placeholder="Select a PM"
            defaultValue={initialData?.project_manager_id}
            options={managers.map((m) => ({
              value: m.id,
              label: m.full_name,
            }))}
          />

          <Input
            id="total_estimate"
            name="total_estimate"
            label="Total Estimate (PHP)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initialData?.total_estimate?.toString()}
            placeholder="0.00"
          />
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Project"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
