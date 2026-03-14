"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { PaymentStatus, UserRole } from "@/types/database";

interface PaymentActionsProps {
  paymentId: string;
  status: PaymentStatus;
  userId: string;
  userRole: UserRole;
}

export function PaymentActions({ paymentId, status, userId, userRole }: PaymentActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [holdReason, setHoldReason] = useState("");

  async function updateStatus(newStatus: PaymentStatus, extra: Record<string, unknown> = {}) {
    setLoading(true);
    await supabase
      .from("payments")
      .update({ status: newStatus, ...extra })
      .eq("id", paymentId);
    router.refresh();
    setLoading(false);
  }

  return (
    <Card>
      <CardContent className="py-4">
        <h4 className="mb-3 font-semibold">Actions</h4>
        <div className="space-y-3">
          {/* Admin: Hold/Release */}
          {userRole === "admin" && status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" variant="success" disabled={loading}
                onClick={() => updateStatus("released", { released_by: userId, released_at: new Date().toISOString() })}>
                Release
              </Button>
              <Input placeholder="Hold reason" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="flex-1" />
              <Button size="sm" variant="secondary" disabled={loading || !holdReason}
                onClick={() => updateStatus("on_hold", { hold_reason: holdReason })}>
                Hold
              </Button>
            </div>
          )}

          {userRole === "admin" && status === "on_hold" && (
            <Button size="sm" variant="success" disabled={loading}
              onClick={() => updateStatus("released", { released_by: userId, released_at: new Date().toISOString(), hold_reason: null })}>
              Release from Hold
            </Button>
          )}

          {/* Accounting: Confirm */}
          {userRole === "accounting" && status === "released" && (
            <Button size="sm" variant="success" disabled={loading}
              onClick={() => updateStatus("confirmed", { confirmed_at: new Date().toISOString() })}>
              Confirm Payment
            </Button>
          )}

          {status === "confirmed" && (
            <p className="text-sm text-success font-medium">Payment has been confirmed.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
