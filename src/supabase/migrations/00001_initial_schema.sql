-- Delcom Project Hub - Initial Database Schema
-- Based on System Architecture Document v1.0

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE project_status AS ENUM ('draft', 'active', 'on_hold', 'completed', 'closed');
CREATE TYPE pr_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'converted_to_po');
CREATE TYPE po_status AS ENUM ('draft', 'pending_approval', 'approved', 'partially_received', 'fully_received', 'closed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'on_hold', 'released', 'confirmed', 'failed');
CREATE TYPE canvass_status AS ENUM ('open', 'evaluating', 'awarded', 'cancelled');
CREATE TYPE budget_revision_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE milestone_status AS ENUM ('pending', 'completed', 'paid');
CREATE TYPE three_way_match_status AS ENUM ('matched', 'qty_variance', 'price_variance', 'unmatched');
CREATE TYPE approval_action AS ENUM ('approved', 'rejected', 'returned', 'approved_with_conditions');
CREATE TYPE payment_method AS ENUM ('check', 'bizlink', 'gcash', 'cash', 'petty_cash');
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'drp_procurement', 'drp_estimator', 'accounting', 'warehouse');
CREATE TYPE supplier_type AS ENUM ('material_supplier', 'subcontractor', 'both');
CREATE TYPE budget_type AS ENUM ('qty_only', 'value_only', 'qty_and_value');
CREATE TYPE pr_type AS ENUM ('standard', 'urgent');
CREATE TYPE canvass_type AS ENUM ('materials', 'subcontract');
CREATE TYPE entity_type AS ENUM ('pr', 'po', 'budget_revision', 'payment_release', 'subcontract');
CREATE TYPE price_source AS ENUM ('canvass', 'po', 'invoice');
CREATE TYPE audit_action AS ENUM ('insert', 'update', 'delete');

-- ============================================
-- HELPER: auto-generate sequential codes
-- ============================================

CREATE OR REPLACE FUNCTION generate_code(prefix TEXT, seq_name TEXT)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', seq_name);
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
  RETURN prefix || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE: users
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'warehouse',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  approval_limit DECIMAL(15,2),
  delegated_to UUID REFERENCES users(id),
  delegation_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: projects
-- ============================================

CREATE SEQUENCE IF NOT EXISTS project_code_seq START 1;

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE NOT NULL DEFAULT generate_code('PRJ', 'project_code_seq'),
  name TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'draft',
  client_name TEXT,
  site_address TEXT,
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  project_manager_id UUID REFERENCES users(id),
  total_estimate DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: project_cost_categories
-- ============================================

CREATE TABLE project_cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  name TEXT NOT NULL,
  budget_type budget_type NOT NULL DEFAULT 'qty_and_value',
  budget_qty DECIMAL(15,4),
  budget_qty_unit TEXT,
  budget_value DECIMAL(15,2),
  encumbered_qty DECIMAL(15,4) NOT NULL DEFAULT 0,
  encumbered_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_qty DECIMAL(15,4) NOT NULL DEFAULT 0,
  actual_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(project_id, category_code)
);

-- ============================================
-- TABLE: budget_versions
-- ============================================

CREATE TABLE budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_category_id UUID NOT NULL REFERENCES project_cost_categories(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  previous_budget_qty DECIMAL(15,4),
  new_budget_qty DECIMAL(15,4),
  previous_budget_value DECIMAL(15,2),
  new_budget_value DECIMAL(15,2),
  revision_reason TEXT NOT NULL,
  triggered_by_pr_id UUID,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  status budget_revision_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: suppliers
-- ============================================

CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT UNIQUE NOT NULL DEFAULT generate_code('SUP', 'supplier_code_seq'),
  name TEXT NOT NULL,
  type supplier_type NOT NULL DEFAULT 'material_supplier',
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  tax_id TEXT,
  is_approved_vendor BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  performance_score DECIMAL(5,2),
  avg_delivery_reliability DECIMAL(5,2),
  avg_price_competitiveness DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: canvass_sessions
-- ============================================

CREATE TABLE canvass_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_category_id UUID NOT NULL REFERENCES project_cost_categories(id),
  canvass_type canvass_type NOT NULL DEFAULT 'materials',
  description TEXT,
  min_quotes_required INT NOT NULL DEFAULT 1,
  status canvass_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: canvass_quotes
-- ============================================

CREATE TABLE canvass_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvass_session_id UUID NOT NULL REFERENCES canvass_sessions(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  item_name TEXT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  uom TEXT,
  total_price DECIMAL(15,2) NOT NULL,
  delivery_lead_days INT,
  payment_terms TEXT,
  validity_date DATE,
  conditions TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  attachment_urls JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: price_history
-- ============================================

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name_normalized TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  unit_price DECIMAL(15,2) NOT NULL,
  uom TEXT,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  source price_source NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: purchase_requests
-- ============================================

CREATE SEQUENCE IF NOT EXISTS pr_number_seq START 1;

CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number TEXT UNIQUE NOT NULL DEFAULT generate_code('PR', 'pr_number_seq'),
  project_id UUID NOT NULL REFERENCES projects(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  cost_category_id UUID NOT NULL REFERENCES project_cost_categories(id),
  pr_type pr_type NOT NULL DEFAULT 'standard',
  status pr_status NOT NULL DEFAULT 'draft',
  is_over_budget BOOLEAN NOT NULL DEFAULT false,
  is_pre_approved BOOLEAN NOT NULL DEFAULT false,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  justification TEXT,
  canvass_quote_id UUID REFERENCES canvass_quotes(id),
  requested_delivery_date DATE,
  po_id UUID,
  owner_id UUID NOT NULL REFERENCES users(id),
  attachment_urls JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: purchase_request_lines
-- ============================================

CREATE TABLE purchase_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  uom TEXT,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  cost_category_id UUID REFERENCES project_cost_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: pre_approval_rules
-- ============================================

CREATE TABLE pre_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  category_pattern TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  max_line_amount DECIMAL(15,2),
  max_pr_amount DECIMAL(15,2),
  price_tolerance_pct DECIMAL(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- TABLE: purchase_orders
-- ============================================

CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL DEFAULT generate_code('PO', 'po_number_seq'),
  project_id UUID NOT NULL REFERENCES projects(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status po_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  delivery_date DATE,
  is_subcontract BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  attachment_urls JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Add FK from PR to PO now that PO table exists
ALTER TABLE purchase_requests
  ADD CONSTRAINT fk_pr_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id);

-- ============================================
-- TABLE: po_lines
-- ============================================

CREATE TABLE po_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  pr_line_id UUID REFERENCES purchase_request_lines(id),
  item_name TEXT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  uom TEXT,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  received_qty DECIMAL(15,4) NOT NULL DEFAULT 0,
  is_fully_received BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: po_milestones
-- ============================================

CREATE TABLE po_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  milestone_number INT NOT NULL,
  description TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status milestone_status NOT NULL DEFAULT 'pending',
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: payments
-- ============================================

CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1;

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL DEFAULT generate_code('PAY', 'payment_number_seq'),
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  milestone_id UUID REFERENCES po_milestones(id),
  amount DECIMAL(15,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'check',
  status payment_status NOT NULL DEFAULT 'pending',
  hold_reason TEXT,
  released_by UUID REFERENCES users(id),
  released_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  reference_number TEXT,
  attachment_urls JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Add FK from milestone to payment now that payments table exists
ALTER TABLE po_milestones
  ADD CONSTRAINT fk_milestone_payment FOREIGN KEY (payment_id) REFERENCES payments(id);

-- ============================================
-- TABLE: goods_receipts
-- ============================================

CREATE SEQUENCE IF NOT EXISTS gr_number_seq START 1;

CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_number TEXT UNIQUE NOT NULL DEFAULT generate_code('GR', 'gr_number_seq'),
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  received_by UUID NOT NULL REFERENCES users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_receipt_number TEXT,
  photo_urls JSONB DEFAULT '[]'::JSONB,
  ocr_extracted_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: goods_receipt_lines
-- ============================================

CREATE TABLE goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES po_lines(id),
  received_qty DECIMAL(15,4) NOT NULL,
  is_within_tolerance BOOLEAN NOT NULL DEFAULT true,
  variance_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: three_way_matches
-- ============================================

CREATE TABLE three_way_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id),
  invoice_number TEXT,
  invoice_amount DECIMAL(15,2),
  po_amount DECIMAL(15,2) NOT NULL,
  received_amount DECIMAL(15,2) NOT NULL,
  match_status three_way_match_status NOT NULL DEFAULT 'unmatched',
  variance_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  attachment_urls JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: approval_logs
-- ============================================

CREATE TABLE approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  action approval_action NOT NULL,
  conditions TEXT,
  approved_by UUID NOT NULL REFERENCES users(id),
  delegated_from UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- ============================================
-- TABLE: approval_thresholds
-- ============================================

CREATE TABLE approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  min_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  max_amount DECIMAL(15,2),
  approver_role user_role NOT NULL,
  min_canvass_quotes INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: audit_trail
-- ============================================

CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action audit_action NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Composite indexes on (project_id, status) for transactional tables
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_pr_project_status ON purchase_requests(project_id, status);
CREATE INDEX idx_po_project_status ON purchase_orders(project_id, status);
CREATE INDEX idx_payments_po_status ON payments(po_id, status);
CREATE INDEX idx_gr_po ON goods_receipts(po_id);
CREATE INDEX idx_canvass_project ON canvass_sessions(project_id, status);

-- Full-text search on item names for double-order detection
CREATE INDEX idx_pr_lines_item ON purchase_request_lines USING gin(to_tsvector('english', item_name));
CREATE INDEX idx_po_lines_item ON po_lines USING gin(to_tsvector('english', item_name));

-- Price history lookups
CREATE INDEX idx_price_history_supplier_item ON price_history(supplier_id, item_name_normalized);
CREATE INDEX idx_price_history_item ON price_history(item_name_normalized, date_recorded);

-- Audit trail
CREATE INDEX idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_changed_at ON audit_trail(changed_at);

-- Approval logs
CREATE INDEX idx_approval_logs_entity ON approval_logs(entity_type, entity_id);

-- Supplier search
CREATE INDEX idx_suppliers_active ON suppliers(is_active, is_approved_vendor);

-- ============================================
-- TRIGGERS: updated_at auto-update
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with that column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name != 'audit_trail'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================
-- TRIGGERS: audit trail capture
-- ============================================

CREATE OR REPLACE FUNCTION capture_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
  current_user_id UUID;
BEGIN
  -- Try to get current user from app setting
  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (table_name, record_id, field_name, old_value, new_value, changed_by, action)
    VALUES (TG_TABLE_NAME, NEW.id, '*', NULL, row_to_json(NEW)::TEXT, current_user_id, 'insert');
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (table_name, record_id, field_name, old_value, new_value, changed_by, action)
    VALUES (TG_TABLE_NAME, OLD.id, '*', row_to_json(OLD)::TEXT, NULL, current_user_id, 'delete');
  ELSIF TG_OP = 'UPDATE' THEN
    FOR col IN
      SELECT column_name FROM information_schema.columns
      WHERE table_name = TG_TABLE_NAME AND table_schema = TG_TABLE_SCHEMA
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::TEXT', col) INTO old_val USING OLD;
      EXECUTE format('SELECT ($1).%I::TEXT', col) INTO new_val USING NEW;
      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO audit_trail (table_name, record_id, field_name, old_value, new_value, changed_by, action)
        VALUES (TG_TABLE_NAME, NEW.id, col, old_val, new_val, current_user_id, 'update');
      END IF;
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to core tables
DO $$
DECLARE
  tbl TEXT;
  core_tables TEXT[] := ARRAY[
    'projects', 'project_cost_categories', 'budget_versions', 'suppliers',
    'canvass_sessions', 'canvass_quotes', 'purchase_requests', 'purchase_request_lines',
    'purchase_orders', 'po_lines', 'po_milestones', 'payments',
    'goods_receipts', 'goods_receipt_lines', 'three_way_matches',
    'pre_approval_rules', 'approval_thresholds'
  ];
BEGIN
  FOREACH tbl IN ARRAY core_tables LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION capture_audit_trail()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================
-- TRIGGER: budget encumbrance on PR changes
-- ============================================

CREATE OR REPLACE FUNCTION update_budget_encumbrance()
RETURNS TRIGGER AS $$
DECLARE
  cat_id UUID;
  pr_total DECIMAL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    cat_id := OLD.cost_category_id;
  ELSE
    cat_id := NEW.cost_category_id;
  END IF;

  -- Recalculate encumbered_value from all active PRs in this category
  UPDATE project_cost_categories
  SET encumbered_value = COALESCE((
    SELECT SUM(total_amount)
    FROM purchase_requests
    WHERE cost_category_id = cat_id
      AND status IN ('draft', 'submitted', 'approved', 'converted_to_po')
  ), 0)
  WHERE id = cat_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pr_encumbrance
  AFTER INSERT OR UPDATE OR DELETE ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION update_budget_encumbrance();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvass_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvass_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE three_way_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS: everyone can read active users, admin manages all
CREATE POLICY users_select ON users FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (is_admin());
CREATE POLICY users_update ON users FOR UPDATE USING (is_admin() OR id = auth.uid());

-- PROJECTS: admin sees all, PM sees own, DRP/accounting/estimator see all
CREATE POLICY projects_select ON projects FOR SELECT USING (
  is_admin()
  OR project_manager_id = auth.uid()
  OR get_user_role() IN ('drp_procurement', 'drp_estimator', 'accounting')
);
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (
  is_admin() OR get_user_role() IN ('drp_procurement', 'drp_estimator')
);
CREATE POLICY projects_update ON projects FOR UPDATE USING (is_admin());

-- COST CATEGORIES: follows project visibility
CREATE POLICY cost_cat_select ON project_cost_categories FOR SELECT USING (
  EXISTS(SELECT 1 FROM projects WHERE id = project_id AND (
    is_admin()
    OR project_manager_id = auth.uid()
    OR get_user_role() IN ('drp_procurement', 'drp_estimator', 'accounting')
  ))
);
CREATE POLICY cost_cat_insert ON project_cost_categories FOR INSERT WITH CHECK (
  is_admin() OR get_user_role() = 'drp_estimator'
);
CREATE POLICY cost_cat_update ON project_cost_categories FOR UPDATE USING (
  is_admin() OR get_user_role() = 'drp_estimator'
);

-- BUDGET VERSIONS: follows cost category visibility
CREATE POLICY budget_ver_select ON budget_versions FOR SELECT USING (
  EXISTS(SELECT 1 FROM project_cost_categories cc
    JOIN projects p ON p.id = cc.project_id
    WHERE cc.id = cost_category_id AND (
      is_admin() OR p.project_manager_id = auth.uid()
      OR get_user_role() IN ('drp_procurement', 'drp_estimator', 'accounting')
    ))
);
CREATE POLICY budget_ver_insert ON budget_versions FOR INSERT WITH CHECK (
  is_admin() OR get_user_role() = 'drp_estimator'
);
CREATE POLICY budget_ver_update ON budget_versions FOR UPDATE USING (is_admin());

-- SUPPLIERS: readable by most roles, editable by admin/procurement
CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (
  get_user_role() IN ('admin', 'project_manager', 'drp_procurement', 'drp_estimator', 'accounting')
);
CREATE POLICY suppliers_insert ON suppliers FOR INSERT WITH CHECK (
  is_admin() OR get_user_role() = 'drp_procurement'
);
CREATE POLICY suppliers_update ON suppliers FOR UPDATE USING (
  is_admin() OR get_user_role() = 'drp_procurement'
);

-- CANVASS SESSIONS / QUOTES: procurement manages, others view
CREATE POLICY canvass_select ON canvass_sessions FOR SELECT USING (
  get_user_role() IN ('admin', 'project_manager', 'drp_procurement', 'drp_estimator')
);
CREATE POLICY canvass_insert ON canvass_sessions FOR INSERT WITH CHECK (
  get_user_role() = 'drp_procurement'
);
CREATE POLICY canvass_update ON canvass_sessions FOR UPDATE USING (
  get_user_role() IN ('admin', 'drp_procurement')
);

CREATE POLICY quotes_select ON canvass_quotes FOR SELECT USING (
  get_user_role() IN ('admin', 'project_manager', 'drp_procurement', 'drp_estimator')
);
CREATE POLICY quotes_insert ON canvass_quotes FOR INSERT WITH CHECK (
  get_user_role() = 'drp_procurement'
);
CREATE POLICY quotes_update ON canvass_quotes FOR UPDATE USING (
  get_user_role() IN ('admin', 'drp_procurement')
);

-- PRICE HISTORY: readable by procurement roles
CREATE POLICY price_history_select ON price_history FOR SELECT USING (
  get_user_role() IN ('admin', 'drp_procurement', 'drp_estimator')
);
CREATE POLICY price_history_insert ON price_history FOR INSERT WITH CHECK (true);

-- PURCHASE REQUESTS: owner and relevant roles
CREATE POLICY pr_select ON purchase_requests FOR SELECT USING (
  is_admin()
  OR owner_id = auth.uid()
  OR get_user_role() IN ('drp_procurement', 'accounting')
  OR EXISTS(SELECT 1 FROM projects WHERE id = project_id AND project_manager_id = auth.uid())
);
CREATE POLICY pr_insert ON purchase_requests FOR INSERT WITH CHECK (
  get_user_role() IN ('drp_procurement', 'project_manager')
);
CREATE POLICY pr_update ON purchase_requests FOR UPDATE USING (
  is_admin() OR owner_id = auth.uid() OR get_user_role() = 'drp_procurement'
);

-- PR LINES: follows PR visibility
CREATE POLICY pr_lines_select ON purchase_request_lines FOR SELECT USING (
  EXISTS(SELECT 1 FROM purchase_requests pr WHERE pr.id = pr_id AND (
    is_admin() OR pr.owner_id = auth.uid()
    OR get_user_role() IN ('drp_procurement', 'accounting')
  ))
);
CREATE POLICY pr_lines_insert ON purchase_request_lines FOR INSERT WITH CHECK (
  get_user_role() IN ('drp_procurement', 'project_manager')
);
CREATE POLICY pr_lines_update ON purchase_request_lines FOR UPDATE USING (
  EXISTS(SELECT 1 FROM purchase_requests pr WHERE pr.id = pr_id AND (
    is_admin() OR pr.owner_id = auth.uid()
  ))
);

-- PRE-APPROVAL RULES: admin only
CREATE POLICY pre_approval_select ON pre_approval_rules FOR SELECT USING (is_admin());
CREATE POLICY pre_approval_insert ON pre_approval_rules FOR INSERT WITH CHECK (is_admin());
CREATE POLICY pre_approval_update ON pre_approval_rules FOR UPDATE USING (is_admin());

-- PURCHASE ORDERS
CREATE POLICY po_select ON purchase_orders FOR SELECT USING (
  is_admin()
  OR get_user_role() IN ('drp_procurement', 'accounting')
  OR EXISTS(SELECT 1 FROM projects WHERE id = project_id AND project_manager_id = auth.uid())
);
CREATE POLICY po_insert ON purchase_orders FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'drp_procurement')
);
CREATE POLICY po_update ON purchase_orders FOR UPDATE USING (
  is_admin() OR get_user_role() = 'drp_procurement'
);

-- PO LINES: follows PO visibility
CREATE POLICY po_lines_select ON po_lines FOR SELECT USING (
  EXISTS(SELECT 1 FROM purchase_orders po WHERE po.id = po_id AND (
    is_admin() OR get_user_role() IN ('drp_procurement', 'accounting')
  ))
);
CREATE POLICY po_lines_insert ON po_lines FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'drp_procurement')
);
CREATE POLICY po_lines_update ON po_lines FOR UPDATE USING (
  is_admin() OR get_user_role() = 'drp_procurement'
);

-- PO MILESTONES
CREATE POLICY milestones_select ON po_milestones FOR SELECT USING (
  EXISTS(SELECT 1 FROM purchase_orders po WHERE po.id = po_id AND (
    is_admin() OR get_user_role() IN ('drp_procurement', 'accounting', 'project_manager')
  ))
);
CREATE POLICY milestones_insert ON po_milestones FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'drp_procurement')
);
CREATE POLICY milestones_update ON po_milestones FOR UPDATE USING (
  is_admin() OR get_user_role() IN ('drp_procurement', 'project_manager')
);

-- PAYMENTS
CREATE POLICY payments_select ON payments FOR SELECT USING (
  is_admin() OR get_user_role() IN ('accounting', 'drp_procurement')
);
CREATE POLICY payments_insert ON payments FOR INSERT WITH CHECK (
  get_user_role() = 'accounting'
);
CREATE POLICY payments_update ON payments FOR UPDATE USING (
  is_admin() OR get_user_role() = 'accounting'
);

-- GOODS RECEIPTS
CREATE POLICY gr_select ON goods_receipts FOR SELECT USING (
  is_admin()
  OR received_by = auth.uid()
  OR get_user_role() IN ('drp_procurement', 'accounting', 'warehouse')
);
CREATE POLICY gr_insert ON goods_receipts FOR INSERT WITH CHECK (
  get_user_role() IN ('project_manager', 'drp_procurement', 'warehouse')
);
CREATE POLICY gr_update ON goods_receipts FOR UPDATE USING (
  is_admin() OR received_by = auth.uid()
);

-- GR LINES
CREATE POLICY gr_lines_select ON goods_receipt_lines FOR SELECT USING (
  EXISTS(SELECT 1 FROM goods_receipts gr WHERE gr.id = goods_receipt_id AND (
    is_admin() OR gr.received_by = auth.uid()
    OR get_user_role() IN ('drp_procurement', 'accounting', 'warehouse')
  ))
);
CREATE POLICY gr_lines_insert ON goods_receipt_lines FOR INSERT WITH CHECK (
  get_user_role() IN ('project_manager', 'drp_procurement', 'warehouse')
);

-- THREE WAY MATCHES
CREATE POLICY twm_select ON three_way_matches FOR SELECT USING (
  is_admin() OR get_user_role() IN ('accounting', 'drp_procurement')
);
CREATE POLICY twm_insert ON three_way_matches FOR INSERT WITH CHECK (true);
CREATE POLICY twm_update ON three_way_matches FOR UPDATE USING (
  is_admin() OR get_user_role() = 'accounting'
);

-- APPROVAL LOGS: readable by admin and relevant roles
CREATE POLICY approval_logs_select ON approval_logs FOR SELECT USING (
  is_admin() OR approved_by = auth.uid()
  OR get_user_role() IN ('drp_procurement', 'accounting')
);
CREATE POLICY approval_logs_insert ON approval_logs FOR INSERT WITH CHECK (true);

-- APPROVAL THRESHOLDS: admin manages
CREATE POLICY thresholds_select ON approval_thresholds FOR SELECT USING (
  get_user_role() IN ('admin', 'drp_procurement')
);
CREATE POLICY thresholds_insert ON approval_thresholds FOR INSERT WITH CHECK (is_admin());
CREATE POLICY thresholds_update ON approval_thresholds FOR UPDATE USING (is_admin());

-- AUDIT TRAIL: admin only
CREATE POLICY audit_select ON audit_trail FOR SELECT USING (is_admin());
CREATE POLICY audit_insert ON audit_trail FOR INSERT WITH CHECK (true);

-- ============================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================

-- Note: Storage bucket creation is done via Supabase API/dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('canvass-docs', 'canvass-docs', false),
--   ('pr-docs', 'pr-docs', false),
--   ('po-docs', 'po-docs', false),
--   ('receiving-photos', 'receiving-photos', false),
--   ('payment-docs', 'payment-docs', false),
--   ('invoice-docs', 'invoice-docs', false);

-- ============================================
-- REALTIME: enable on key tables
-- ============================================

-- Note: Enable realtime via Supabase dashboard for:
-- purchase_requests, purchase_orders, payments, goods_receipts, approval_logs
