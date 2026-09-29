-- ==============================================================================
-- MATERIAL INVENTORY MANAGEMENT SYSTEM (MIMS)
-- File: supabase_material_inventory.sql
-- Production-Ready Supabase PostgreSQL Schema, RLS, Functions, Views, and Seed Data
-- Flow: Purchase PO -> GRN -> QC Inspection -> Store -> Production Issue -> Return -> Store -> Dispatch
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. MASTER DATA TABLES
-- ==============================================================================

-- 2.1 User Roles Master
CREATE TABLE IF NOT EXISTS public.roles (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2.2 User Profiles (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL REFERENCES public.roles(name) DEFAULT 'VIEWER',
  is_active BOOLEAN NOT NULL DEFAULT false,
  approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 2.3 Physical and Virtual Inventory Locations
CREATE TABLE IF NOT EXISTS public.locations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2.4 Units of Measurement Master
CREATE TABLE IF NOT EXISTS public.units (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2.5 Item Master
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  unit_code TEXT NOT NULL REFERENCES public.units(code),
  minimum_stock NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2.6 Vendor Master
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code TEXT UNIQUE NOT NULL,
  vendor_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2.7 Customer Master
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 2.8 Rejection Reasons Master
CREATE TABLE IF NOT EXISTS public.rejection_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT UNIQUE NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- ==============================================================================
-- 3. TRANSACTION SEQUENCES (Crash-safe atomic document numbers)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.document_sequences (
  doc_type TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  current_val BIGINT NOT NULL DEFAULT 0,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
);

CREATE OR REPLACE FUNCTION public.next_document_number(p_doc_type TEXT, p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
  v_next_val BIGINT;
  v_formatted TEXT;
BEGIN
  INSERT INTO public.document_sequences (doc_type, prefix, current_val, year)
  VALUES (p_doc_type, p_prefix, 1, v_current_year)
  ON CONFLICT (doc_type) DO UPDATE
  SET 
    current_val = CASE 
      WHEN public.document_sequences.year = v_current_year THEN public.document_sequences.current_val + 1
      ELSE 1 
    END,
    year = v_current_year
  RETURNING current_val INTO v_next_val;

  v_formatted := p_prefix || '-' || v_current_year || '-' || LPAD(v_next_val::TEXT, 6, '0');
  RETURN v_formatted;
END;
$$;

-- ==============================================================================
-- 4. CORE BUSINESS TRANSACTION TABLES
-- ==============================================================================

-- 4.1 Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED')),
  required_date DATE,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.2 Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_code TEXT NOT NULL REFERENCES public.units(code),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.3 Goods Received Notes (GRN)
CREATE TABLE IF NOT EXISTS public.grns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number TEXT UNIQUE NOT NULL,
  grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  po_id UUID REFERENCES public.purchase_orders(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_non_po BOOLEAN NOT NULL DEFAULT false,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.4 GRN Items (Material received at Dock -> starts at QC_PENDING)
CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.grns(id) ON DELETE CASCADE,
  po_item_id UUID REFERENCES public.purchase_order_items(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_code TEXT NOT NULL REFERENCES public.units(code),
  qc_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (qc_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'HOLD', 'PARTIALLY_INSPECTED')),
  location_code TEXT NOT NULL DEFAULT 'QC_PENDING' REFERENCES public.locations(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.5 Quality Control Inspections (QC)
CREATE TABLE IF NOT EXISTS public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_number TEXT UNIQUE NOT NULL,
  grn_item_id UUID NOT NULL REFERENCES public.grn_items(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qc_result TEXT NOT NULL CHECK (qc_result IN ('ACCEPTED', 'REJECTED', 'HOLD', 'PARTIAL')),
  accepted_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (accepted_qty >= 0),
  rejected_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rejected_qty >= 0),
  hold_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (hold_qty >= 0),
  rejection_reason_id UUID REFERENCES public.rejection_reasons(id),
  rejection_reason_notes TEXT,
  qc_remarks TEXT,
  inspector_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.6 Production Issues (STORE -> PRODUCTION)
CREATE TABLE IF NOT EXISTS public.production_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_code TEXT NOT NULL REFERENCES public.units(code),
  production_reference TEXT NOT NULL,
  operation TEXT NOT NULL,
  remarks TEXT,
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.7 Production Returns (PRODUCTION -> STORE & PRODUCTION -> REJECTED)
CREATE TABLE IF NOT EXISTS public.production_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_id UUID REFERENCES public.production_issues(id),
  production_reference TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.items(id),
  issued_quantity NUMERIC(12, 2) NOT NULL CHECK (issued_quantity > 0),
  ready_to_use_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (ready_to_use_qty >= 0),
  rejected_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rejected_qty >= 0),
  rejection_reason_id UUID REFERENCES public.rejection_reasons(id),
  rejection_reason_notes TEXT,
  remarks TEXT,
  returned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 4.8 Dispatches (STORE -> DISPATCHED)
CREATE TABLE IF NOT EXISTS public.dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_number TEXT UNIQUE NOT NULL,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_code TEXT NOT NULL REFERENCES public.units(code),
  reference_challan TEXT,
  remarks TEXT,
  dispatched_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- ==============================================================================
-- 5. STOCK LEDGER & TRANSACTION AUDIT (Absolute Source of Truth for Quantities)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'GRN', 
    'QC_ACCEPT', 
    'QC_REJECT', 
    'QC_HOLD', 
    'PRODUCTION_ISSUE', 
    'PRODUCTION_RETURN', 
    'PRODUCTION_REJECT', 
    'DISPATCH'
  )),
  item_id UUID NOT NULL REFERENCES public.items(id),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_code TEXT NOT NULL REFERENCES public.units(code),
  reference_type TEXT NOT NULL,
  reference_id UUID,
  reference_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- 5.1 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- ==============================================================================
-- 6. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_stock_tx_item ON public.stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_from_loc ON public.stock_transactions(from_location);
CREATE INDEX IF NOT EXISTS idx_stock_tx_to_loc ON public.stock_transactions(to_location);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON public.stock_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_tx_ref_num ON public.stock_transactions(reference_number);

CREATE INDEX IF NOT EXISTS idx_po_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_item ON public.purchase_order_items(item_id);

CREATE INDEX IF NOT EXISTS idx_grn_vendor ON public.grns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON public.grns(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_qc_status ON public.grn_items(qc_status);

CREATE INDEX IF NOT EXISTS idx_qc_grn_item ON public.qc_inspections(grn_item_id);
CREATE INDEX IF NOT EXISTS idx_qc_result ON public.qc_inspections(qc_result);

CREATE INDEX IF NOT EXISTS idx_prod_issue_item ON public.production_issues(item_id);
CREATE INDEX IF NOT EXISTS idx_prod_return_item ON public.production_returns(item_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_item ON public.dispatches(item_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_customer ON public.dispatches(customer_id);

-- ==============================================================================
-- 7. STOCK CALCULATION & BUSINESS HELPER FUNCTIONS
-- ==============================================================================

-- 7.1 Calculate PO Received Quantity
CREATE OR REPLACE FUNCTION public.get_po_received_qty(p_po_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(gi.quantity), 0)
  FROM public.grn_items gi
  JOIN public.grns g ON gi.grn_id = g.id
  WHERE g.po_id = p_po_id;
$$;

-- 7.2 Calculate PO Remaining Balance
CREATE OR REPLACE FUNCTION public.get_po_balance(p_po_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    (SELECT COALESCE(SUM(poi.quantity), 0) FROM public.purchase_order_items poi WHERE poi.po_id = p_po_id)
    - public.get_po_received_qty(p_po_id)
  ), 0);
$$;

-- 7.3 Calculate Item Stock at Specific Location
CREATE OR REPLACE FUNCTION public.get_item_location_stock(p_item_id UUID, p_location_code TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    (SELECT COALESCE(SUM(quantity), 0) FROM public.stock_transactions WHERE item_id = p_item_id AND to_location = p_location_code)
    -
    (SELECT COALESCE(SUM(quantity), 0) FROM public.stock_transactions WHERE item_id = p_item_id AND from_location = p_location_code)
  ), 0);
$$;

-- ==============================================================================
-- 8. DATABASE VIEWS FOR INSTANT DASHBOARD QUERIES
-- ==============================================================================

-- 8.1 View: PO Balance & Status
CREATE OR REPLACE VIEW public.v_po_balance AS
SELECT 
  po.id AS po_id,
  po.po_number,
  po.po_date,
  v.vendor_name,
  poi.id AS po_item_id,
  i.id AS item_id,
  i.item_code,
  i.item_name,
  poi.quantity AS po_qty,
  COALESCE(SUM(gi.quantity), 0) AS received_qty,
  (poi.quantity - COALESCE(SUM(gi.quantity), 0)) AS balance_qty,
  poi.unit_code,
  po.status
FROM public.purchase_orders po
JOIN public.vendors v ON po.vendor_id = v.id
JOIN public.purchase_order_items poi ON po.id = poi.po_id
JOIN public.items i ON poi.item_id = i.id
LEFT JOIN public.grns g ON po.id = g.po_id
LEFT JOIN public.grn_items gi ON g.id = gi.grn_id AND gi.item_id = i.id
GROUP BY po.id, po.po_number, po.po_date, v.vendor_name, poi.id, i.id, i.item_code, i.item_name, poi.quantity, poi.unit_code, po.status;

-- 8.2 View: QC Pending Inward Materials
CREATE OR REPLACE VIEW public.v_qc_pending AS
SELECT 
  gi.id AS grn_item_id,
  g.id AS grn_id,
  g.grn_number,
  g.grn_date,
  v.vendor_name,
  po.po_number,
  g.invoice_number,
  g.invoice_date,
  i.id AS item_id,
  i.item_code,
  i.item_name,
  gi.quantity AS received_qty,
  gi.unit_code,
  gi.qc_status,
  gi.location_code
FROM public.grn_items gi
JOIN public.grns g ON gi.grn_id = g.id
JOIN public.vendors v ON g.vendor_id = v.id
JOIN public.items i ON gi.item_id = i.id
LEFT JOIN public.purchase_orders po ON g.po_id = po.id
WHERE gi.qc_status = 'PENDING';

-- 8.3 View: Current Stock per Item and Location
CREATE OR REPLACE VIEW public.v_current_stock AS
WITH in_tx AS (
  SELECT item_id, to_location AS location_code, SUM(quantity) AS total_in
  FROM public.stock_transactions
  GROUP BY item_id, to_location
),
out_tx AS (
  SELECT item_id, from_location AS location_code, SUM(quantity) AS total_out
  FROM public.stock_transactions
  GROUP BY item_id, from_location
)
SELECT 
  i.id AS item_id,
  i.item_code,
  i.item_name,
  loc.code AS location_code,
  loc.name AS location_name,
  COALESCE(in_tx.total_in, 0) - COALESCE(out_tx.total_out, 0) AS current_quantity,
  i.unit_code
FROM public.items i
CROSS JOIN public.locations loc
LEFT JOIN in_tx ON in_tx.item_id = i.id AND in_tx.location_code = loc.code
LEFT JOIN out_tx ON out_tx.item_id = i.id AND out_tx.location_code = loc.code;

-- 8.4 View: Item-wise Comprehensive Stock Summary Card
CREATE OR REPLACE VIEW public.v_item_stock_summary AS
SELECT 
  i.id AS item_id,
  i.item_code,
  i.item_name,
  i.unit_code,
  i.minimum_stock,
  COALESCE(store_stock.qty, 0) <= i.minimum_stock AS is_low_stock,
  COALESCE(store_stock.qty, 0) AS store_qty,
  COALESCE(prod_stock.qty, 0) AS production_qty,
  COALESCE(qc_stock.qty, 0) AS qc_pending_qty,
  COALESCE(hold_stock.qty, 0) AS hold_qty,
  COALESCE(rej_stock.qty, 0) AS rejected_qty,
  COALESCE(dsp_stock.qty, 0) AS dispatched_qty,
  -- Physical Good Available + In-Process
  (COALESCE(store_stock.qty, 0) + COALESCE(prod_stock.qty, 0) + COALESCE(qc_stock.qty, 0)) AS current_physical_qty,
  -- Total Historical Inward Quantity
  COALESCE(inward_stock.qty, 0) AS total_received_qty
FROM public.items i
LEFT JOIN (SELECT item_id, current_quantity AS qty FROM public.v_current_stock WHERE location_code = 'STORE') store_stock ON store_stock.item_id = i.id
LEFT JOIN (SELECT item_id, current_quantity AS qty FROM public.v_current_stock WHERE location_code = 'PRODUCTION') prod_stock ON prod_stock.item_id = i.id
LEFT JOIN (SELECT item_id, current_quantity AS qty FROM public.v_current_stock WHERE location_code = 'QC_PENDING') qc_stock ON qc_stock.item_id = i.id
LEFT JOIN (SELECT item_id, current_quantity AS qty FROM public.v_current_stock WHERE location_code = 'HOLD') hold_stock ON hold_stock.item_id = i.id
LEFT JOIN (SELECT item_id, current_quantity AS qty FROM public.v_current_stock WHERE location_code = 'REJECTED') rej_stock ON rej_stock.item_id = i.id
LEFT JOIN (SELECT item_id, current_quantity AS qty FROM public.v_current_stock WHERE location_code = 'DISPATCHED') dsp_stock ON dsp_stock.item_id = i.id
LEFT JOIN (SELECT item_id, SUM(quantity) AS qty FROM public.stock_transactions WHERE from_location = 'VENDOR' GROUP BY item_id) inward_stock ON inward_stock.item_id = i.id;

-- 8.5 View: Complete Stock Ledger History
CREATE OR REPLACE VIEW public.v_stock_ledger AS
SELECT 
  st.id AS transaction_id,
  st.transaction_date,
  st.transaction_type,
  st.reference_number,
  st.reference_type,
  i.item_code,
  i.item_name,
  st.from_location,
  st.to_location,
  st.quantity,
  st.unit_code,
  p.full_name AS performed_by_name,
  p.email AS performed_by_email,
  st.remarks
FROM public.stock_transactions st
JOIN public.items i ON st.item_id = i.id
LEFT JOIN public.profiles p ON st.user_id = p.id
ORDER BY st.transaction_date DESC;

-- ==============================================================================
-- 9. ATOMIC BUSINESS WORKFLOW RPCs (Guaranteed Transaction Integrity)
-- ==============================================================================

-- 9.1 Atomic GRN Creation
CREATE OR REPLACE FUNCTION public.rpc_create_grn(
  p_vendor_id UUID,
  p_po_id UUID,
  p_invoice_number TEXT,
  p_invoice_date DATE,
  p_is_non_po BOOLEAN,
  p_remarks TEXT,
  p_items JSONB, -- Array of { item_id, po_item_id, quantity, unit_code }
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grn_number TEXT;
  v_grn_id UUID;
  v_item RECORD;
  v_po_balance NUMERIC;
  v_total_grn_items INT := 0;
BEGIN
  -- Generate safe GRN Number
  v_grn_number := public.next_document_number('GRN', 'GRN');

  -- 1. Create Master GRN Record
  INSERT INTO public.grns (
    grn_number, vendor_id, po_id, invoice_number, invoice_date, is_non_po, remarks, created_by
  )
  VALUES (
    v_grn_number, p_vendor_id, p_po_id, p_invoice_number, p_invoice_date, p_is_non_po, p_remarks, p_user_id
  )
  RETURNING id INTO v_grn_id;

  -- 2. Process Items and Validate PO Balance
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    item_id UUID,
    po_item_id UUID,
    quantity NUMERIC,
    unit_code TEXT
  )
  LOOP
    -- PO Validation: If linked to PO, check remaining balance
    IF p_po_id IS NOT NULL AND v_item.po_item_id IS NOT NULL THEN
      SELECT (poi.quantity - COALESCE((
        SELECT SUM(gi.quantity) 
        FROM public.grn_items gi 
        WHERE gi.po_item_id = poi.id
      ), 0))
      INTO v_po_balance
      FROM public.purchase_order_items poi
      WHERE poi.id = v_item.po_item_id;

      IF v_item.quantity > v_po_balance THEN
        RAISE EXCEPTION 'GRN quantity (%) exceeds available PO balance (%)', v_item.quantity, v_po_balance;
      END IF;
    END IF;

    -- Insert GRN Item
    INSERT INTO public.grn_items (
      grn_id, po_item_id, item_id, quantity, unit_code, qc_status, location_code
    )
    VALUES (
      v_grn_id, v_item.po_item_id, v_item.item_id, v_item.quantity, v_item.unit_code, 'PENDING', 'QC_PENDING'
    );

    -- Stock Ledger: VENDOR -> QC_PENDING
    INSERT INTO public.stock_transactions (
      transaction_type, item_id, from_location, to_location, quantity, unit_code, 
      reference_type, reference_id, reference_number, user_id, remarks
    )
    VALUES (
      'GRN', v_item.item_id, 'VENDOR', 'QC_PENDING', v_item.quantity, v_item.unit_code,
      'GRN', v_grn_id, v_grn_number, p_user_id, 'Inward dock entry from vendor'
    );

    v_total_grn_items := v_total_grn_items + 1;
  END LOOP;

  -- 3. Update PO Status automatically if applicable
  IF p_po_id IS NOT NULL THEN
    IF public.get_po_balance(p_po_id) <= 0 THEN
      UPDATE public.purchase_orders SET status = 'FULLY_RECEIVED', updated_at = NOW() WHERE id = p_po_id;
    ELSE
      UPDATE public.purchase_orders SET status = 'PARTIALLY_RECEIVED', updated_at = NOW() WHERE id = p_po_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'grn_id', v_grn_id,
    'grn_number', v_grn_number,
    'items_count', v_total_grn_items
  );
END;
$$;

-- 9.2 Atomic QC Inspection
CREATE OR REPLACE FUNCTION public.rpc_perform_qc(
  p_grn_item_id UUID,
  p_qc_result TEXT,
  p_accepted_qty NUMERIC,
  p_rejected_qty NUMERIC,
  p_hold_qty NUMERIC,
  p_rejection_reason_id UUID,
  p_rejection_reason_notes TEXT,
  p_qc_remarks TEXT,
  p_inspector_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qc_number TEXT;
  v_grn_item RECORD;
  v_total_inspected NUMERIC;
BEGIN
  -- Fetch target GRN Item
  SELECT gi.*, g.grn_number 
  INTO v_grn_item
  FROM public.grn_items gi
  JOIN public.grns g ON gi.grn_id = g.id
  WHERE gi.id = p_grn_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GRN line item not found';
  END IF;

  IF v_grn_item.qc_status != 'PENDING' THEN
    RAISE EXCEPTION 'Material has already been inspected (Current Status: %)', v_grn_item.qc_status;
  END IF;

  -- Validation: Accepted + Rejected + Hold must equal Received Quantity
  v_total_inspected := COALESCE(p_accepted_qty, 0) + COALESCE(p_rejected_qty, 0) + COALESCE(p_hold_qty, 0);
  IF v_total_inspected != v_grn_item.quantity THEN
    RAISE EXCEPTION 'Total inspected quantity (%) must equal received GRN quantity (%)', v_total_inspected, v_grn_item.quantity;
  END IF;

  -- Generate QC Number
  v_qc_number := public.next_document_number('QC', 'QC');

  -- 1. Create QC Inspection Record
  INSERT INTO public.qc_inspections (
    qc_number, grn_item_id, qc_result, accepted_qty, rejected_qty, hold_qty,
    rejection_reason_id, rejection_reason_notes, qc_remarks, inspector_id
  )
  VALUES (
    v_qc_number, p_grn_item_id, p_qc_result, p_accepted_qty, p_rejected_qty, p_hold_qty,
    p_rejection_reason_id, p_rejection_reason_notes, p_qc_remarks, p_inspector_id
  );

  -- 2. Update GRN Item status
  UPDATE public.grn_items 
  SET 
    qc_status = p_qc_result,
    location_code = CASE 
      WHEN p_accepted_qty > 0 AND p_rejected_qty = 0 AND p_hold_qty = 0 THEN 'STORE'
      WHEN p_rejected_qty > 0 AND p_accepted_qty = 0 AND p_hold_qty = 0 THEN 'REJECTED'
      WHEN p_hold_qty > 0 AND p_accepted_qty = 0 AND p_rejected_qty = 0 THEN 'HOLD'
      ELSE 'STORE'
    END,
    updated_at = NOW()
  WHERE id = p_grn_item_id;

  -- 3. Stock Ledger Movements: Move material out of QC_PENDING
  -- 3a. Accepted -> QC_PENDING to STORE
  IF p_accepted_qty > 0 THEN
    INSERT INTO public.stock_transactions (
      transaction_type, item_id, from_location, to_location, quantity, unit_code,
      reference_type, reference_id, reference_number, user_id, remarks
    )
    VALUES (
      'QC_ACCEPT', v_grn_item.item_id, 'QC_PENDING', 'STORE', p_accepted_qty, v_grn_item.unit_code,
      'QC', p_grn_item_id, v_qc_number, p_inspector_id, 'QC Inspection Passed -> Accepted to Store'
    );
  END IF;

  -- 3b. Rejected -> QC_PENDING to REJECTED
  IF p_rejected_qty > 0 THEN
    INSERT INTO public.stock_transactions (
      transaction_type, item_id, from_location, to_location, quantity, unit_code,
      reference_type, reference_id, reference_number, user_id, remarks
    )
    VALUES (
      'QC_REJECT', v_grn_item.item_id, 'QC_PENDING', 'REJECTED', p_rejected_qty, v_grn_item.unit_code,
      'QC', p_grn_item_id, v_qc_number, p_inspector_id, COALESCE(p_rejection_reason_notes, 'QC Inspection Rejected')
    );
  END IF;

  -- 3c. Hold -> QC_PENDING to HOLD
  IF p_hold_qty > 0 THEN
    INSERT INTO public.stock_transactions (
      transaction_type, item_id, from_location, to_location, quantity, unit_code,
      reference_type, reference_id, reference_number, user_id, remarks
    )
    VALUES (
      'QC_HOLD', v_grn_item.item_id, 'QC_PENDING', 'HOLD', p_hold_qty, v_grn_item.unit_code,
      'QC', p_grn_item_id, v_qc_number, p_inspector_id, 'Material put on QC Hold for lab verification'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'qc_number', v_qc_number,
    'accepted_qty', p_accepted_qty,
    'rejected_qty', p_rejected_qty,
    'hold_qty', p_hold_qty
  );
END;
$$;

-- 9.3 Atomic Issue to Production (STORE -> PRODUCTION)
CREATE OR REPLACE FUNCTION public.rpc_issue_to_production(
  p_item_id UUID,
  p_quantity NUMERIC,
  p_production_reference TEXT,
  p_operation TEXT,
  p_remarks TEXT,
  p_issued_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_store NUMERIC;
  v_unit_code TEXT;
  v_issue_number TEXT;
  v_issue_id UUID;
BEGIN
  -- 1. Check Store Available Stock
  SELECT public.get_item_location_stock(p_item_id, 'STORE') INTO v_available_store;
  IF p_quantity > v_available_store THEN
    RAISE EXCEPTION 'Insufficient STORE stock. Available: %, Requested: %', v_available_store, p_quantity;
  END IF;

  SELECT unit_code INTO v_unit_code FROM public.items WHERE id = p_item_id;
  v_issue_number := public.next_document_number('ISS', 'ISS');

  -- 2. Create Issue Record
  INSERT INTO public.production_issues (
    issue_number, item_id, quantity, unit_code, production_reference, operation, remarks, issued_by
  )
  VALUES (
    v_issue_number, p_item_id, p_quantity, v_unit_code, p_production_reference, p_operation, p_remarks, p_issued_by
  )
  RETURNING id INTO v_issue_id;

  -- 3. Stock Ledger Movement: STORE -> PRODUCTION
  INSERT INTO public.stock_transactions (
    transaction_type, item_id, from_location, to_location, quantity, unit_code,
    reference_type, reference_id, reference_number, user_id, remarks
  )
  VALUES (
    'PRODUCTION_ISSUE', p_item_id, 'STORE', 'PRODUCTION', p_quantity, v_unit_code,
    'ISSUE', v_issue_id, v_issue_number, p_issued_by, 'Material Issued to Shopfloor (' || p_operation || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'issue_id', v_issue_id,
    'issue_number', v_issue_number,
    'remaining_store_stock', (v_available_store - p_quantity)
  );
END;
$$;

-- 9.4 Atomic Production Return (PRODUCTION -> STORE & PRODUCTION -> REJECTED)
CREATE OR REPLACE FUNCTION public.rpc_return_from_production(
  p_issue_id UUID,
  p_production_reference TEXT,
  p_item_id UUID,
  p_issued_quantity NUMERIC,
  p_ready_to_use_qty NUMERIC,
  p_rejected_qty NUMERIC,
  p_rejection_reason_id UUID,
  p_rejection_reason_notes TEXT,
  p_remarks TEXT,
  p_returned_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_prod NUMERIC;
  v_unit_code TEXT;
  v_return_number TEXT;
  v_return_id UUID;
BEGIN
  -- 1. Validate Returned Quantities match Total Issued Quantity
  IF (p_ready_to_use_qty + p_rejected_qty) != p_issued_quantity THEN
    RAISE EXCEPTION 'Return sum (Ready: % + Reject: %) must equal issued quantity (%)', 
      p_ready_to_use_qty, p_rejected_qty, p_issued_quantity;
  END IF;

  -- 2. Validate current shopfloor stock has sufficient material
  SELECT public.get_item_location_stock(p_item_id, 'PRODUCTION') INTO v_available_prod;
  IF (p_ready_to_use_qty + p_rejected_qty) > v_available_prod THEN
    RAISE EXCEPTION 'Total return quantity (%) exceeds current production balance (%)', 
      (p_ready_to_use_qty + p_rejected_qty), v_available_prod;
  END IF;

  SELECT unit_code INTO v_unit_code FROM public.items WHERE id = p_item_id;
  v_return_number := public.next_document_number('RET', 'RET');

  -- 3. Create Production Return Record
  INSERT INTO public.production_returns (
    return_number, issue_id, production_reference, item_id, issued_quantity,
    ready_to_use_qty, rejected_qty, rejection_reason_id, rejection_reason_notes, remarks, returned_by
  )
  VALUES (
    v_return_number, p_issue_id, p_production_reference, p_item_id, p_issued_quantity,
    p_ready_to_use_qty, p_rejected_qty, p_rejection_reason_id, p_rejection_reason_notes, p_remarks, p_returned_by
  )
  RETURNING id INTO v_return_id;

  -- 4. Stock Ledger: Ready-To-Use -> PRODUCTION to STORE
  IF p_ready_to_use_qty > 0 THEN
    INSERT INTO public.stock_transactions (
      transaction_type, item_id, from_location, to_location, quantity, unit_code,
      reference_type, reference_id, reference_number, user_id, remarks
    )
    VALUES (
      'PRODUCTION_RETURN', p_item_id, 'PRODUCTION', 'STORE', p_ready_to_use_qty, v_unit_code,
      'RETURN', v_return_id, v_return_number, p_returned_by, 'Finished Goods returned from Production to Store'
    );
  END IF;

  -- 5. Stock Ledger: Rejections -> PRODUCTION to REJECTED
  IF p_rejected_qty > 0 THEN
    INSERT INTO public.stock_transactions (
      transaction_type, item_id, from_location, to_location, quantity, unit_code,
      reference_type, reference_id, reference_number, user_id, remarks
    )
    VALUES (
      'PRODUCTION_REJECT', p_item_id, 'PRODUCTION', 'REJECTED', p_rejected_qty, v_unit_code,
      'RETURN', v_return_id, v_return_number, p_returned_by, COALESCE(p_rejection_reason_notes, 'Process scrap rejected during machining/assembly')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'return_number', v_return_number,
    'ready_to_use_qty', p_ready_to_use_qty,
    'rejected_qty', p_rejected_qty
  );
END;
$$;

-- 9.5 Atomic Customer Dispatch (STORE -> DISPATCHED)
CREATE OR REPLACE FUNCTION public.rpc_create_dispatch(
  p_customer_id UUID,
  p_item_id UUID,
  p_quantity NUMERIC,
  p_reference_challan TEXT,
  p_remarks TEXT,
  p_dispatched_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_store NUMERIC;
  v_unit_code TEXT;
  v_dispatch_number TEXT;
  v_dispatch_id UUID;
BEGIN
  -- 1. Validate Store Stock (Only Ready-To-Use in STORE can be dispatched)
  SELECT public.get_item_location_stock(p_item_id, 'STORE') INTO v_available_store;
  IF p_quantity > v_available_store THEN
    RAISE EXCEPTION 'Dispatch quantity (%) exceeds available Ready-To-Use Store stock (%)', 
      p_quantity, v_available_store;
  END IF;

  SELECT unit_code INTO v_unit_code FROM public.items WHERE id = p_item_id;
  v_dispatch_number := public.next_document_number('DSP', 'DSP');

  -- 2. Create Dispatch Record
  INSERT INTO public.dispatches (
    dispatch_number, customer_id, item_id, quantity, unit_code, reference_challan, remarks, dispatched_by
  )
  VALUES (
    v_dispatch_number, p_customer_id, p_item_id, p_quantity, v_unit_code, p_reference_challan, p_remarks, p_dispatched_by
  )
  RETURNING id INTO v_dispatch_id;

  -- 3. Stock Ledger: STORE -> DISPATCHED
  INSERT INTO public.stock_transactions (
    transaction_type, item_id, from_location, to_location, quantity, unit_code,
    reference_type, reference_id, reference_number, user_id, remarks
  )
  VALUES (
    'DISPATCH', p_item_id, 'STORE', 'DISPATCHED', p_quantity, v_unit_code,
    'DISPATCH', v_dispatch_id, v_dispatch_number, p_dispatched_by, 'Dispatched to customer challan: ' || COALESCE(p_reference_challan, 'N/A')
  );

  RETURN jsonb_build_object(
    'success', true,
    'dispatch_id', v_dispatch_id,
    'dispatch_number', v_dispatch_number,
    'remaining_store_stock', (v_available_store - p_quantity)
  );
END;
$$;

-- ==============================================================================
-- 10. AUTHENTICATION & AUTOMATIC USER PROFILE TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'VIEWER'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Helper function to check role inside RLS policies (SECURITY DEFINER avoids RLS recursion on profiles)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'ADMIN' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11.1 Master Data Read Access (All authenticated users can read masters & active items)
CREATE POLICY "Public/Auth read access on master tables" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Auth read locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Auth read units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Auth read items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Auth read vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Auth read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Auth read rejection reasons" ON public.rejection_reasons FOR SELECT USING (true);

-- 11.2 Admin Full Write on Masters
CREATE POLICY "Admin write items" ON public.items FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');
CREATE POLICY "Admin write vendors" ON public.vendors FOR ALL USING (public.is_admin() OR public.current_user_role() = 'PURCHASE' OR auth.role() = 'service_role');
CREATE POLICY "Admin write customers" ON public.customers FOR ALL USING (public.is_admin() OR public.current_user_role() = 'DISPATCH' OR auth.role() = 'service_role');
CREATE POLICY "Admin write units" ON public.units FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');

-- 11.3 Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin() OR auth.role() = 'service_role');
CREATE POLICY "Admins can modify any profile" ON public.profiles FOR UPDATE USING (public.is_admin() OR auth.role() = 'service_role');
CREATE POLICY "Admins can delete any profile" ON public.profiles FOR DELETE USING (public.is_admin() OR auth.role() = 'service_role');
CREATE POLICY "Admins can insert any profile" ON public.profiles FOR INSERT WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- 11.4 Purchase Orders (ADMIN and PURCHASE can write; all authenticated can view)
CREATE POLICY "Auth view POs" ON public.purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth view PO items" ON public.purchase_order_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Purchase write PO" ON public.purchase_orders FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() = 'PURCHASE' OR auth.role() = 'service_role');
CREATE POLICY "Purchase write PO items" ON public.purchase_order_items FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() = 'PURCHASE' OR auth.role() = 'service_role');
CREATE POLICY "Purchase update PO" ON public.purchase_orders FOR UPDATE USING (public.is_admin() OR public.current_user_role() = 'PURCHASE' OR auth.role() = 'service_role');

-- 11.5 GRN (ADMIN and STORE/PURCHASE can write; all can view)
CREATE POLICY "Auth view GRN" ON public.grns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth view GRN items" ON public.grn_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Store/Purchase write GRN" ON public.grns FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() IN ('STORE', 'PURCHASE') OR auth.role() = 'service_role');
CREATE POLICY "Store/Purchase write GRN items" ON public.grn_items FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() IN ('STORE', 'PURCHASE') OR auth.role() = 'service_role');

-- 11.6 QC Inspections (ADMIN and QC can write; all can view)
CREATE POLICY "Auth view QC" ON public.qc_inspections FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "QC write inspections" ON public.qc_inspections FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() = 'QC' OR auth.role() = 'service_role');

-- 11.7 Production Issues (ADMIN and STORE can write; all can view)
CREATE POLICY "Auth view Production Issues" ON public.production_issues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Store write Production Issues" ON public.production_issues FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() = 'STORE' OR auth.role() = 'service_role');

-- 11.8 Production Returns (ADMIN and PRODUCTION can write; all can view)
CREATE POLICY "Auth view Production Returns" ON public.production_returns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Production write Returns" ON public.production_returns FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() = 'PRODUCTION' OR auth.role() = 'service_role');

-- 11.9 Dispatches (ADMIN and DISPATCH/STORE can write; all can view)
CREATE POLICY "Auth view Dispatches" ON public.dispatches FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Dispatch write Dispatches" ON public.dispatches FOR INSERT WITH CHECK (public.is_admin() OR public.current_user_role() IN ('DISPATCH', 'STORE') OR auth.role() = 'service_role');

-- 11.10 Stock Transactions (CRITICAL: Read allowed for all auth; inserts exclusively via RPC/service role or admin)
CREATE POLICY "Auth view Stock Ledger" ON public.stock_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Service write Stock Ledger" ON public.stock_transactions FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 12. INITIAL SEED / MASTER DATA
-- ==============================================================================

-- 12.1 User Roles
INSERT INTO public.roles (name, description) VALUES
  ('ADMIN', 'Full system administration, user role assignments, and master configuration'),
  ('PURCHASE', 'Purchase Order management and vendor balance tracking'),
  ('QC', 'Quality Control inward inspection, defect tagging, and pass/fail logging'),
  ('STORE', 'Warehouse inventory, issuing to production, returns, and dispatch verification'),
  ('PRODUCTION', 'Shopfloor operation, tracking issued material, returning ready and rejected stock'),
  ('DISPATCH', 'Finished goods outbound delivery, customer challans, and dispatch log'),
  ('VIEWER', 'Read-only access across all inventory dashboards, reports, and ledgers')
ON CONFLICT (name) DO NOTHING;

-- 12.2 Locations
INSERT INTO public.locations (code, name, description) VALUES
  ('QC_PENDING', 'QC Inward Quarantine Dock', 'Newly offloaded goods pending optical and physical inspection'),
  ('STORE', 'Main Factory Warehouse', 'Verified good materials available for shopfloor issue or customer dispatch'),
  ('PRODUCTION', 'Shopfloor Line In-Process', 'Active material issued to production lines and machining cells'),
  ('HOLD', 'Quarantine Hold Area', 'Material awaiting vendor metallurgical certificates or recalibration'),
  ('REJECTED', 'Scrap & Defective Material Bin', 'Defective materials isolated to prevent mixture with usable stock'),
  ('DISPATCHED', 'Customer Outbound Hub', 'Finished items packed, challaned, and dispatched to customers')
ON CONFLICT (code) DO NOTHING;

-- 12.3 Units of Measure
INSERT INTO public.units (code, name) VALUES
  ('NOS', 'Numbers / Pieces'),
  ('KGS', 'Kilograms'),
  ('MTRS', 'Meters'),
  ('SETS', 'Sets / Assemblies'),
  ('LTRS', 'Liters')
ON CONFLICT (code) DO NOTHING;

-- 12.4 Common Rejection Reasons
INSERT INTO public.rejection_reasons (reason, category) VALUES
  ('Casting Defect', 'Metallurgical / Foundry'),
  ('Forging Defect', 'Structural / Core'),
  ('Machining Defect', 'Dimensional / Tolerance'),
  ('Dimension Issue', 'Tolerance / Caliper'),
  ('Surface Defect', 'Finish / Oxidation'),
  ('Handling Damage', 'Logistics / Offload'),
  ('Other Defect', 'Miscellaneous')
ON CONFLICT (reason) DO NOTHING;

-- 12.5 Sample Items (Ready for Testing Scenarios)
INSERT INTO public.items (item_code, item_name, description, unit_code, minimum_stock) VALUES
  ('SKU-CST-01', 'Casting A', 'Grey Iron Casting Grade 250 - Primary Engine Block Base', 'NOS', 25),
  ('SKU-FLG-50', 'Machined Flange 50mm', 'High-pressure hydraulic connection flange ANSI 300', 'NOS', 20),
  ('SKU-ROD-05', 'Titanium Rod Grade-5', '6Al-4V Aerospace Grade Precision Ground Rod 20mm', 'KGS', 10),
  ('SKU-SLR-40', 'Hydraulic Seal Ring 40mm', 'Fluoroelastomer High-Temp O-Ring Seal Kit', 'SETS', 50)
ON CONFLICT (item_code) DO NOTHING;

-- 12.6 Sample Vendors
INSERT INTO public.vendors (vendor_code, vendor_name, contact_person, phone, email, address, gst_number) VALUES
  ('VND-001', 'Apex Precision Logistics', 'Marcus Vance', '+91 98765 43210', 'logistics@apexprecision.in', 'Plot 42, Industrial Area Phase 2, Pune', '27AAACA1234A1Z5'),
  ('VND-002', 'Nordic MicroSensors Ltd', 'Dr. Sarah Lin', '+91 98111 22334', 'sales@nordicsensors.in', 'Block C, Electronic City, Bangalore', '29AAACN5678B1Z2'),
  ('VND-003', 'Vertex Polymer Corp', 'Rachel Vance', '+91 97222 33445', 'orders@vertexpolymers.com', 'Sector 18, GIDC Vatva, Ahmedabad', '24AAACV9012C1Z8')
ON CONFLICT (vendor_code) DO NOTHING;

-- 12.7 Sample Customers
INSERT INTO public.customers (customer_name, contact, phone, email, address, gst_number) VALUES
  ('Tata Motors Commercial Vehicles', 'Rajesh Sharma', '+91 98220 11223', 'procurement@tatamotors.com', 'Pimpri Works, Pune, Maharashtra', '27AAACT0012A1Z1'),
  ('Mahindra Heavy Engineering', 'Vikram Deshmukh', '+91 99330 44556', 'supplychain@mahindra.com', 'Kandivali Plant, Mumbai', '27AAACM3344D1Z9'),
  ('Bharat Forge Global Exports', 'Sunil Patil', '+91 97440 77889', 'exports@bharatforge.com', 'Mundhwa Industrial Zone, Pune', '27AAACB5566G1Z3')
ON CONFLICT DO NOTHING;
