# DELCOM PROJECT HUB

## System Architecture Document

**Purchase Request, Approval & Disbursement System**

| | |
|---|---|
| **Prepared for** | Delcom Projects |
| **Version** | 1.0 |
| **Date** | March 14, 2026 |
| **Classification** | Confidential |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Module Breakdown](#3-module-breakdown)
4. [Data Model](#4-data-model)
5. [Process Flows](#5-process-flows)
6. [Permission Matrix](#6-permission-matrix)
7. [Intelligence Layer](#7-intelligence-layer)
8. [Dashboard Views](#8-dashboard-views)
9. [Notification Matrix](#9-notification-matrix)
10. [Entity Relationship Summary](#10-entity-relationship-summary)
11. [Build Sequence](#11-build-sequence)
12. [Database & Infrastructure Notes](#12-database--infrastructure-notes)
13. [Appendix](#13-appendix)

---

## 1. Executive Summary

Delcom Project Hub is a purpose-built procurement and disbursement management system for Delcom Projects, a construction and fit-out company. The system digitizes the entire lifecycle from project budgeting through material canvassing, purchase request creation, approval routing, purchase order management, payment disbursement, and goods receiving.

The system is designed mobile-first for field operations, with AI-powered intelligence for double-order detection, price anomaly alerts, budget burn-rate projections, and supplier performance scoring. It runs on a Next.js + Supabase stack, independent from but architecturally aligned with AtlasMini ERP.

### 1.1 Key Design Principles

**Mobile-First:** Project managers and receivers operate on-site. Photo capture, quick PR creation, and delivery confirmation are primary mobile workflows.

**Budget Discipline with Flexibility:** Encumbrance at PR creation with dual constraints (qty + value). System flags over-budget but does not block, allowing operational continuity while maintaining visibility.

**Intelligent Automation:** AI-driven double-order detection, price anomaly alerts, auto-PR generation from canvass results, and supplier recommendations based on historical performance.

**Full Audit Trail:** Every field change on every record is logged with timestamp and user identity, providing complete traceability for construction project governance.

**Configurable Approval Engine:** Threshold-based routing with delegation, bulk approval, and conditional approval support.

---

## 2. System Architecture Overview

### 2.1 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (React) | Mobile-first responsive, PWA-capable |
| Backend / API | Next.js API Routes + Supabase Edge Functions | Serverless, auto-scaling |
| Database | Supabase (PostgreSQL) | RLS, real-time subscriptions, full-text search |
| Authentication | Supabase Auth | Role-based access, session management |
| File Storage | Supabase Storage | Photos, documents, quotation PDFs |
| AI / Intelligence | Anthropic Claude API | Price analysis, anomaly detection, OCR |
| Notifications | Supabase Realtime + Push | In-app, email, mobile push |
| Mobile Capture | Device camera + OCR pipeline | Delivery receipt photo capture |
| Future Integrations | BizLink, GCash, QuickBooks | Not v1 priority |

### 2.2 High-Level Architecture

The system follows a layered architecture with clear separation of concerns:

| Layer | Components | Responsibility |
|---|---|---|
| Presentation | Next.js Pages, Mobile Views, Dashboards | UI rendering, form handling, photo capture |
| Application Logic | API Routes, Edge Functions, Workflow Engine | Business rules, approval routing, budget checks |
| Intelligence | AI Services, OCR Pipeline, Analytics Engine | Price analysis, double-order detection, projections |
| Data | PostgreSQL, Storage, Audit Log | Persistence, file management, change tracking |
| Integration | External API Connectors | BizLink, GCash, QuickBooks (future) |

---

## 3. Module Breakdown

The system is organized into 10 core modules:

| # | Module | Description |
|---|---|---|
| M1 | Project Management | Project lifecycle, cost categories, budget setup |
| M2 | Budget & Encumbrance | Dual-constraint budgets, versioning, encumbrance tracking |
| M3 | Supplier Master | Supplier database, payment terms, performance tracking, blacklisting |
| M4 | Canvassing & Quotation | Quote capture, comparison matrix, historical pricing, validity tracking |
| M5 | Purchase Request (PR) | PR creation (manual + auto), budget check, over-budget flagging |
| M6 | Approval Engine | Threshold routing, delegation, bulk approval, conditional approval |
| M7 | Purchase Order (PO) | PO generation, PR consolidation, milestone schedules, subcontracts |
| M8 | Payment & Disbursement | Multi-method payment, hold/release, split payments, progress billing |
| M9 | Receiving & 3-Way Match | Mobile receiving, partial deliveries, photo capture, OCR, 2% tolerance |
| M10 | Intelligence & Analytics | AI detection, price alerts, burn-rate, dashboards, audit trail |

---

## 4. Data Model

All tables include standard audit columns: `id` (UUID), `created_at`, `updated_at`, `created_by`, `updated_by`.

### 4.1 `projects`

Each project maps 1:1 to a physical jobsite.

| Column | Type | Description |
|---|---|---|
| project_code | TEXT UNIQUE | Auto-generated project identifier |
| name | TEXT NOT NULL | Project name / description |
| status | ENUM | draft, active, on_hold, completed, closed |
| client_name | TEXT | Client / property owner |
| site_address | TEXT | Physical jobsite location |
| start_date | DATE | Planned start date |
| target_end_date | DATE | Planned completion date |
| actual_end_date | DATE | Actual completion date |
| project_manager_id | UUID FK | Assigned PM (users table) |
| total_estimate | DECIMAL | Sum of all budget categories |

**Constraint:** No new PRs allowed when status = completed or closed. Enforced at API and RLS level.

### 4.2 `project_cost_categories`

Each project defines its own cost categories. Admin maintains a master list of category templates that can be applied to new projects.

| Column | Type | Description |
|---|---|---|
| project_id | UUID FK | Parent project |
| category_code | TEXT | Short code (e.g., STRUCT, ELEC, PLUMB) |
| name | TEXT NOT NULL | Category name (e.g., Structural Works) |
| budget_type | ENUM | qty_only, value_only, qty_and_value |
| budget_qty | DECIMAL | Max quantity (if applicable) |
| budget_qty_unit | TEXT | Unit of measure for qty budget |
| budget_value | DECIMAL | Max peso value (if applicable) |
| encumbered_qty | DECIMAL | Currently encumbered quantity |
| encumbered_value | DECIMAL | Currently encumbered peso value |
| actual_qty | DECIMAL | Actual consumed quantity |
| actual_value | DECIMAL | Actual spent value |
| version | INT | Current budget version number |

### 4.3 `budget_versions`

Tracks all budget revisions per cost category. Admin approves revisions. Old versions remain visible for audit.

| Column | Type | Description |
|---|---|---|
| cost_category_id | UUID FK | Parent cost category |
| version_number | INT | Sequential version |
| previous_budget_qty | DECIMAL | Qty budget before revision |
| new_budget_qty | DECIMAL | Qty budget after revision |
| previous_budget_value | DECIMAL | Value budget before revision |
| new_budget_value | DECIMAL | Value budget after revision |
| revision_reason | TEXT | Reason for revision |
| triggered_by_pr_id | UUID FK | PR that triggered revision (if any) |
| approved_by | UUID FK | Admin who approved |
| approved_at | TIMESTAMP | Approval timestamp |
| status | ENUM | pending, approved, rejected |

### 4.4 `suppliers`

| Column | Type | Description |
|---|---|---|
| supplier_code | TEXT UNIQUE | Auto-generated supplier ID |
| name | TEXT NOT NULL | Supplier / subcontractor name |
| type | ENUM | material_supplier, subcontractor, both |
| contact_person | TEXT | Primary contact name |
| phone | TEXT | Contact phone |
| email | TEXT | Contact email |
| address | TEXT | Business address |
| payment_terms | TEXT | Default terms (COD, 30-day, progressive, etc.) |
| tax_id | TEXT | TIN number |
| is_approved_vendor | BOOLEAN | On approved vendor list |
| is_active | BOOLEAN | Active/deactivated status |
| performance_score | DECIMAL | AI-computed composite score |
| avg_delivery_reliability | DECIMAL | % on-time deliveries |
| avg_price_competitiveness | DECIMAL | Relative to market average |

### 4.5 `canvass_sessions`

A canvass session groups all quotation requests for a set of items needed by a project.

| Column | Type | Description |
|---|---|---|
| project_id | UUID FK | Associated project |
| cost_category_id | UUID FK | Cost category being canvassed |
| canvass_type | ENUM | materials, subcontract |
| description | TEXT | Scope description |
| min_quotes_required | INT | Configurable per threshold |
| status | ENUM | open, evaluating, awarded, cancelled |
| created_by | UUID FK | DRP staff who initiated |

### 4.6 `canvass_quotes`

Individual supplier quotes within a canvass session.

| Column | Type | Description |
|---|---|---|
| canvass_session_id | UUID FK | Parent canvass session |
| supplier_id | UUID FK | Quoting supplier |
| item_name | TEXT | Material item or scope description |
| unit_price | DECIMAL | Price per unit (materials) or lump sum (subcontract) |
| quantity | DECIMAL | Quoted quantity |
| uom | TEXT | Unit of measure |
| total_price | DECIMAL | Computed total |
| delivery_lead_days | INT | Promised delivery lead time |
| payment_terms | TEXT | Supplier-specific terms for this quote |
| validity_date | DATE | Quote expiry date |
| conditions | TEXT | Special conditions or notes |
| is_selected | BOOLEAN | Winning quote flag |
| attachment_urls | JSONB | Uploaded quotation PDFs/photos/spreadsheets |

### 4.7 `price_history`

Tracks historical prices for AI-powered price intelligence.

| Column | Type | Description |
|---|---|---|
| item_name_normalized | TEXT | Normalized item name for matching |
| supplier_id | UUID FK | Supplier who offered/fulfilled |
| project_id | UUID FK | Project context |
| unit_price | DECIMAL | Historical price |
| uom | TEXT | Unit of measure |
| date_recorded | DATE | When price was recorded |
| source | ENUM | canvass, po, invoice |

### 4.8 `purchase_requests`

Core transactional entity. 1 PR = 1 Supplier. PR owner is always the creator.

| Column | Type | Description |
|---|---|---|
| pr_number | TEXT UNIQUE | Auto-generated PR number |
| project_id | UUID FK | Associated project |
| supplier_id | UUID FK | Target supplier |
| cost_category_id | UUID FK | Budget category |
| pr_type | ENUM | standard (from canvass), urgent (PM direct) |
| status | ENUM | draft, submitted, approved, rejected, cancelled, converted_to_po |
| is_over_budget | BOOLEAN | Flagged if exceeds budget at creation |
| is_pre_approved | BOOLEAN | Auto-approved per pre-approval rules |
| total_amount | DECIMAL | Sum of line items |
| justification | TEXT | Business justification (required for urgent/over-budget) |
| canvass_quote_id | UUID FK | Source canvass quote (if auto-created) |
| requested_delivery_date | DATE | When materials are needed |
| po_id | UUID FK | Linked PO after conversion |
| owner_id | UUID FK | PR creator = owner |
| attachment_urls | JSONB | Supporting docs (plans, specs) |

### 4.9 `purchase_request_lines`

| Column | Type | Description |
|---|---|---|
| pr_id | UUID FK | Parent PR |
| item_name | TEXT NOT NULL | Material / scope description |
| quantity | DECIMAL NOT NULL | Requested quantity |
| uom | TEXT | Unit of measure |
| unit_price | DECIMAL NOT NULL | Price per unit |
| total_price | DECIMAL | Computed line total |
| cost_category_id | UUID FK | Specific budget line (if granular) |

### 4.10 `pre_approval_rules`

Configurable rules that allow automatic PR approval. Admin maintains these.

| Column | Type | Description |
|---|---|---|
| rule_name | TEXT | Descriptive rule name |
| category_pattern | TEXT | Matching cost category (or wildcard) |
| supplier_id | UUID FK | Specific approved vendor (nullable = any) |
| max_line_amount | DECIMAL | Max per-line amount for auto-approval |
| max_pr_amount | DECIMAL | Max total PR amount for auto-approval |
| price_tolerance_pct | DECIMAL | Max % above estimate price |
| is_active | BOOLEAN | Rule enabled/disabled |

### 4.11 `purchase_orders`

Generated from approved PRs. Multiple PRs can consolidate into 1 PO (same supplier, usually same project).

| Column | Type | Description |
|---|---|---|
| po_number | TEXT UNIQUE | Auto-generated PO number |
| project_id | UUID FK | Associated project |
| supplier_id | UUID FK | Supplier |
| status | ENUM | draft, pending_approval, approved, partially_received, fully_received, closed, cancelled |
| total_amount | DECIMAL | PO total value |
| payment_terms | TEXT | Agreed payment terms |
| delivery_date | DATE | Expected delivery |
| is_subcontract | BOOLEAN | Subcontract vs. material PO |
| approved_by | UUID FK | Approver |
| approved_at | TIMESTAMP | Approval timestamp |
| attachment_urls | JSONB | Signed PO document |

### 4.12 `po_lines`

| Column | Type | Description |
|---|---|---|
| po_id | UUID FK | Parent PO |
| pr_line_id | UUID FK | Source PR line |
| item_name | TEXT | Material / scope |
| quantity | DECIMAL | Ordered quantity |
| uom | TEXT | Unit of measure |
| unit_price | DECIMAL | Agreed unit price |
| total_price | DECIMAL | Line total |
| received_qty | DECIMAL | Running total received |
| is_fully_received | BOOLEAN | Delivery complete flag |

### 4.13 `po_milestones`

Progress billing milestones for subcontract POs. PM defines milestones and triggers completion.

| Column | Type | Description |
|---|---|---|
| po_id | UUID FK | Parent subcontract PO |
| milestone_number | INT | Sequential order |
| description | TEXT | Milestone description |
| percentage | DECIMAL | % of total PO value |
| amount | DECIMAL | Computed peso amount |
| status | ENUM | pending, completed, paid |
| completed_by | UUID FK | PM who confirmed completion |
| completed_at | TIMESTAMP | Completion timestamp |
| payment_id | UUID FK | Linked payment record |

### 4.14 `payments`

Tracks all disbursements. A PO can have multiple payments (split methods, partial, progress billing). Admin controls hold/release.

| Column | Type | Description |
|---|---|---|
| payment_number | TEXT UNIQUE | Auto-generated payment reference |
| po_id | UUID FK | Associated PO |
| milestone_id | UUID FK | Associated milestone (if progress billing) |
| amount | DECIMAL NOT NULL | Payment amount |
| payment_method | ENUM | check, bizlink, gcash, cash, petty_cash |
| status | ENUM | pending, on_hold, released, confirmed, failed |
| hold_reason | TEXT | Reason for hold (cash flow, manual) |
| released_by | UUID FK | Admin who released |
| released_at | TIMESTAMP | Release timestamp |
| confirmed_at | TIMESTAMP | When payment confirmed by accounting |
| reference_number | TEXT | Check #, transfer ref, GCash ref |
| attachment_urls | JSONB | Check images, transfer confirmations |

### 4.15 `goods_receipts`

Mobile-first receiving with photo capture. Supports partial deliveries.

| Column | Type | Description |
|---|---|---|
| gr_number | TEXT UNIQUE | Auto-generated receipt number |
| po_id | UUID FK | Associated PO |
| received_by | UUID FK | PM / warehouse staff / DRP who received |
| received_at | TIMESTAMP | Receipt timestamp |
| delivery_receipt_number | TEXT | Supplier DR number (manual or OCR) |
| photo_urls | JSONB | Delivery receipt photos |
| ocr_extracted_data | JSONB | OCR results (DR#, supplier, items) |
| notes | TEXT | Receiving notes or discrepancies |

### 4.16 `goods_receipt_lines`

| Column | Type | Description |
|---|---|---|
| goods_receipt_id | UUID FK | Parent receipt |
| po_line_id | UUID FK | PO line being received against |
| received_qty | DECIMAL | Quantity received in this delivery |
| is_within_tolerance | BOOLEAN | Within 2% of ordered qty |
| variance_pct | DECIMAL | % difference from ordered qty |
| notes | TEXT | Line-level discrepancy notes |

### 4.17 `three_way_matches`

Automated matching of PO, goods receipt, and supplier invoice. Tolerance: 2%.

| Column | Type | Description |
|---|---|---|
| po_id | UUID FK | Purchase order |
| goods_receipt_id | UUID FK | Goods receipt |
| invoice_number | TEXT | Supplier invoice reference |
| invoice_amount | DECIMAL | Invoiced amount |
| po_amount | DECIMAL | PO amount |
| received_amount | DECIMAL | Value of goods received |
| match_status | ENUM | matched, qty_variance, price_variance, unmatched |
| variance_pct | DECIMAL | Overall variance percentage |
| resolved_by | UUID FK | Who resolved exceptions |
| resolved_at | TIMESTAMP | Resolution timestamp |
| attachment_urls | JSONB | Invoice document |

### 4.18 `approval_logs`

| Column | Type | Description |
|---|---|---|
| entity_type | ENUM | pr, po, budget_revision, payment_release |
| entity_id | UUID | ID of the approved entity |
| action | ENUM | approved, rejected, returned, approved_with_conditions |
| conditions | TEXT | Conditions text (if conditional approval) |
| approved_by | UUID FK | Approver (or delegate) |
| delegated_from | UUID FK | Original approver if delegated |
| approved_at | TIMESTAMP | Action timestamp |
| notes | TEXT | Approver notes |

### 4.19 `audit_trail`

Every field change on every record, captured via database triggers.

| Column | Type | Description |
|---|---|---|
| table_name | TEXT | Source table |
| record_id | UUID | Record that changed |
| field_name | TEXT | Column that changed |
| old_value | TEXT | Previous value (JSON-encoded) |
| new_value | TEXT | New value (JSON-encoded) |
| changed_by | UUID FK | User who made the change |
| changed_at | TIMESTAMP | Change timestamp |
| action | ENUM | insert, update, delete |

### 4.20 `users`

| Column | Type | Description |
|---|---|---|
| email | TEXT UNIQUE | Login email |
| full_name | TEXT NOT NULL | Display name |
| role | ENUM | admin, project_manager, drp_procurement, drp_estimator, accounting, warehouse |
| phone | TEXT | Mobile number for notifications |
| is_active | BOOLEAN | Active/disabled |
| can_approve | BOOLEAN | Has approval authority |
| approval_limit | DECIMAL | Max amount this user can approve |
| delegated_to | UUID FK | Temporary approval delegate |
| delegation_expires_at | TIMESTAMP | Delegation expiry |

### 4.21 `approval_thresholds`

Configurable approval routing rules.

| Column | Type | Description |
|---|---|---|
| entity_type | ENUM | pr, po, subcontract |
| min_amount | DECIMAL | Lower bound |
| max_amount | DECIMAL | Upper bound (null = unlimited) |
| approver_role | ENUM | Role required to approve |
| min_canvass_quotes | INT | Minimum quotes required at this threshold |
| is_active | BOOLEAN | Rule active flag |

---

## 5. Process Flows

### 5.1 End-to-End Procurement Flow

The complete lifecycle from project setup to payment confirmation:

| Step | Action | Actor | Details |
|---|---|---|---|
| 1 | Project Created | DRP Team | Project record created with status = draft. PM assigned. |
| 2 | Budget Defined | DRP Estimator | BOM + lump-sum categories created. Dual constraints (qty + value) set per category. |
| 3 | Project Activated | Admin | Status changed to active. PRs now allowed. |
| 4 | Canvassing Initiated | DRP Procurement | Canvass session created for needed items. Quotes requested from suppliers. |
| 5 | Quotes Collected | DRP Procurement | Supplier quotes entered with price, lead time, terms, validity, conditions. |
| 6 | Quotes Evaluated | DRP Procurement | Side-by-side comparison matrix. Winning quote selected. |
| 7 | PR Created | DRP / PM | Auto-generated from canvass or manually created. Budget encumbrance applied. Over-budget flagged. |
| 8 | Pre-Approval Check | System | Rules engine evaluates: approved vendor + approved category + within price tolerance = auto-approved. |
| 9 | Approval Routing | Approver | Non-pre-approved PRs routed based on amount thresholds. Approve / reject / return / approve-with-conditions. |
| 10 | PO Created | DRP Procurement | Approved PRs converted to POs. System suggests consolidation for same supplier. |
| 11 | PO Approved | Approver | PO approval (subcontracts routed if above budget ceiling). |
| 12 | Payment Created | Accounting | Payment records created per PO. Method selected (check/BizLink/GCash/cash/petty cash). Splits allowed. |
| 13 | Payment Hold/Release | Admin | Admin tags payments for release or hold based on cash flow. Held payments queued. |
| 14 | Payment Confirmed | Accounting | Payment executed and confirmed. Confirmation sent to PR owner. |
| 15 | Goods Received | PM / Warehouse | Mobile receiving: photo capture, qty entry, OCR extraction. Partial deliveries tracked. |
| 16 | 3-Way Match | System | Auto-match PO vs. receipt vs. invoice. Flag variances > 2%. |
| 17 | Project Closeout | Admin | All POs received/paid, budget reconciled, project status = completed. |

### 5.2 Budget Encumbrance Flow

| Event | System Behavior |
|---|---|
| PR Created | System checks budget availability (qty and/or value). Encumbered amounts updated on cost category. If exceeds either limit, PR.is_over_budget = true. |
| PR Flagged (Over-Budget) | PR proceeds through normal approval flow with visible over-budget flag. Over-budget PR auto-triggers a budget revision request (status = pending) for admin review. |
| PR Rejected/Cancelled | Encumbered amount released back to available budget. Cost category encumbered fields decremented. |
| PO Created (Lower Amount) | If PO total is lower than PR total, the difference is NOT released. Encumbrance stays at PR level to provide conservative budget visibility. |
| Budget Revision Approved | Admin approves revision. New budget limits applied. Version number incremented. Previous version preserved in budget_versions table. |

### 5.3 Pre-Approval Rules Engine

When a PR is submitted, the system evaluates it against all active `pre_approval_rules`. A PR is auto-approved if ALL of the following conditions are met:

| # | Condition |
|---|---|
| 1 | Supplier is on approved vendor list (is_approved_vendor = true) OR rule has no supplier constraint |
| 2 | Cost category matches the rule pattern |
| 3 | Every line item unit price is within the configured tolerance % of the estimate price |
| 4 | Every line item amount is below the rule max_line_amount |
| 5 | Total PR amount is below the rule max_pr_amount |

If any condition fails, the PR is routed to manual approval per threshold-based routing.

### 5.4 AI Double-Order Detection

When a new PR is created, the AI matching engine scans for potential duplicates using the following signals:

| Signal | Logic |
|---|---|
| Same Item | Fuzzy match on item name (normalized) within the same project |
| Same Project | PR must be for the same project_id to be considered a duplicate |
| Overlapping Time Window | The new PR delivery date overlaps with an existing PR that is in submitted, approved, or converted_to_po status |
| Confidence Scoring | AI assigns a confidence score (0-100%). Threshold for notification: configurable (default 70%) |
| Action | System notifies DRP Procurement team. Does NOT block the PR. DRP resolves by confirming or cancelling the duplicate. |

### 5.5 Payment & Disbursement Flow

| Stage | Details |
|---|---|
| PO Approved | Payment records can now be created against this PO. |
| Material PO | Single payment or split payments created by accounting. Method per tranche (check, BizLink, GCash, cash, petty cash). |
| Subcontract PO | Payment schedule auto-created from PO milestones. Each milestone = one payment record. PM triggers milestone completion. |
| Hold/Release Tagging | Admin reviews pending payments. Tags each as release or hold. Hold includes reason (cash flow / manual judgment). |
| Payment Execution | Released payments processed by accounting. Reference numbers recorded (check #, transfer ref, etc.). |
| Confirmation | Accounting confirms payment. Confirmation and attachments (check image, transfer proof) sent to PR owner. |
| PR Owner Forwards | PR owner forwards confirmation to supplier and monitors delivery. |

---

## 6. Permission Matrix

Role-based access control enforced at API and Supabase RLS level.

| Action | Admin | PM | DRP Proc. | DRP Est. | Accounting | Warehouse |
|---|---|---|---|---|---|---|
| Create Project | Full | View | View | View | - | - |
| Define Budget | Full | View | View | Create/Edit | - | - |
| Approve Budget Revision | Full | - | - | - | - | - |
| Create Canvass Session | - | - | Full | - | - | - |
| Enter Supplier Quotes | - | - | Full | - | - | - |
| Create PR (Standard) | - | - | Full | - | - | - |
| Create PR (Urgent) | - | Full | - | - | - | - |
| Approve/Reject PR | Full | - | - | - | - | - |
| Bulk Approve PRs | Full | - | - | - | - | - |
| Create PO | - | - | Full | - | - | - |
| Approve PO | Full | - | - | - | - | - |
| Create Payment | - | - | - | - | Full | - |
| Hold/Release Payment | Full | - | - | - | - | - |
| Confirm Payment | - | - | - | - | Full | - |
| Receive Goods | - | Full | Full | - | - | Full |
| Confirm Milestone | - | Full | - | - | - | - |
| Manage Suppliers | Full | - | Edit | - | - | - |
| Manage Pre-Approval Rules | Full | - | - | - | - | - |
| Manage Approval Thresholds | Full | - | - | - | - | - |
| Delegate Approval | Full | - | - | - | - | - |
| View All Projects | Full | Own | All | All | All | Assigned |
| View Dashboards | Full (all) | Own projects | Procurement | Budget | Finance | - |
| View Audit Trail | Full | - | - | - | - | - |

---

## 7. Intelligence Layer

AI-powered features integrated throughout the system, powered by the Claude API with domain-specific prompting.

### 7.1 AI Features Summary

| Feature | Trigger | Data Sources | Output |
|---|---|---|---|
| Double-Order Detection | PR creation | Active PRs, PO lines, same project | Confidence score + notification to DRP team |
| Price Anomaly Alerts | Quote entry or PR creation | price_history, canvass_quotes, market benchmarks | Alert if price > threshold % above historical average |
| Budget Burn-Rate Projection | On-demand + weekly digest | Encumbered values, actual spend, project timeline | Projected budget exhaustion date per category |
| Supplier Recommendation | Canvass session creation | Supplier performance scores, price history, delivery reliability | Ranked supplier list with composite scores |
| Auto-Categorization (OCR) | Photo upload (receiving) | Delivery receipt image | Extracted: DR number, supplier name, line items, quantities |
| PR Auto-Generation | Canvass quote selection | Winning canvass_quote record | Pre-filled PR with supplier, price, terms, quantities |

### 7.2 Price Intelligence Engine

The price intelligence engine maintains a running profile per item (normalized name) per supplier. When a new quote or PR is created, the engine computes the deviation from the historical weighted average and from the project estimate. Alerts are triggered when deviation exceeds the admin-configured tolerance threshold. The system also tracks market-level averages across all suppliers to identify suppliers consistently above or below market.

### 7.3 Budget Burn-Rate Projections

For each project, the system tracks the rate of budget consumption (encumbered + actual) over time relative to the project timeline. Using linear extrapolation and optionally weighted-recent-activity modeling, it projects when each cost category will exhaust its budget. The projection is surfaced on the PM and Admin dashboards and included in a weekly digest notification.

---

## 8. Dashboard Views

### 8.1 Admin Dashboard

| Widget | Data |
|---|---|
| Active Projects Overview | All projects with status, budget utilization %, PM assigned |
| Pending Approvals Queue | PRs, POs, budget revisions awaiting admin action. Bulk approve enabled. |
| Cash Flow Summary | Total pending disbursements, held payments, released this week/month |
| Budget vs. Actual (All Projects) | Aggregate view: estimate vs. encumbered vs. actual by project |
| Overdue Payments | POs past payment terms with no confirmed payment |
| Alerts Feed | AI-generated: over-budget PRs, price anomalies, double-order warnings |

### 8.2 Project Manager Dashboard

| Widget | Data |
|---|---|
| My Projects | Cards per project with status, budget health, delivery schedule |
| Budget Status (per project) | Estimate vs. committed vs. actual, broken by cost category. Burn-rate projection. |
| PR/PO Tracker | Status pipeline: draft > submitted > approved > PO > received > paid |
| Delivery Schedule | Expected deliveries this week, overdue deliveries |
| Milestone Tracker | Subcontract milestones pending completion confirmation |

### 8.3 DRP Procurement Dashboard

| Widget | Data |
|---|---|
| Canvassing Pipeline | Open canvass sessions, quotes pending, sessions ready for evaluation |
| PR Queue | PRs pending creation from awarded canvasses, PRs pending approval |
| PO Status Board | POs by status: pending, partially received, fully received |
| Supplier Performance | Top/bottom suppliers by delivery reliability and price competitiveness |
| Double-Order Alerts | AI-flagged potential duplicate PRs requiring resolution |

### 8.4 Accounting Dashboard

| Widget | Data |
|---|---|
| Payment Queue | Payments pending creation, on-hold, ready for release |
| Disbursement Log | All confirmed payments with method, reference, amount, date |
| 3-Way Match Exceptions | Receipts with variance > 2% requiring resolution |
| Payment Terms Calendar | Upcoming payment due dates based on supplier terms |

---

## 9. Notification Matrix

| Event | Recipients | Channel |
|---|---|---|
| PR Submitted | Approver(s) per threshold | In-app + push |
| PR Approved | PR Owner, DRP Procurement | In-app + push |
| PR Rejected/Returned | PR Owner | In-app + push + email |
| PR Over-Budget Flag | PR Owner, Admin, PM | In-app + push |
| Budget Revision Request | Admin | In-app + push |
| Budget Revision Approved/Rejected | DRP Estimator, PM | In-app + push |
| PO Created | PR Owner, Supplier (optional) | In-app + email |
| PO Approved | DRP Procurement, Accounting | In-app + push |
| Payment Released | PR Owner, Accounting | In-app + push |
| Payment Confirmed | PR Owner | In-app + push + email |
| Payment On-Hold | Accounting | In-app |
| Goods Received | PR Owner, DRP Procurement | In-app + push |
| 3-Way Match Exception | Accounting, DRP Procurement | In-app + push |
| Double-Order Detected | DRP Procurement team | In-app + push |
| Price Anomaly Alert | DRP Procurement, Admin | In-app + push |
| Budget Threshold Warning (80%) | PM, Admin | In-app + push |
| Budget Threshold Warning (95%) | PM, Admin, DRP Estimator | In-app + push + email |
| Weekly Burn-Rate Digest | PM, Admin | Email |
| Approval Delegation Activated | Delegate, Original Approver | In-app + email |
| Milestone Completion Confirmed | Accounting, Admin | In-app + push |

---

## 10. Entity Relationship Summary

Key relationships between core entities:

| Relationship | Cardinality | Notes |
|---|---|---|
| Project : Cost Categories | 1 : Many | Each project defines its own categories |
| Cost Category : Budget Versions | 1 : Many | Full version history preserved |
| Project : Canvass Sessions | 1 : Many | Multiple canvasses per project |
| Canvass Session : Canvass Quotes | 1 : Many | Multiple supplier quotes per session |
| Project : Purchase Requests | 1 : Many | All PRs scoped to one project |
| Supplier : Purchase Requests | 1 : Many | 1 PR = 1 supplier (strict) |
| Canvass Quote : Purchase Request | 1 : 0..1 | Optional auto-generation link |
| Purchase Request : PR Lines | 1 : Many | Line items within a PR |
| Purchase Request : Purchase Order | Many : 1 | Multiple PRs can consolidate into 1 PO (same supplier) |
| Purchase Order : PO Lines | 1 : Many | Line items within a PO |
| Purchase Order : PO Milestones | 1 : Many | Subcontract progress billing only |
| Purchase Order : Payments | 1 : Many | Split payments, progress billing |
| Purchase Order : Goods Receipts | 1 : Many | Partial deliveries |
| Goods Receipt : GR Lines | 1 : Many | Line-level receiving |
| PO : Three-Way Match | 1 : Many | PO vs. receipt vs. invoice |
| User : Projects (as PM) | 1 : Many | PM manages multiple projects |

---

## 11. Build Sequence

Recommended phased build approach, prioritized by dependency order and operational impact.

### 11.1 Phase 1: Foundation (Weeks 1–3)

| Module | Scope | Deliverables |
|---|---|---|
| Auth & Users | Supabase auth, role management, user CRUD | Login, user management, role assignment |
| Project Management (M1) | Project CRUD, lifecycle states, PM assignment | Project list, create/edit, status transitions |
| Supplier Master (M3) | Supplier CRUD, approved vendor flag, deactivation | Supplier database, search, status management |
| Cost Category Master | Admin-maintained category templates | Category template CRUD, apply to projects |

### 11.2 Phase 2: Budget & Canvassing (Weeks 4–6)

| Module | Scope | Deliverables |
|---|---|---|
| Budget & Encumbrance (M2) | Budget definition, dual constraints, versioning, encumbrance logic | Budget setup, revision workflow, real-time tracking |
| Canvassing & Quotation (M4) | Canvass sessions, quote capture, comparison matrix, quote selection | Canvass flow, side-by-side comparison, winner selection |
| Price History | Historical price recording, deviation calculation | Price tracking, baseline computation |

### 11.3 Phase 3: PR & Approval (Weeks 7–9)

| Module | Scope | Deliverables |
|---|---|---|
| Purchase Request (M5) | PR creation (manual + auto from canvass), budget check, over-budget flagging | PR form, auto-generation, budget encumbrance |
| Approval Engine (M6) | Threshold routing, pre-approval rules, delegation, bulk approval, conditional approval | Approval workflow, delegation UI, batch operations |
| AI: Double-Order Detection | Fuzzy matching, notification | Detection engine, alert notifications |

### 11.4 Phase 4: PO & Payments (Weeks 10–13)

| Module | Scope | Deliverables |
|---|---|---|
| Purchase Order (M7) | PO generation, consolidation suggestions, milestone schedules | PO creation, PR-to-PO conversion, milestone setup |
| Payment & Disbursement (M8) | Multi-method payments, hold/release, split payments, progress billing | Payment queue, hold/release UI, disbursement log |

### 11.5 Phase 5: Receiving & Intelligence (Weeks 14–17)

| Module | Scope | Deliverables |
|---|---|---|
| Receiving & 3-Way Match (M9) | Mobile receiving, photo capture, OCR, partial deliveries, 2% tolerance matching | Mobile receive flow, match engine, exception handling |
| Intelligence & Analytics (M10) | Price anomaly alerts, burn-rate projection, supplier scoring, dashboards | AI alerts, projections, all 4 role dashboards |
| Audit Trail | Field-level change logging via DB triggers | Audit log viewer, export |

### 11.6 Phase 6: Polish & Future (Weeks 18–20)

| Module | Scope | Deliverables |
|---|---|---|
| Notification Engine | Full notification matrix implementation | Push, in-app, email notifications |
| Reporting & Export | PDF reports, Excel exports, project summary reports | Report generation, scheduled reports |
| Integration Prep | API stubs for BizLink, GCash, QuickBooks | Integration architecture, API contracts |

---

## 12. Database & Infrastructure Notes

### 12.1 Supabase Configuration

**Row-Level Security (RLS):** All tables have RLS policies. PMs see only their assigned projects. DRP staff see all projects. Accounting sees payment-related records. Admin sees everything.

**Real-Time Subscriptions:** Enabled on purchase_requests, purchase_orders, payments, goods_receipts, and approval_logs for live dashboard updates.

**Database Triggers:** Audit trail capture via AFTER INSERT/UPDATE/DELETE triggers on all core tables. Budget encumbrance recalculation via triggers on PR insert/update/delete.

**Indexes:** Composite indexes on (project_id, status) for all transactional tables. Full-text search index on item_name fields for double-order detection. Index on supplier_id + item_name_normalized for price history lookups.

### 12.2 File Storage Structure

Supabase Storage buckets organized by entity type:

| Bucket | Contents | Access |
|---|---|---|
| canvass-docs | Supplier quotation PDFs, photos, spreadsheets | DRP Procurement, Admin |
| pr-docs | PR supporting documents (plans, specs) | PR Owner, Approvers, Admin |
| po-docs | Signed PO documents | DRP Procurement, Accounting, Admin |
| receiving-photos | Delivery receipt photos, packing lists | Receivers, DRP, Accounting, Admin |
| payment-docs | Check images, transfer confirmations | Accounting, Admin |
| invoice-docs | Supplier invoices for 3-way matching | Accounting, Admin |

### 12.3 Mobile-First Considerations

**PWA Support:** Service workers for offline capability. Critical for jobsite receiving where connectivity may be intermittent.

**Camera Integration:** Native device camera access for delivery receipt photos. Compressed before upload.

**OCR Pipeline:** Photos uploaded to Supabase Storage, then processed by AI/OCR service. Extracted data presented for manual verification/correction before committing.

**Responsive Design:** All forms and dashboards optimized for mobile viewport. Quick-action patterns for common mobile tasks (receive goods, create urgent PR, approve).

---

## 13. Appendix

### 13.1 Status Enumerations

**Project Status:** draft, active, on_hold, completed, closed

**PR Status:** draft, submitted, approved, rejected, cancelled, converted_to_po

**PO Status:** draft, pending_approval, approved, partially_received, fully_received, closed, cancelled

**Payment Status:** pending, on_hold, released, confirmed, failed

**Canvass Status:** open, evaluating, awarded, cancelled

**Budget Revision Status:** pending, approved, rejected

**Milestone Status:** pending, completed, paid

**3-Way Match Status:** matched, qty_variance, price_variance, unmatched

**Approval Action:** approved, rejected, returned, approved_with_conditions

**Payment Method:** check, bizlink, gcash, cash, petty_cash

### 13.2 Configurable Thresholds (Admin-Managed)

| Threshold | Default | Description |
|---|---|---|
| Price tolerance % | Configurable | Max % above estimate for pre-approval |
| 3-way match tolerance | 2% | Max variance before flagging |
| Budget warning level 1 | 80% | First budget utilization warning |
| Budget warning level 2 | 95% | Critical budget warning |
| Double-order confidence | 70% | Min AI confidence to trigger notification |
| Min canvass quotes (low value) | 1 | Minimum quotes for low-value items |
| Min canvass quotes (mid value) | 2 | Minimum quotes for mid-value items |
| Min canvass quotes (high value) | 3 | Minimum quotes for high-value items |
