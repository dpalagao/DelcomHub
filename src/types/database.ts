// Auto-generated types matching the Delcom Project Hub architecture spec

export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "closed";
export type PRStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "converted_to_po";
export type POStatus = "draft" | "pending_approval" | "approved" | "partially_received" | "fully_received" | "closed" | "cancelled";
export type PaymentStatus = "pending" | "on_hold" | "released" | "confirmed" | "failed";
export type CanvassStatus = "open" | "evaluating" | "awarded" | "cancelled";
export type BudgetRevisionStatus = "pending" | "approved" | "rejected";
export type MilestoneStatus = "pending" | "completed" | "paid";
export type ThreeWayMatchStatus = "matched" | "qty_variance" | "price_variance" | "unmatched";
export type ApprovalAction = "approved" | "rejected" | "returned" | "approved_with_conditions";
export type PaymentMethod = "check" | "bizlink" | "gcash" | "cash" | "petty_cash";
export type UserRole = "admin" | "project_manager" | "drp_procurement" | "drp_estimator" | "accounting" | "warehouse";
export type SupplierType = "material_supplier" | "subcontractor" | "both";
export type BudgetType = "qty_only" | "value_only" | "qty_and_value";
export type PRType = "standard" | "urgent";
export type CanvassType = "materials" | "subcontract";
export type EntityType = "pr" | "po" | "budget_revision" | "payment_release" | "subcontract";
export type PriceSource = "canvass" | "po" | "invoice";
export type AuditAction = "insert" | "update" | "delete";

export interface Project {
  id: string;
  project_code: string;
  name: string;
  status: ProjectStatus;
  client_name: string | null;
  site_address: string | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  project_manager_id: string | null;
  total_estimate: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ProjectCostCategory {
  id: string;
  project_id: string;
  category_code: string;
  name: string;
  budget_type: BudgetType;
  budget_qty: number | null;
  budget_qty_unit: string | null;
  budget_value: number | null;
  encumbered_qty: number;
  encumbered_value: number;
  actual_qty: number;
  actual_value: number;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface BudgetVersion {
  id: string;
  cost_category_id: string;
  version_number: number;
  previous_budget_qty: number | null;
  new_budget_qty: number | null;
  previous_budget_value: number | null;
  new_budget_value: number | null;
  revision_reason: string;
  triggered_by_pr_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  status: BudgetRevisionStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  type: SupplierType;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  tax_id: string | null;
  is_approved_vendor: boolean;
  is_active: boolean;
  performance_score: number | null;
  avg_delivery_reliability: number | null;
  avg_price_competitiveness: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CanvassSession {
  id: string;
  project_id: string;
  cost_category_id: string;
  canvass_type: CanvassType;
  description: string | null;
  min_quotes_required: number;
  status: CanvassStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface CanvassQuote {
  id: string;
  canvass_session_id: string;
  supplier_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  uom: string | null;
  total_price: number;
  delivery_lead_days: number | null;
  payment_terms: string | null;
  validity_date: string | null;
  conditions: string | null;
  is_selected: boolean;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface PriceHistory {
  id: string;
  item_name_normalized: string;
  supplier_id: string;
  project_id: string;
  unit_price: number;
  uom: string | null;
  date_recorded: string;
  source: PriceSource;
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  pr_number: string;
  project_id: string;
  supplier_id: string;
  cost_category_id: string;
  pr_type: PRType;
  status: PRStatus;
  is_over_budget: boolean;
  is_pre_approved: boolean;
  total_amount: number;
  justification: string | null;
  canvass_quote_id: string | null;
  requested_delivery_date: string | null;
  po_id: string | null;
  owner_id: string;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface PurchaseRequestLine {
  id: string;
  pr_id: string;
  item_name: string;
  quantity: number;
  uom: string | null;
  unit_price: number;
  total_price: number;
  cost_category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PreApprovalRule {
  id: string;
  rule_name: string;
  category_pattern: string | null;
  supplier_id: string | null;
  max_line_amount: number | null;
  max_pr_amount: number | null;
  price_tolerance_pct: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  project_id: string;
  supplier_id: string;
  status: POStatus;
  total_amount: number;
  payment_terms: string | null;
  delivery_date: string | null;
  is_subcontract: boolean;
  approved_by: string | null;
  approved_at: string | null;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface POLine {
  id: string;
  po_id: string;
  pr_line_id: string | null;
  item_name: string;
  quantity: number;
  uom: string | null;
  unit_price: number;
  total_price: number;
  received_qty: number;
  is_fully_received: boolean;
  created_at: string;
  updated_at: string;
}

export interface POMilestone {
  id: string;
  po_id: string;
  milestone_number: number;
  description: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  completed_by: string | null;
  completed_at: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  po_id: string;
  milestone_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  hold_reason: string | null;
  released_by: string | null;
  released_at: string | null;
  confirmed_at: string | null;
  reference_number: string | null;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface GoodsReceipt {
  id: string;
  gr_number: string;
  po_id: string;
  received_by: string;
  received_at: string;
  delivery_receipt_number: string | null;
  photo_urls: string[];
  ocr_extracted_data: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceiptLine {
  id: string;
  goods_receipt_id: string;
  po_line_id: string;
  received_qty: number;
  is_within_tolerance: boolean;
  variance_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreeWayMatch {
  id: string;
  po_id: string;
  goods_receipt_id: string;
  invoice_number: string | null;
  invoice_amount: number | null;
  po_amount: number;
  received_amount: number;
  match_status: ThreeWayMatchStatus;
  variance_pct: number;
  resolved_by: string | null;
  resolved_at: string | null;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface ApprovalLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: ApprovalAction;
  conditions: string | null;
  approved_by: string;
  delegated_from: string | null;
  approved_at: string;
  notes: string | null;
}

export interface AuditTrail {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  action: AuditAction;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  can_approve: boolean;
  approval_limit: number | null;
  delegated_to: string | null;
  delegation_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalThreshold {
  id: string;
  entity_type: EntityType;
  min_amount: number;
  max_amount: number | null;
  approver_role: UserRole;
  min_canvass_quotes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
