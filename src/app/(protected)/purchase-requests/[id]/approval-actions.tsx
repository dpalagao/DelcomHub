"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ApprovalActionsProps {
  prId: string;
  userId: string;
}

export function ApprovalActions({ prId, userId }: ApprovalActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState("");

  async function handleAction(action: "approved" | "rejected" | "returned" | "approved_with_conditions") {
    setLoading(true);

    const newStatus =
      action === "approved" || action === "approved_with_conditions"
        ? "approved"
        : action === "rejected"
          ? "rejected"
          : "draft";

    const { error: logError } = await supabase.from("approval_logs").insert({
      entity_type: "pr",
      entity_id: prId,
      action,
      approved_by: userId,
      notes: notes || null,
      conditions: action === "approved_with_conditions" ? conditions : null,
    });

    if (!logError) {
      await supabase
        .from("purchase_requests")
        .update({ status: newStatus })
        .eq("id", prId);
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <Card className="border-primary/30 bg-blue-50/50">
      <CardContent className="py-4">
        <h4 className="mb-3 font-semibold">Approval Actions</h4>
        <div className="mb-3 space-y-2">
          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Input
            placeholder="Conditions (for conditional approval)"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="success"
            disabled={loading}
            onClick={() => handleAction("approved")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={loading}
            onClick={() => handleAction("approved_with_conditions")}
          >
            Approve with Conditions
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => handleAction("returned")}
          >
            Return
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={loading}
            onClick={() => handleAction("rejected")}
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
