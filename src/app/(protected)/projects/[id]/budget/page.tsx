import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatStatus, formatPercent } from "@/lib/format";
import { notFound } from "next/navigation";
import { BudgetCategoryForm } from "./budget-form";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: categories } = await supabase
    .from("project_cost_categories")
    .select("*")
    .eq("project_id", id)
    .order("category_code");

  const { data: revisions } = await supabase
    .from("budget_versions")
    .select("*, project_cost_categories(category_code, name)")
    .in(
      "cost_category_id",
      (categories ?? []).map((c) => c.id)
    )
    .order("created_at", { ascending: false })
    .limit(10);

  const canEdit = ["admin", "drp_estimator"].includes(user.role);

  return (
    <div>
      <Header title={`Budget — ${project.name}`} />
      <div className="p-6">
        {/* Add Category Form */}
        {canEdit && (
          <div className="mb-6">
            <BudgetCategoryForm projectId={id} />
          </div>
        )}

        {/* Categories Table */}
        <Card className="mb-6">
          <CardHeader>
            <h4 className="font-semibold">Cost Categories</h4>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-muted">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Budget</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Encumbered</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Actual</th>
                    <th className="px-4 py-3 text-right font-medium text-muted">Utilization</th>
                    <th className="px-4 py-3 text-center font-medium text-muted">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {categories?.map((cat) => {
                    const pct = cat.budget_value && cat.budget_value > 0
                      ? (cat.encumbered_value / cat.budget_value) * 100
                      : 0;
                    return (
                      <tr key={cat.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 font-mono">{cat.category_code}</td>
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3">
                          <Badge>{formatStatus(cat.budget_type)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(cat.budget_value ?? 0)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(cat.encumbered_value)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(cat.actual_value)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={pct > 95 ? "text-danger font-semibold" : pct > 80 ? "text-warning" : ""}>
                            {formatPercent(pct)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{cat.version}</td>
                      </tr>
                    );
                  })}
                  {(!categories || categories.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">
                        No cost categories defined.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Budget Revisions */}
        <Card>
          <CardHeader>
            <h4 className="font-semibold">Budget Revision History</h4>
          </CardHeader>
          <CardContent>
            {revisions && revisions.length > 0 ? (
              <div className="space-y-3">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {rev.project_cost_categories?.category_code} — {rev.project_cost_categories?.name}
                      </p>
                      <p className="text-xs text-muted">
                        v{rev.version_number} — {rev.revision_reason}
                      </p>
                      <p className="text-xs text-muted">{formatDate(rev.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {formatCurrency(rev.previous_budget_value ?? 0)} → {formatCurrency(rev.new_budget_value ?? 0)}
                      </p>
                      <Badge variant={getStatusVariant(rev.status)}>
                        {formatStatus(rev.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No budget revisions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
